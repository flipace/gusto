<?php
/**
 * Gusto Chef - Initial Setup Script
 *
 * Run once to create the admin user.
 * Access: /api/setup.php?key=YOUR_SECRET_KEY
 *
 * After running, DELETE this file for security!
 */

require_once __DIR__ . '/config.php';

use GustoChef\Database;

// Security: Require a secret key to run setup
$setupKey = $_GET['key'] ?? '';
$expectedKey = getenv('SETUP_KEY') ?: 'gusto-setup-2024';

if ($setupKey !== $expectedKey) {
    http_response_code(403);
    die(json_encode(['error' => 'Invalid setup key. Use ?key=YOUR_SETUP_KEY']));
}

header('Content-Type: application/json');

try {
    $db = Database::getInstance();

    // Check if admin already exists
    $existing = $db->query("SELECT id FROM users WHERE user_type = 'admin' LIMIT 1");

    if (!empty($existing)) {
        die(json_encode([
            'success' => false,
            'message' => 'Admin user already exists. Delete this file for security.'
        ]));
    }

    // Create admin user
    $adminEmail = getenv('ADMIN_EMAIL') ?: 'admin@gusto.app';
    $adminPassword = getenv('ADMIN_PASSWORD') ?: 'GustoAdmin2024!';
    $hashedPassword = password_hash($adminPassword, PASSWORD_BCRYPT);

    $db->execute(
        "INSERT INTO users (email, password_hash, first_name, last_name, user_type, is_verified) VALUES (?, ?, 'Admin', 'Gusto', 'admin', 1)",
        [$adminEmail, $hashedPassword]
    );

    // Create demo chefs
    $demoChefs = [
        ['Marco', 'Rossi', 'marco@demo.com', 'Italienisch, Mediterran', 'Pasta, Risotto, Tiramisu', 5500, 'Berlin', 'Ausgebildet in Italien, bringe ich authentische Pasta und mediterrane Küche direkt in dein Zuhause.'],
        ['Yuki', 'Tanaka', 'yuki@demo.com', 'Japanisch, Asiatisch', 'Sushi, Ramen, Tempura', 6500, 'München', 'Japanische Küche mit modernem Twist. Sushi, Ramen und mehr.'],
        ['Sophie', 'Dubois', 'sophie@demo.com', 'Französisch', 'Beef Bourguignon, Soufflé, Crème Brûlée', 7500, 'Hamburg', 'Französische Haute Cuisine für besondere Anlässe.'],
        ['Anna', 'Müller', 'anna@demo.com', 'Vegan, Gesund', 'Buddha Bowls, Vegane Desserts', 4500, 'Berlin', 'Vegane Kreationen die begeistern.'],
        ['Carlos', 'Rodriguez', 'carlos@demo.com', 'Spanisch, Mediterran', 'Paella, Tapas, Churros', 5000, 'Frankfurt', 'Tapas, Paella und mehr - authentische spanische Küche.'],
    ];

    $chefPassword = password_hash('chef123', PASSWORD_BCRYPT);

    foreach ($demoChefs as $chef) {
        // Create user
        $db->execute(
            "INSERT INTO users (email, password_hash, first_name, last_name, user_type, is_verified) VALUES (?, ?, ?, ?, 'chef', 1)",
            [$chef[2], $chefPassword, $chef[0], $chef[1]]
        );
        $userId = $db->getConnection()->lastInsertRowID();

        // Create chef profile
        $db->execute(
            "INSERT INTO chef_profiles (user_id, bio, cuisines, specialties, hourly_rate, location_city, is_available, rating_avg, rating_count, total_bookings) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)",
            [$userId, $chef[7], $chef[3], $chef[4], $chef[5], $chef[6], round(4.5 + (rand(0, 5) / 10), 1), rand(50, 200), rand(100, 500)]
        );
    }

    echo json_encode([
        'success' => true,
        'message' => 'Setup complete! Admin and demo chefs created.',
        'admin' => [
            'email' => $adminEmail,
            'password' => $adminPassword
        ],
        'demo_chefs' => [
            'password' => 'chef123',
            'note' => 'Delete this setup.php file after use!'
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
