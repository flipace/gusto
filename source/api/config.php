<?php
/**
 * Gusto Chef - Configuration
 * Uber-like Chef Booking Platform
 */

namespace GustoChef;

// Error reporting for development
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Database configuration
define('DB_PATH', __DIR__ . '/gusto_chef.db');

// Stripe Configuration (Test Keys - Replace with live keys in production)
define('STRIPE_SECRET_KEY', 'sk_test_REPLACE_WITH_YOUR_KEY');
define('STRIPE_PUBLISHABLE_KEY', 'pk_test_REPLACE_WITH_YOUR_KEY');
define('STRIPE_WEBHOOK_SECRET', 'whsec_REPLACE_WITH_YOUR_KEY');

// App Configuration
define('APP_NAME', 'Gusto Chef');
define('APP_URL', 'https://gustochef.app');
define('JWT_SECRET', 'your-super-secret-jwt-key-change-in-production');

// Pricing Configuration (in cents for Stripe)
define('SUBSCRIPTION_TIERS', [
    'basic' => [
        'name' => 'Gusto Basic',
        'price' => 999, // €9.99
        'bookings_per_month' => 1,
        'service_fee_percent' => 10,
        'stripe_price_id' => 'price_basic_monthly'
    ],
    'plus' => [
        'name' => 'Gusto Plus',
        'price' => 2499, // €24.99
        'bookings_per_month' => 4,
        'service_fee_percent' => 5,
        'stripe_price_id' => 'price_plus_monthly'
    ],
    'premium' => [
        'name' => 'Gusto Premium',
        'price' => 4999, // €49.99
        'bookings_per_month' => -1, // unlimited
        'service_fee_percent' => 0,
        'priority_booking' => true,
        'stripe_price_id' => 'price_premium_monthly'
    ]
]);

// Chef Commission (Platform takes 20% of each booking)
define('PLATFORM_COMMISSION_PERCENT', 20);

// Chef Premium Listing
define('CHEF_PREMIUM_PRICE', 2999); // €29.99/month

// Session configuration
session_start();

// CORS Headers for API
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Autoload classes
spl_autoload_register(function ($class) {
    $prefix = 'GustoChef\\';
    $base_dir = __DIR__ . '/classes/';

    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }

    $relative_class = substr($class, $len);
    $file = $base_dir . str_replace('\\', '/', $relative_class) . '.php';

    if (file_exists($file)) {
        require $file;
    }
});
