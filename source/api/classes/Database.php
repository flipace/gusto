<?php
/**
 * Database Handler for Gusto Chef
 */

namespace GustoChef;

use SQLite3;
use Exception;

class Database {
    private static $instance = null;
    private $db;

    private function __construct() {
        $this->db = new SQLite3(DB_PATH);
        $this->db->enableExceptions(true);
        $this->initSchema();
    }

    public static function getInstance(): Database {
        if (self::$instance === null) {
            self::$instance = new Database();
        }
        return self::$instance;
    }

    public function getConnection(): SQLite3 {
        return $this->db;
    }

    public function query(string $sql, array $params = []): array {
        $stmt = $this->db->prepare($sql);

        foreach ($params as $key => $value) {
            $paramKey = is_int($key) ? $key + 1 : ':' . $key;
            $stmt->bindValue($paramKey, $value);
        }

        $result = $stmt->execute();
        $rows = [];

        while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
            $rows[] = $row;
        }

        return $rows;
    }

    public function execute(string $sql, array $params = []): bool {
        $stmt = $this->db->prepare($sql);

        foreach ($params as $key => $value) {
            $paramKey = is_int($key) ? $key + 1 : ':' . $key;
            $stmt->bindValue($paramKey, $value);
        }

        return $stmt->execute() !== false;
    }

    public function lastInsertId(): int {
        return $this->db->lastInsertRowID();
    }

    private function initSchema(): void {
        // Users table (both customers and chefs)
        $this->db->exec("
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                phone TEXT,
                avatar_url TEXT,
                user_type TEXT DEFAULT 'customer', -- customer, chef, admin
                stripe_customer_id TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ");

        // Customer Subscriptions
        $this->db->exec("
            CREATE TABLE IF NOT EXISTS subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                tier TEXT NOT NULL, -- basic, plus, premium
                stripe_subscription_id TEXT,
                status TEXT DEFAULT 'active', -- active, cancelled, past_due
                current_period_start DATETIME,
                current_period_end DATETIME,
                bookings_used_this_month INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ");

        // Chef Profiles
        $this->db->exec("
            CREATE TABLE IF NOT EXISTS chef_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER UNIQUE NOT NULL,
                bio TEXT,
                specialties TEXT, -- JSON array
                cuisines TEXT, -- JSON array
                hourly_rate INTEGER NOT NULL, -- in cents
                min_hours INTEGER DEFAULT 2,
                max_guests INTEGER DEFAULT 12,
                travel_radius_km INTEGER DEFAULT 25,
                location_lat REAL,
                location_lng REAL,
                location_city TEXT,
                is_premium_listing INTEGER DEFAULT 0,
                premium_until DATETIME,
                stripe_account_id TEXT, -- for payouts
                rating_avg REAL DEFAULT 0,
                rating_count INTEGER DEFAULT 0,
                total_bookings INTEGER DEFAULT 0,
                is_verified INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ");

        // Chef Availability
        $this->db->exec("
            CREATE TABLE IF NOT EXISTS chef_availability (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                chef_id INTEGER NOT NULL,
                day_of_week INTEGER, -- 0-6 (Sunday-Saturday), NULL for specific date
                specific_date DATE, -- for specific date availability
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                is_available INTEGER DEFAULT 1,
                FOREIGN KEY (chef_id) REFERENCES chef_profiles(id)
            )
        ");

        // Bookings
        $this->db->exec("
            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                chef_id INTEGER NOT NULL,
                booking_date DATE NOT NULL,
                start_time TIME NOT NULL,
                duration_hours INTEGER NOT NULL,
                guest_count INTEGER NOT NULL,
                location_address TEXT NOT NULL,
                location_lat REAL,
                location_lng REAL,
                special_requests TEXT,
                menu_preferences TEXT, -- JSON
                dietary_restrictions TEXT, -- JSON
                status TEXT DEFAULT 'pending', -- pending, confirmed, in_progress, completed, cancelled
                chef_rate INTEGER NOT NULL, -- hourly rate at time of booking
                subtotal INTEGER NOT NULL, -- chef_rate * duration
                service_fee INTEGER NOT NULL, -- platform fee from customer
                platform_commission INTEGER NOT NULL, -- 20% from chef
                total_amount INTEGER NOT NULL, -- what customer pays
                chef_payout INTEGER NOT NULL, -- what chef receives
                stripe_payment_intent_id TEXT,
                paid_at DATETIME,
                cancelled_at DATETIME,
                cancellation_reason TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES users(id),
                FOREIGN KEY (chef_id) REFERENCES chef_profiles(id)
            )
        ");

        // Reviews
        $this->db->exec("
            CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                booking_id INTEGER UNIQUE NOT NULL,
                customer_id INTEGER NOT NULL,
                chef_id INTEGER NOT NULL,
                rating INTEGER NOT NULL, -- 1-5
                food_rating INTEGER, -- 1-5
                service_rating INTEGER, -- 1-5
                cleanliness_rating INTEGER, -- 1-5
                review_text TEXT,
                chef_response TEXT,
                is_public INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (booking_id) REFERENCES bookings(id),
                FOREIGN KEY (customer_id) REFERENCES users(id),
                FOREIGN KEY (chef_id) REFERENCES chef_profiles(id)
            )
        ");

        // Chef Gallery
        $this->db->exec("
            CREATE TABLE IF NOT EXISTS chef_gallery (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                chef_id INTEGER NOT NULL,
                image_url TEXT NOT NULL,
                caption TEXT,
                dish_name TEXT,
                is_featured INTEGER DEFAULT 0,
                sort_order INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (chef_id) REFERENCES chef_profiles(id)
            )
        ");

        // Messages
        $this->db->exec("
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                booking_id INTEGER,
                sender_id INTEGER NOT NULL,
                receiver_id INTEGER NOT NULL,
                message TEXT NOT NULL,
                is_read INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (booking_id) REFERENCES bookings(id),
                FOREIGN KEY (sender_id) REFERENCES users(id),
                FOREIGN KEY (receiver_id) REFERENCES users(id)
            )
        ");

        // Favorites
        $this->db->exec("
            CREATE TABLE IF NOT EXISTS favorites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                chef_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, chef_id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (chef_id) REFERENCES chef_profiles(id)
            )
        ");

        // Create indexes for performance
        $this->db->exec("CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id)");
        $this->db->exec("CREATE INDEX IF NOT EXISTS idx_bookings_chef ON bookings(chef_id)");
        $this->db->exec("CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date)");
        $this->db->exec("CREATE INDEX IF NOT EXISTS idx_chef_location ON chef_profiles(location_lat, location_lng)");
        $this->db->exec("CREATE INDEX IF NOT EXISTS idx_reviews_chef ON reviews(chef_id)");
    }

    public function __destruct() {
        if ($this->db) {
            $this->db->close();
        }
    }
}
