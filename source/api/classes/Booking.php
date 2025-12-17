<?php
/**
 * Booking Management for Gusto Chef
 */

namespace GustoChef;

use Exception;

class Booking {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    public function create(int $customerId, array $data): array {
        $chefId = (int)($data['chef_id'] ?? 0);
        $bookingDate = $data['booking_date'] ?? '';
        $startTime = $data['start_time'] ?? '';
        $durationHours = (int)($data['duration_hours'] ?? 2);
        $guestCount = (int)($data['guest_count'] ?? 2);
        $locationAddress = $data['location_address'] ?? '';

        // Validate chef exists
        $chef = (new Chef())->getProfileById($chefId);
        if (!$chef) {
            throw new Exception('Chef not found');
        }

        // Validate minimum hours
        if ($durationHours < $chef['min_hours']) {
            throw new Exception("Minimum booking is {$chef['min_hours']} hours");
        }

        // Validate guest count
        if ($guestCount > $chef['max_guests']) {
            throw new Exception("Maximum guests is {$chef['max_guests']}");
        }

        // Check availability
        if (!$this->isAvailable($chefId, $bookingDate, $startTime, $durationHours)) {
            throw new Exception('Chef is not available at this time');
        }

        // Get customer subscription for service fee calculation
        $subscription = $this->getCustomerSubscription($customerId);
        $serviceFeePercent = $subscription ? SUBSCRIPTION_TIERS[$subscription['tier']]['service_fee_percent'] : 15;

        // Check booking limits
        if ($subscription && SUBSCRIPTION_TIERS[$subscription['tier']]['bookings_per_month'] !== -1) {
            $bookingsThisMonth = $subscription['bookings_used_this_month'];
            $limit = SUBSCRIPTION_TIERS[$subscription['tier']]['bookings_per_month'];

            if ($bookingsThisMonth >= $limit) {
                throw new Exception("Monthly booking limit reached. Upgrade your plan for more bookings!");
            }
        }

        // Calculate pricing
        $chefRate = $chef['hourly_rate'];
        $subtotal = $chefRate * $durationHours;
        $serviceFee = (int)($subtotal * ($serviceFeePercent / 100));
        $platformCommission = (int)($subtotal * (PLATFORM_COMMISSION_PERCENT / 100));
        $totalAmount = $subtotal + $serviceFee;
        $chefPayout = $subtotal - $platformCommission;

        $this->db->execute(
            "INSERT INTO bookings (
                customer_id, chef_id, booking_date, start_time, duration_hours,
                guest_count, location_address, location_lat, location_lng,
                special_requests, menu_preferences, dietary_restrictions,
                chef_rate, subtotal, service_fee, platform_commission,
                total_amount, chef_payout, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')",
            [
                $customerId,
                $chefId,
                $bookingDate,
                $startTime,
                $durationHours,
                $guestCount,
                $locationAddress,
                $data['location_lat'] ?? null,
                $data['location_lng'] ?? null,
                $data['special_requests'] ?? '',
                json_encode($data['menu_preferences'] ?? []),
                json_encode($data['dietary_restrictions'] ?? []),
                $chefRate,
                $subtotal,
                $serviceFee,
                $platformCommission,
                $totalAmount,
                $chefPayout
            ]
        );

        $bookingId = $this->db->lastInsertId();

        return $this->getById($bookingId);
    }

    public function getById(int $bookingId): ?array {
        $bookings = $this->db->query(
            "SELECT b.*,
                    u.first_name as customer_first_name, u.last_name as customer_last_name,
                    u.phone as customer_phone,
                    chef_user.first_name as chef_first_name, chef_user.last_name as chef_last_name,
                    chef_user.avatar_url as chef_avatar
             FROM bookings b
             JOIN users u ON u.id = b.customer_id
             JOIN chef_profiles cp ON cp.id = b.chef_id
             JOIN users chef_user ON chef_user.id = cp.user_id
             WHERE b.id = ?",
            [$bookingId]
        );

        if (empty($bookings)) {
            return null;
        }

        $booking = $bookings[0];
        $booking['menu_preferences'] = json_decode($booking['menu_preferences'] ?? '[]', true);
        $booking['dietary_restrictions'] = json_decode($booking['dietary_restrictions'] ?? '[]', true);

        return $booking;
    }

