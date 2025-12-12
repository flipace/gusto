<?php
/**
 * Messaging System for Gusto Chef
 */

namespace GustoChef;

use Exception;

class Message {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    public function send(int $senderId, int $receiverId, string $message, ?int $bookingId = null): array {
        if (empty(trim($message))) {
            throw new Exception('Message cannot be empty');
        }

        $this->db->execute(
            "INSERT INTO messages (sender_id, receiver_id, booking_id, message)
             VALUES (?, ?, ?, ?)",
            [$senderId, $receiverId, $bookingId, trim($message)]
        );

        return $this->getById($this->db->lastInsertId());
    }

    public function getById(int $id): ?array {
        $messages = $this->db->query(
            "SELECT m.*,
                    s.first_name as sender_name, s.avatar_url as sender_avatar,
                    r.first_name as receiver_name
             FROM messages m
             JOIN users s ON s.id = m.sender_id
             JOIN users r ON r.id = m.receiver_id
             WHERE m.id = ?",
            [$id]
        );
        return $messages[0] ?? null;
    }

    public function getConversation(int $userId, int $otherUserId, int $limit = 50): array {
        $messages = $this->db->query(
            "SELECT m.*,
                    s.first_name as sender_name, s.avatar_url as sender_avatar
             FROM messages m
             JOIN users s ON s.id = m.sender_id
             WHERE (m.sender_id = ? AND m.receiver_id = ?)
                OR (m.sender_id = ? AND m.receiver_id = ?)
             ORDER BY m.created_at DESC
             LIMIT ?",
            [$userId, $otherUserId, $otherUserId, $userId, $limit]
        );

        // Mark as read
        $this->db->execute(
            "UPDATE messages SET is_read = 1
             WHERE receiver_id = ? AND sender_id = ? AND is_read = 0",
            [$userId, $otherUserId]
        );

        return array_reverse($messages);
    }

    public function getConversations(int $userId): array {
        return $this->db->query(
            "SELECT
                CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END as other_user_id,
                u.first_name, u.last_name, u.avatar_url,
                m.message as last_message,
                m.created_at as last_message_at,
                (SELECT COUNT(*) FROM messages WHERE receiver_id = ? AND sender_id = u.id AND is_read = 0) as unread_count
             FROM messages m
             JOIN users u ON u.id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
             WHERE m.sender_id = ? OR m.receiver_id = ?
             GROUP BY other_user_id
             ORDER BY m.created_at DESC",
            [$userId, $userId, $userId, $userId, $userId]
        );
    }

    public function getUnreadCount(int $userId): int {
        $result = $this->db->query(
            "SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0",
            [$userId]
        );
        return (int)($result[0]['count'] ?? 0);
    }

    public function markAsRead(int $messageId, int $userId): bool {
        return $this->db->execute(
            "UPDATE messages SET is_read = 1 WHERE id = ? AND receiver_id = ?",
            [$messageId, $userId]
        );
    }

    public function getBookingMessages(int $bookingId, int $userId): array {
        // Verify user has access to this booking
        $booking = $this->db->query(
            "SELECT b.*, cp.user_id as chef_user_id
             FROM bookings b
             JOIN chef_profiles cp ON cp.id = b.chef_id
             WHERE b.id = ?",
            [$bookingId]
        );

        if (empty($booking)) {
            throw new Exception('Booking not found');
        }

        $b = $booking[0];
        if ($b['customer_id'] != $userId && $b['chef_user_id'] != $userId) {
            throw new Exception('Not authorized');
        }

        return $this->db->query(
            "SELECT m.*, s.first_name as sender_name, s.avatar_url as sender_avatar
             FROM messages m
             JOIN users s ON s.id = m.sender_id
             WHERE m.booking_id = ?
             ORDER BY m.created_at ASC",
            [$bookingId]
        );
    }
}
