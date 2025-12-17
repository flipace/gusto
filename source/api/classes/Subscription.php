<?php
/**
 * Subscription Management for Gusto Chef
 * Handles Stripe integration for customer subscriptions
 */

namespace GustoChef;

use Exception;

class Subscription {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    public function getCurrentSubscription(int $userId): ?array {
        $subs = $this->db->query(
            "SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1",
            [$userId]
        );

        if (empty($subs)) {
            return null;
        }

        $sub = $subs[0];
        $tierInfo = SUBSCRIPTION_TIERS[$sub['tier']] ?? null;

        return [
            'id' => $sub['id'],
            'tier' => $sub['tier'],
            'tier_info' => $tierInfo,
            'status' => $sub['status'],
            'current_period_start' => $sub['current_period_start'],
            'current_period_end' => $sub['current_period_end'],
            'bookings_used' => $sub['bookings_used_this_month'],
            'bookings_limit' => $tierInfo['bookings_per_month'] ?? 0,
            'bookings_remaining' => $tierInfo['bookings_per_month'] === -1
                ? 'unlimited'
                : max(0, ($tierInfo['bookings_per_month'] ?? 0) - $sub['bookings_used_this_month'])
        ];
    }

    public function getAvailablePlans(): array {
        $plans = [];

        foreach (SUBSCRIPTION_TIERS as $key => $tier) {
            $plans[] = [
                'id' => $key,
                'name' => $tier['name'],
                'price' => $tier['price'],
                'price_formatted' => number_format($tier['price'] / 100, 2) . ' €/month',
                'bookings_per_month' => $tier['bookings_per_month'] === -1 ? 'Unlimited' : $tier['bookings_per_month'],
                'service_fee_percent' => $tier['service_fee_percent'],
                'features' => $this->getPlanFeatures($key)
            ];
        }

        return $plans;
    }

    private function getPlanFeatures(string $tier): array {
        return match($tier) {
            'basic' => [
                '1 chef booking per month',
                '10% service fee',
                'Access to all chefs',
                'In-app messaging',
                'Basic support'
            ],
            'plus' => [
                '4 chef bookings per month',
                'Only 5% service fee',
                'Priority booking',
                'In-app messaging',
                'Priority support',
                'Booking history & favorites'
            ],
            'premium' => [
                'Unlimited bookings',
                'No service fees!',
                'Priority booking',
                'Exclusive premium chefs',
                '24/7 VIP support',
                'Free cancellation',
                'Exclusive events access'
            ],
            default => []
        };
    }

    public function createCheckoutSession(int $userId, string $tier): array {
        if (!isset(SUBSCRIPTION_TIERS[$tier])) {
            throw new Exception('Invalid subscription tier');
        }

        $tierInfo = SUBSCRIPTION_TIERS[$tier];

        // In production, you would use Stripe SDK here
        // This is a simplified version for demo

        $sessionId = 'cs_' . bin2hex(random_bytes(16));

        // Store pending subscription
        $this->db->execute(
            "INSERT INTO subscriptions (user_id, tier, status, stripe_subscription_id)
             VALUES (?, ?, 'pending', ?)",
            [$userId, $tier, $sessionId]
        );

        return [
            'session_id' => $sessionId,
            'url' => APP_URL . "/checkout?session_id=$sessionId",
            'tier' => $tier,
            'amount' => $tierInfo['price']
        ];
    }

    public function activateSubscription(string $sessionId): array {
        $subs = $this->db->query(
            "SELECT * FROM subscriptions WHERE stripe_subscription_id = ? AND status = 'pending'",
            [$sessionId]
        );

        if (empty($subs)) {
            throw new Exception('Subscription not found');
        }

        $sub = $subs[0];

        // Cancel any existing active subscriptions for this user
        $this->db->execute(
            "UPDATE subscriptions SET status = 'cancelled' WHERE user_id = ? AND status = 'active'",
            [$sub['user_id']]
        );

        // Activate new subscription
        $periodStart = date('Y-m-d H:i:s');
        $periodEnd = date('Y-m-d H:i:s', strtotime('+1 month'));

        $this->db->execute(
            "UPDATE subscriptions SET status = 'active', current_period_start = ?, current_period_end = ?, bookings_used_this_month = 0 WHERE id = ?",
            [$periodStart, $periodEnd, $sub['id']]
        );

        return $this->getCurrentSubscription($sub['user_id']);
    }

    public function cancelSubscription(int $userId): bool {
        $sub = $this->getCurrentSubscription($userId);

        if (!$sub) {
            throw new Exception('No active subscription');
        }

        $this->db->execute(
            "UPDATE subscriptions SET status = 'cancelled' WHERE id = ?",
            [$sub['id']]
        );

        return true;
    }

    public function resetMonthlyUsage(): int {
        // This should be called by a cron job at the start of each month
        $result = $this->db->execute(
            "UPDATE subscriptions SET bookings_used_this_month = 0
             WHERE status = 'active' AND DATE(current_period_end) <= DATE('now')"
        );

        // Also update period dates
        $this->db->execute(
            "UPDATE subscriptions
             SET current_period_start = DATE('now'),
                 current_period_end = DATE('now', '+1 month')
             WHERE status = 'active' AND DATE(current_period_end) <= DATE('now')"
        );

        return 1;
    }

    public function handleWebhook(array $payload): bool {
        $eventType = $payload['type'] ?? '';

        switch ($eventType) {
            case 'checkout.session.completed':
                $sessionId = $payload['data']['object']['id'] ?? '';
                $this->activateSubscription($sessionId);
                break;

            case 'invoice.payment_failed':
                $subscriptionId = $payload['data']['object']['subscription'] ?? '';
                $this->db->execute(
                    "UPDATE subscriptions SET status = 'past_due' WHERE stripe_subscription_id = ?",
                    [$subscriptionId]
                );
                break;

            case 'customer.subscription.deleted':
                $subscriptionId = $payload['data']['object']['id'] ?? '';
                $this->db->execute(
                    "UPDATE subscriptions SET status = 'cancelled' WHERE stripe_subscription_id = ?",
                    [$subscriptionId]
                );
                break;
        }

        return true;
    }
}
