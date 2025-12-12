<?php
/**
 * Chef Profile Management for Gusto Chef
 */

namespace GustoChef;

use Exception;

class Chef {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    public function getProfile(int $userId): ?array {
        $profiles = $this->db->query(
            "SELECT cp.*, u.first_name, u.last_name, u.email, u.phone, u.avatar_url
             FROM chef_profiles cp
             JOIN users u ON u.id = cp.user_id
             WHERE cp.user_id = ?",
            [$userId]
        );

        if (empty($profiles)) {
            return null;
        }

        $profile = $profiles[0];
        $profile['specialties'] = json_decode($profile['specialties'] ?? '[]', true);
        $profile['cuisines'] = json_decode($profile['cuisines'] ?? '[]', true);
        $profile['gallery'] = $this->getGallery($profile['id']);

        return $profile;
    }

    public function getProfileById(int $chefId): ?array {
        $profiles = $this->db->query(
            "SELECT cp.*, u.first_name, u.last_name, u.avatar_url
             FROM chef_profiles cp
             JOIN users u ON u.id = cp.user_id
             WHERE cp.id = ? AND cp.is_active = 1",
            [$chefId]
        );

        if (empty($profiles)) {
            return null;
        }

        $profile = $profiles[0];
        $profile['specialties'] = json_decode($profile['specialties'] ?? '[]', true);
        $profile['cuisines'] = json_decode($profile['cuisines'] ?? '[]', true);
        $profile['gallery'] = $this->getGallery($profile['id']);
        $profile['reviews'] = $this->getReviews($chefId, 5);

        // Hide sensitive data
        unset($profile['stripe_account_id']);

        return $profile;
    }