    public function getCustomerBookings(int $customerId, string $status = null): array {
        $sql = "SELECT b.*,
                       chef_user.first_name as chef_first_name, chef_user.last_name as chef_last_name,
                       chef_user.avatar_url as chef_avatar, cp.rating_avg as chef_rating
                FROM bookings b
                JOIN chef_profiles cp ON cp.id = b.chef_id
                JOIN users chef_user ON chef_user.id = cp.user_id
                WHERE b.customer_id = ?";

        $params = [$customerId];

        if ($status) {
            $sql .= " AND b.status = ?";
            $params[] = $status;
        }

        $sql .= " ORDER BY b.booking_date DESC, b.start_time DESC";

        $bookings = $this->db->query($sql, $params);

        foreach ($bookings as &$booking) {
            $booking['menu_preferences'] = json_decode($booking['menu_preferences'] ?? '[]', true);
            $booking['dietary_restrictions'] = json_decode($booking['dietary_restrictions'] ?? '[]', true);
        }

        return $bookings;
    }

    public function getChefBookings(int $chefProfileId, string $status = null): array {
        $sql = "SELECT b.*,
                       u.first_name as customer_first_name, u.last_name as customer_last_name,
                       u.phone as customer_phone, u.avatar_url as customer_avatar
                FROM bookings b
                JOIN users u ON u.id = b.customer_id
                WHERE b.chef_id = ?";

        $params = [$chefProfileId];

        if ($status) {
            $sql .= " AND b.status = ?";
            $params[] = $status;
        }

        $sql .= " ORDER BY b.booking_date ASC, b.start_time ASC";

        $bookings = $this->db->query($sql, $params);

        foreach ($bookings as &$booking) {
            $booking['menu_preferences'] = json_decode($booking['menu_preferences'] ?? '[]', true);
            $booking['dietary_restrictions'] = json_decode($booking['dietary_restrictions'] ?? '[]', true);
        }

        return $bookings;
    }

    public function updateStatus(int $bookingId, string $status, int $userId): array {
        $booking = $this->getById($bookingId);

        if (!$booking) {
            throw new Exception('Booking not found');
        }

        $validTransitions = [
            'pending' => ['confirmed', 'cancelled'],
            'confirmed' => ['in_progress', 'cancelled'],
            'in_progress' => ['completed'],
            'completed' => [],
            'cancelled' => []
        ];

        if (!in_array($status, $validTransitions[$booking['status']] ?? [])) {
            throw new Exception('Invalid status transition');
        }

        $updates = ["status = ?"];
        $params = [$status];

        if ($status === 'cancelled') {
            $updates[] = "cancelled_at = CURRENT_TIMESTAMP";
        }

        $params[] = $bookingId;

        $this->db->execute(
            "UPDATE bookings SET " . implode(', ', $updates) . " WHERE id = ?",
            $params
        );

        // Update chef stats on completion
        if ($status === 'completed') {
            $this->db->execute(
                "UPDATE chef_profiles SET total_bookings = total_bookings + 1 WHERE id = ?",
                [$booking['chef_id']]
            );

            // Update subscription usage
            $subscription = $this->getCustomerSubscription($booking['customer_id']);
            if ($subscription) {
                $this->db->execute(
                    "UPDATE subscriptions SET bookings_used_this_month = bookings_used_this_month + 1 WHERE id = ?",
                    [$subscription['id']]
                );
            }
        }

        return $this->getById($bookingId);
    }

