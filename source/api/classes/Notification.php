<?php
/**
 * Notification System for Gusto Chef
 */

namespace GustoChef;

use Exception;

class Notification {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
        $this->initTable();
    }

    private function initTable(): void {
        $this->db->getConnection()->exec("
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                data TEXT,
                is_read INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ");

        $this->db->getConnection()->exec("
            CREATE TABLE IF NOT EXISTS push_subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                endpoint TEXT NOT NULL,
                p256dh TEXT,
                auth TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ");
    }

    public function create(int $userId, string $type, string $title, string $message, array $data = []): array {
        $this->db->execute(
            "INSERT INTO notifications (user_id, type, title, message, data)
             VALUES (?, ?, ?, ?, ?)",
            [$userId, $type, $title, $message, json_encode($data)]
        );

        $notification = $this->getById($this->db->lastInsertId());

        // Try to send push notification
        $this->sendPush($userId, $title, $message, $data);

        return $notification;
    }

    public function getById(int $id): ?array {
        $notifications = $this->db->query(
            "SELECT * FROM notifications WHERE id = ?",
            [$id]
        );

        if (empty($notifications)) return null;

        $n = $notifications[0];
        $n['data'] = json_decode($n['data'], true);
        return $n;
    }

    public function getForUser(int $userId, int $limit = 20, bool $unreadOnly = false): array {
        $sql = "SELECT * FROM notifications WHERE user_id = ?";
        if ($unreadOnly) {
            $sql .= " AND is_read = 0";
        }
        $sql .= " ORDER BY created_at DESC LIMIT ?";

        $notifications = $this->db->query($sql, [$userId, $limit]);

        foreach ($notifications as &$n) {
            $n['data'] = json_decode($n['data'], true);
        }

        return $notifications;
    }

    public function getUnreadCount(int $userId): int {
        $result = $this->db->query(
            "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0",
            [$userId]
        );
        return (int)($result[0]['count'] ?? 0);
    }

    public function markAsRead(int $notificationId, int $userId): bool {
        return $this->db->execute(
            "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
            [$notificationId, $userId]
        );
    }

    public function markAllAsRead(int $userId): bool {
        return $this->db->execute(
            "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
            [$userId]
        );
    }

    public function subscribePush(int $userId, array $subscription): bool {
        // Remove old subscription for this endpoint
        $this->db->execute(
            "DELETE FROM push_subscriptions WHERE endpoint = ?",
            [$subscription['endpoint']]
        );

        return $this->db->execute(
            "INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
             VALUES (?, ?, ?, ?)",
            [
                $userId,
                $subscription['endpoint'],
                $subscription['keys']['p256dh'] ?? '',
                $subscription['keys']['auth'] ?? ''
            ]
        );
    }

    public function unsubscribePush(int $userId, string $endpoint): bool {
        return $this->db->execute(
            "DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?",
            [$userId, $endpoint]
        );
    }

    private function sendPush(int $userId, string $title, string $body, array $data = []): void {
        $subscriptions = $this->db->query(
            "SELECT * FROM push_subscriptions WHERE user_id = ?",
            [$userId]
        );

        foreach ($subscriptions as $sub) {
            // In production, use web-push library
            // This is a placeholder for the push notification logic
            $this->sendWebPush($sub, [
                'title' => $title,
                'body' => $body,
                'data' => $data
            ]);
        }
    }

    private function sendWebPush(array $subscription, array $payload): bool {
        // Placeholder - implement with web-push library in production
        // composer require minishlink/web-push
        return true;
    }

    // Helper methods to send specific notification types
    public function notifyNewBookingRequest(int $chefUserId, array $booking): array {
        return $this->create(
            $chefUserId,
            'booking_request',
            'Neue Buchungsanfrage',
            "Du hast eine neue Buchungsanfrage für den {$booking['booking_date']}",
            ['booking_id' => $booking['id']]
        );
    }

    public function notifyBookingConfirmed(int $customerId, array $booking): array {
        return $this->create(
            $customerId,
            'booking_confirmed',
            'Buchung bestätigt!',
            "Deine Buchung für den {$booking['booking_date']} wurde bestätigt",
            ['booking_id' => $booking['id']]
        );
    }

    public function notifyBookingCancelled(int $userId, array $booking, string $reason = ''): array {
        return $this->create(
            $userId,
            'booking_cancelled',
            'Buchung storniert',
            "Die Buchung für den {$booking['booking_date']} wurde storniert" . ($reason ? ": $reason" : ''),
            ['booking_id' => $booking['id']]
        );
    }

    public function notifyNewMessage(int $userId, int $senderId, string $senderName): array {
        return $this->create(
            $userId,
            'new_message',
            'Neue Nachricht',
            "Du hast eine neue Nachricht von $senderName",
            ['sender_id' => $senderId]
        );
    }

    public function notifyNewReview(int $chefUserId, array $review): array {
        return $this->create(
            $chefUserId,
            'new_review',
            'Neue Bewertung',
            "Du hast eine neue {$review['rating']}-Sterne Bewertung erhalten!",
            ['review_id' => $review['id']]
        );
    }

    public function notifyPaymentReceived(int $chefUserId, int $amount): array {
        $formatted = number_format($amount / 100, 2, ',', '.') . ' €';
        return $this->create(
            $chefUserId,
            'payment_received',
            'Zahlung eingegangen',
            "Du hast eine Zahlung über $formatted erhalten",
            ['amount' => $amount]
        );
    }
}
