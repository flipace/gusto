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
require_once __DIR__ . '/classes/Database.php';

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
    $pdo = $db->getConnection();

    // Check if admin already exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE user_type = 'admin' LIMIT 1");
    $stmt->execute();

    if ($stmt->fetch()) {
        die(json_encode([
            'success' => false,
            'message' => 'Admin user already exists. Delete this file for security.'
        ]));
    }

    // Create admin user
    $adminEmail = getenv('ADMIN_EMAIL') ?: 'admin@gusto.app';
    $adminPassword = getenv('ADMIN_PASSWORD') ?: 'GustoAdmin2024!';
    $hashedPassword = password_hash($adminPassword, PASSWORD_BCRYPT);

    $stmt = $pdo->prepare("
        INSERT INTO users (email, password_hash, first_name, last_name, user_type, is_verified)
        VALUES (?, ?, 'Admin', 'Gusto', 'admin', 1)
    ");
    $stmt->execute([$adminEmail, $hashedPassword]);

    echo json_encode([
        'success' => true,
        'message' => 'Admin user created successfully!',
        'credentials' => [
            'email' => $adminEmail,
            'password' => $adminPassword,
            'note' => 'Change this password immediately and DELETE this setup.php file!'
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