    public function addReview(int $bookingId, int $customerId, array $data): array {
        $booking = $this->getById($bookingId);

        if (!$booking) {
            throw new Exception('Booking not found');
        }

        if ($booking['customer_id'] != $customerId) {
            throw new Exception('Not authorized to review this booking');
        }

        if ($booking['status'] !== 'completed') {
            throw new Exception('Can only review completed bookings');
        }

        // Check if already reviewed
        $existing = $this->db->query(
            "SELECT id FROM reviews WHERE booking_id = ?",
            [$bookingId]
        );

        if (!empty($existing)) {
            throw new Exception('Booking already reviewed');
        }

        $rating = max(1, min(5, (int)$data['rating']));
        $foodRating = isset($data['food_rating']) ? max(1, min(5, (int)$data['food_rating'])) : null;
        $serviceRating = isset($data['service_rating']) ? max(1, min(5, (int)$data['service_rating'])) : null;
        $cleanlinessRating = isset($data['cleanliness_rating']) ? max(1, min(5, (int)$data['cleanliness_rating'])) : null;

        $this->db->execute(
            "INSERT INTO reviews (booking_id, customer_id, chef_id, rating, food_rating, service_rating, cleanliness_rating, review_text)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [
                $bookingId,
                $customerId,
                $booking['chef_id'],
                $rating,
                $foodRating,
                $serviceRating,
                $cleanlinessRating,
                $data['review_text'] ?? ''
            ]
        );

        // Update chef rating
        $this->updateChefRating($booking['chef_id']);

        return $this->getById($bookingId);
    }

    private function updateChefRating(int $chefId): void {
        $stats = $this->db->query(
            "SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE chef_id = ?",
            [$chefId]
        );

        if (!empty($stats)) {
            $this->db->execute(
                "UPDATE chef_profiles SET rating_avg = ?, rating_count = ? WHERE id = ?",
                [$stats[0]['avg_rating'], $stats[0]['count'], $chefId]
            );
        }
    }

    public function isAvailable(int $chefId, string $date, string $startTime, int $duration): bool {
        // Check for conflicting bookings
        $endTime = date('H:i', strtotime($startTime) + ($duration * 3600));

        $conflicts = $this->db->query(
            "SELECT id FROM bookings
             WHERE chef_id = ?
               AND booking_date = ?
               AND status NOT IN ('cancelled')
               AND (
                   (start_time <= ? AND TIME(start_time, '+' || duration_hours || ' hours') > ?) OR
                   (start_time < ? AND TIME(start_time, '+' || duration_hours || ' hours') >= ?)
               )",
            [$chefId, $date, $startTime, $startTime, $endTime, $endTime]
        );

        return empty($conflicts);
    }

    private function getCustomerSubscription(int $customerId): ?array {
        $subs = $this->db->query(
            "SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1",
            [$customerId]
        );
        return $subs[0] ?? null;
    }

    public function getUpcomingBookings(int $userId, string $userType): array {
        if ($userType === 'chef') {
            $profile = (new Chef())->getProfile($userId);
            if (!$profile) return [];

            return $this->db->query(
                "SELECT b.*, u.first_name as customer_first_name, u.last_name as customer_last_name
                 FROM bookings b
                 JOIN users u ON u.id = b.customer_id
                 WHERE b.chef_id = ? AND b.status IN ('confirmed', 'pending') AND b.booking_date >= DATE('now')
                 ORDER BY b.booking_date ASC, b.start_time ASC
                 LIMIT 10",
                [$profile['id']]
            );
        }

        return $this->db->query(
            "SELECT b.*, chef_user.first_name as chef_first_name, chef_user.last_name as chef_last_name
             FROM bookings b
             JOIN chef_profiles cp ON cp.id = b.chef_id
             JOIN users chef_user ON chef_user.id = cp.user_id
             WHERE b.customer_id = ? AND b.status IN ('confirmed', 'pending') AND b.booking_date >= DATE('now')
             ORDER BY b.booking_date ASC, b.start_time ASC
             LIMIT 10",
            [$userId]
        );
    }
}