    public function updateProfile(int $userId, array $data): array {
        $profile = $this->getProfile($userId);

        if (!$profile) {
            throw new Exception('Chef profile not found');
        }

        $allowedFields = [
            'bio', 'hourly_rate', 'min_hours', 'max_guests',
            'travel_radius_km', 'location_lat', 'location_lng', 'location_city'
        ];

        $updates = [];
        $params = [];

        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updates[] = "$field = ?";
                $params[] = $data[$field];
            }
        }

        // Handle JSON fields
        if (isset($data['specialties'])) {
            $updates[] = "specialties = ?";
            $params[] = json_encode($data['specialties']);
        }

        if (isset($data['cuisines'])) {
            $updates[] = "cuisines = ?";
            $params[] = json_encode($data['cuisines']);
        }

        if (empty($updates)) {
            return $this->getProfile($userId);
        }

        $params[] = $userId;

        $this->db->execute(
            "UPDATE chef_profiles SET " . implode(', ', $updates) . " WHERE user_id = ?",
            $params
        );

        return $this->getProfile($userId);
    }

    public function search(array $filters = []): array {
        $sql = "SELECT cp.*, u.first_name, u.last_name, u.avatar_url
                FROM chef_profiles cp
                JOIN users u ON u.id = cp.user_id
                WHERE cp.is_active = 1";

        $params = [];

        // Filter by cuisine
        if (!empty($filters['cuisine'])) {
            $sql .= " AND cp.cuisines LIKE ?";
            $params[] = '%"' . $filters['cuisine'] . '"%';
        }

        // Filter by max price
        if (!empty($filters['max_price'])) {
            $sql .= " AND cp.hourly_rate <= ?";
            $params[] = (int)$filters['max_price'];
        }

        // Filter by min rating
        if (!empty($filters['min_rating'])) {
            $sql .= " AND cp.rating_avg >= ?";
            $params[] = (float)$filters['min_rating'];
        }

        // Filter by guest count
        if (!empty($filters['guests'])) {
            $sql .= " AND cp.max_guests >= ?";
            $params[] = (int)$filters['guests'];
        }

        // Location-based search (simple distance calculation)
        if (!empty($filters['lat']) && !empty($filters['lng'])) {
            $lat = (float)$filters['lat'];
            $lng = (float)$filters['lng'];
            $radius = (float)($filters['radius'] ?? 25);

            // Haversine formula approximation
            $sql .= " AND (
                6371 * acos(
                    cos(radians(?)) * cos(radians(cp.location_lat)) *
                    cos(radians(cp.location_lng) - radians(?)) +
                    sin(radians(?)) * sin(radians(cp.location_lat))
                )
            ) <= cp.travel_radius_km";
            $params[] = $lat;
            $params[] = $lng;
            $params[] = $lat;
        }

        // Sorting - Premium listings first, then by rating
        $sql .= " ORDER BY cp.is_premium_listing DESC, cp.rating_avg DESC, cp.total_bookings DESC";

        // Pagination
        $limit = min((int)($filters['limit'] ?? 20), 50);
        $offset = (int)($filters['offset'] ?? 0);
        $sql .= " LIMIT ? OFFSET ?";
        $params[] = $limit;
        $params[] = $offset;

        $chefs = $this->db->query($sql, $params);

        foreach ($chefs as &$chef) {
            $chef['specialties'] = json_decode($chef['specialties'] ?? '[]', true);
            $chef['cuisines'] = json_decode($chef['cuisines'] ?? '[]', true);
            $chef['hourly_rate_formatted'] = number_format($chef['hourly_rate'] / 100, 2) . ' €';
            unset($chef['stripe_account_id']);
        }

        return $chefs;
    }

    public function getGallery(int $chefId): array {
        return $this->db->query(
            "SELECT * FROM chef_gallery WHERE chef_id = ? ORDER BY is_featured DESC, sort_order ASC",
            [$chefId]
        );
    }

    public function addGalleryImage(int $userId, array $data): array {
        $profile = $this->getProfile($userId);

        if (!$profile) {
            throw new Exception('Chef profile not found');
        }

        $this->db->execute(
            "INSERT INTO chef_gallery (chef_id, image_url, caption, dish_name, is_featured)
             VALUES (?, ?, ?, ?, ?)",
            [
                $profile['id'],
                $data['image_url'],
                $data['caption'] ?? '',
                $data['dish_name'] ?? '',
                $data['is_featured'] ?? 0
            ]
        );

        return $this->getGallery($profile['id']);
    }

    public function getAvailability(int $chefId, ?string $date = null): array {
        if ($date) {
            // Get availability for specific date
            $dayOfWeek = date('w', strtotime($date));

            return $this->db->query(
                "SELECT * FROM chef_availability
                 WHERE chef_id = ? AND (
                     (specific_date = ? AND is_available = 1) OR
                     (day_of_week = ? AND specific_date IS NULL AND is_available = 1)
                 )
                 ORDER BY start_time",
                [$chefId, $date, $dayOfWeek]
            );
        }

        // Get weekly availability
        return $this->db->query(
            "SELECT * FROM chef_availability
             WHERE chef_id = ? AND specific_date IS NULL
             ORDER BY day_of_week, start_time",
            [$chefId]
        );
    }

    public function setAvailability(int $userId, array $slots): bool {
        $profile = $this->getProfile($userId);

        if (!$profile) {
            throw new Exception('Chef profile not found');
        }

        // Clear existing weekly availability
        $this->db->execute(
            "DELETE FROM chef_availability WHERE chef_id = ? AND specific_date IS NULL",
            [$profile['id']]
        );

        foreach ($slots as $slot) {
            $this->db->execute(
                "INSERT INTO chef_availability (chef_id, day_of_week, start_time, end_time, is_available)
                 VALUES (?, ?, ?, ?, ?)",
                [
                    $profile['id'],
                    $slot['day_of_week'],
                    $slot['start_time'],
                    $slot['end_time'],
                    $slot['is_available'] ?? 1
                ]
            );
        }

        return true;
    }

    public function getReviews(int $chefId, int $limit = 10): array {
        return $this->db->query(
            "SELECT r.*, u.first_name, u.avatar_url
             FROM reviews r
             JOIN users u ON u.id = r.customer_id
             WHERE r.chef_id = ? AND r.is_public = 1
             ORDER BY r.created_at DESC
             LIMIT ?",
            [$chefId, $limit]
        );
    }

    public function getEarnings(int $userId, string $period = 'month'): array {
        $profile = $this->getProfile($userId);

        if (!$profile) {
            throw new Exception('Chef profile not found');
        }

        $dateCondition = match($period) {
            'week' => "DATE(paid_at) >= DATE('now', '-7 days')",
            'month' => "DATE(paid_at) >= DATE('now', '-30 days')",
            'year' => "DATE(paid_at) >= DATE('now', '-365 days')",
            default => "1=1"
        };

        $stats = $this->db->query(
            "SELECT
                COUNT(*) as total_bookings,
                SUM(chef_payout) as total_earnings,
                AVG(chef_payout) as avg_per_booking
             FROM bookings
             WHERE chef_id = ? AND status = 'completed' AND $dateCondition",
            [$profile['id']]
        );

        $recentBookings = $this->db->query(
            "SELECT b.*, u.first_name as customer_name
             FROM bookings b
             JOIN users u ON u.id = b.customer_id
             WHERE b.chef_id = ? AND b.status = 'completed'
             ORDER BY b.paid_at DESC
             LIMIT 10",
            [$profile['id']]
        );

        return [
            'period' => $period,
            'stats' => $stats[0] ?? [],
            'recent_bookings' => $recentBookings
        ];
    }

    public function toggleFavorite(int $userId, int $chefId): bool {
        $existing = $this->db->query(
            "SELECT id FROM favorites WHERE user_id = ? AND chef_id = ?",
            [$userId, $chefId]
        );

        if (!empty($existing)) {
            $this->db->execute(
                "DELETE FROM favorites WHERE user_id = ? AND chef_id = ?",
                [$userId, $chefId]
            );
            return false; // Removed from favorites
        }

        $this->db->execute(
            "INSERT INTO favorites (user_id, chef_id) VALUES (?, ?)",
            [$userId, $chefId]
        );
        return true; // Added to favorites
    }

    public function getFavorites(int $userId): array {
        return $this->db->query(
            "SELECT cp.*, u.first_name, u.last_name, u.avatar_url
             FROM favorites f
             JOIN chef_profiles cp ON cp.id = f.chef_id
             JOIN users u ON u.id = cp.user_id
             WHERE f.user_id = ?
             ORDER BY f.created_at DESC",
            [$userId]
        );
    }
}
