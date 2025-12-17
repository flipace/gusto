<?php
/**
 * Payment Processing for Gusto Chef
 * Handles Stripe payments for individual bookings
 */

namespace GustoChef;

use Exception;

class Payment {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    public function createPaymentIntent(int $bookingId, int $userId): array {
        $booking = (new Booking())->getById($bookingId);

        if (!$booking) {
            throw new Exception('Booking not found');
        }

        if ($booking['customer_id'] != $userId) {
            throw new Exception('Not authorized');
        }

        if ($booking['status'] !== 'confirmed') {
            throw new Exception('Booking must be confirmed before payment');
        }

        // In production, use Stripe SDK:
        // \Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);
        // $paymentIntent = \Stripe\PaymentIntent::create([...]);

        $paymentIntentId = 'pi_' . bin2hex(random_bytes(16));

        $this->db->execute(
            "UPDATE bookings SET stripe_payment_intent_id = ? WHERE id = ?",
            [$paymentIntentId, $bookingId]
        );

        return [
            'payment_intent_id' => $paymentIntentId,
            'client_secret' => $paymentIntentId . '_secret_' . bin2hex(random_bytes(8)),
            'amount' => $booking['total_amount'],
            'currency' => 'eur'
        ];
    }

    public function confirmPayment(int $bookingId, string $paymentIntentId): array {
        $booking = (new Booking())->getById($bookingId);

        if (!$booking) {
            throw new Exception('Booking not found');
        }

        if ($booking['stripe_payment_intent_id'] !== $paymentIntentId) {
            throw new Exception('Payment intent mismatch');
        }

        // In production, verify payment with Stripe
        // $paymentIntent = \Stripe\PaymentIntent::retrieve($paymentIntentId);
        // if ($paymentIntent->status !== 'succeeded') throw...

        $this->db->execute(
            "UPDATE bookings SET paid_at = CURRENT_TIMESTAMP WHERE id = ?",
            [$bookingId]
        );

        return (new Booking())->getById($bookingId);
    }

    public function processRefund(int $bookingId, int $adminUserId, string $reason = ''): array {
        $booking = (new Booking())->getById($bookingId);

        if (!$booking) {
            throw new Exception('Booking not found');
        }

        if (!$booking['paid_at']) {
            throw new Exception('Booking has not been paid');
        }

        // In production, process refund via Stripe
        // \Stripe\Refund::create(['payment_intent' => $booking['stripe_payment_intent_id']]);

        $this->db->execute(
            "UPDATE bookings SET status = 'cancelled', cancellation_reason = ? WHERE id = ?",
            [$reason, $bookingId]
        );

        return [
            'refunded' => true,
            'amount' => $booking['total_amount'],
            'booking_id' => $bookingId
        ];
    }

    public function getPaymentHistory(int $userId): array {
        return $this->db->query(
            "SELECT
                b.id as booking_id,
                b.booking_date,
                b.total_amount,
                b.paid_at,
                b.status,
                chef_user.first_name as chef_name
             FROM bookings b
             JOIN chef_profiles cp ON cp.id = b.chef_id
             JOIN users chef_user ON chef_user.id = cp.user_id
             WHERE b.customer_id = ? AND b.paid_at IS NOT NULL
             ORDER BY b.paid_at DESC",
            [$userId]
        );
    }

    public function getChefPayouts(int $userId): array {
        $chef = (new Chef())->getProfile($userId);

        if (!$chef) {
            throw new Exception('Chef profile not found');
        }

        $pendingPayout = $this->db->query(
            "SELECT SUM(chef_payout) as amount, COUNT(*) as bookings
             FROM bookings
             WHERE chef_id = ? AND status = 'completed' AND paid_at IS NOT NULL",
            [$chef['id']]
        );

        $recentPayouts = $this->db->query(
            "SELECT b.id, b.booking_date, b.chef_payout, b.paid_at,
                    u.first_name as customer_name
             FROM bookings b
             JOIN users u ON u.id = b.customer_id
             WHERE b.chef_id = ? AND b.status = 'completed'
             ORDER BY b.paid_at DESC
             LIMIT 20",
            [$chef['id']]
        );

        return [
            'pending_amount' => $pendingPayout[0]['amount'] ?? 0,
            'pending_bookings' => $pendingPayout[0]['bookings'] ?? 0,
            'recent_payouts' => $recentPayouts,
            'stripe_connected' => !empty($chef['stripe_account_id'])
        ];
    }

    public function createStripeConnectAccount(int $userId): array {
        $chef = (new Chef())->getProfile($userId);

        if (!$chef) {
            throw new Exception('Chef profile not found');
        }

        // In production, create Stripe Connect account:
        // $account = \Stripe\Account::create(['type' => 'express', ...]);

        $accountId = 'acct_' . bin2hex(random_bytes(8));

        $this->db->execute(
            "UPDATE chef_profiles SET stripe_account_id = ? WHERE id = ?",
            [$accountId, $chef['id']]
        );

        return [
            'account_id' => $accountId,
            'onboarding_url' => APP_URL . "/stripe/onboard?account=$accountId"
        ];
    }
}
