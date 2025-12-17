<?php
/**
 * Authentication Handler for Gusto Chef
 */

namespace GustoChef;

use Exception;

class Auth {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    public function register(array $data): array {
        $email = filter_var($data['email'] ?? '', FILTER_VALIDATE_EMAIL);
        $password = $data['password'] ?? '';
        $firstName = trim($data['first_name'] ?? '');
        $lastName = trim($data['last_name'] ?? '');
        $phone = trim($data['phone'] ?? '');
        $userType = in_array($data['user_type'] ?? '', ['customer', 'chef']) ? $data['user_type'] : 'customer';

        if (!$email) {
            throw new Exception('Invalid email address');
        }

        if (strlen($password) < 8) {
            throw new Exception('Password must be at least 8 characters');
        }

        if (empty($firstName) || empty($lastName)) {
            throw new Exception('First name and last name are required');
        }

        // Check if email exists
        $existing = $this->db->query("SELECT id FROM users WHERE email = ?", [$email]);
        if (!empty($existing)) {
            throw new Exception('Email already registered');
        }

        $passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

        $this->db->execute(
            "INSERT INTO users (email, password_hash, first_name, last_name, phone, user_type)
             VALUES (?, ?, ?, ?, ?, ?)",
            [$email, $passwordHash, $firstName, $lastName, $phone, $userType]
        );

        $userId = $this->db->lastInsertId();

        // If registering as chef, create chef profile
        if ($userType === 'chef') {
            $this->db->execute(
                "INSERT INTO chef_profiles (user_id, hourly_rate, location_city) VALUES (?, ?, ?)",
                [$userId, 5000, ''] // Default €50/hour
            );
        }

        $user = $this->getUserById($userId);
        $token = $this->generateToken($user);

        return [
            'user' => $this->sanitizeUser($user),
            'token' => $token
        ];
    }

    public function login(string $email, string $password): array {
        $users = $this->db->query("SELECT * FROM users WHERE email = ?", [$email]);

        if (empty($users)) {
            throw new Exception('Invalid credentials');
        }

        $user = $users[0];

        if (!password_verify($password, $user['password_hash'])) {
            throw new Exception('Invalid credentials');
        }

        $token = $this->generateToken($user);

        return [
            'user' => $this->sanitizeUser($user),
            'token' => $token
        ];
    }

    public function verifyToken(string $token): ?array {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        list($header, $payload, $signature) = $parts;

        $expectedSignature = $this->base64UrlEncode(
            hash_hmac('sha256', "$header.$payload", JWT_SECRET, true)
        );

        if (!hash_equals($expectedSignature, $signature)) {
            return null;
        }

        $payloadData = json_decode($this->base64UrlDecode($payload), true);

        if ($payloadData['exp'] < time()) {
            return null;
        }

        return $this->getUserById($payloadData['sub']);
    }

    public function getCurrentUser(): ?array {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

        if (preg_match('/Bearer\s+(.+)/', $authHeader, $matches)) {
            return $this->verifyToken($matches[1]);
        }

        return null;
    }

    public function requireAuth(): array {
        $user = $this->getCurrentUser();

        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Authentication required']);
            exit;
        }

        return $user;
    }

    public function requireChef(): array {
        $user = $this->requireAuth();

        if ($user['user_type'] !== 'chef') {
            http_response_code(403);
            echo json_encode(['error' => 'Chef access required']);
            exit;
        }

        return $user;
    }

    private function generateToken(array $user): string {
        $header = $this->base64UrlEncode(json_encode([
            'typ' => 'JWT',
            'alg' => 'HS256'
        ]));

        $payload = $this->base64UrlEncode(json_encode([
            'sub' => $user['id'],
            'email' => $user['email'],
            'type' => $user['user_type'],
            'iat' => time(),
            'exp' => time() + (30 * 24 * 60 * 60) // 30 days
        ]));

        $signature = $this->base64UrlEncode(
            hash_hmac('sha256', "$header.$payload", JWT_SECRET, true)
        );

        return "$header.$payload.$signature";
    }

    private function base64UrlEncode(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $data): string {
        return base64_decode(strtr($data, '-_', '+/'));
    }

    public function getUserById(int $id): ?array {
        $users = $this->db->query("SELECT * FROM users WHERE id = ?", [$id]);
        return $users[0] ?? null;
    }

    public function sanitizeUser(array $user): array {
        unset($user['password_hash']);
        return $user;
    }

    public function updateProfile(int $userId, array $data): array {
        $allowedFields = ['first_name', 'last_name', 'phone', 'avatar_url'];
        $updates = [];
        $params = [];

        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updates[] = "$field = ?";
                $params[] = $data[$field];
            }
        }

        if (empty($updates)) {
            throw new Exception('No valid fields to update');
        }

        $params[] = $userId;

        $this->db->execute(
            "UPDATE users SET " . implode(', ', $updates) . ", updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            $params
        );

        return $this->sanitizeUser($this->getUserById($userId));
    }
}
