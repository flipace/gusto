<?php
/**
 * Gusto Chef API Router
 * RESTful API for the Chef Booking Platform
 */

require_once __DIR__ . '/config.php';

use GustoChef\Auth;
use GustoChef\Chef;
use GustoChef\Booking;
use GustoChef\Subscription;
use GustoChef\Payment;
use GustoChef\Message;
use GustoChef\Upload;
use GustoChef\Notification;
use GustoChef\Database;

// Initialize database
Database::getInstance();

// Parse request
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];
$basePath = '/api';

// Remove query string and base path
$path = parse_url($requestUri, PHP_URL_PATH);
$path = preg_replace('/^' . preg_quote($basePath, '/') . '/', '', $path);
$path = trim($path, '/');
$segments = $path ? explode('/', $path) : [];

// Get JSON body
$body = json_decode(file_get_contents('php://input'), true) ?? [];

// Response helper
function jsonResponse($data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

function errorResponse(string $message, int $code = 400): void {
    jsonResponse(['error' => $message], $code);
}

try {
    $auth = new Auth();
    $resource = $segments[0] ?? '';
    $id = $segments[1] ?? null;
    $subResource = $segments[2] ?? null;

    switch ($resource) {

        // ==================== AUTH ====================
        case 'auth':
            switch ($id) {
                case 'register':
                    if ($requestMethod !== 'POST') errorResponse('Method not allowed', 405);
                    jsonResponse($auth->register($body), 201);
                    break;

                case 'login':
                    if ($requestMethod !== 'POST') errorResponse('Method not allowed', 405);
                    $result = $auth->login($body['email'] ?? '', $body['password'] ?? '');
                    jsonResponse($result);
                    break;

                case 'me':
                    $user = $auth->requireAuth();
                    jsonResponse($auth->sanitizeUser($user));
                    break;

                case 'profile':
                    if ($requestMethod !== 'PUT') errorResponse('Method not allowed', 405);
                    $user = $auth->requireAuth();
                    jsonResponse($auth->updateProfile($user['id'], $body));
                    break;

                default:
                    errorResponse('Not found', 404);
            }
            break;

        // ==================== CHEFS ====================
        case 'chefs':
            $chef = new Chef();

            if (!$id) {
                // GET /chefs - Search chefs
                if ($requestMethod !== 'GET') errorResponse('Method not allowed', 405);
                $filters = $_GET;
                jsonResponse($chef->search($filters));
            } else if ($id === 'me') {
                // Chef's own profile
                $user = $auth->requireChef();
                switch ($requestMethod) {
                    case 'GET':
                        jsonResponse($chef->getProfile($user['id']));
                        break;
                    case 'PUT':
                        jsonResponse($chef->updateProfile($user['id'], $body));
                        break;
                    default:
                        errorResponse('Method not allowed', 405);
                }
            } else if ($subResource === 'availability') {
                $chefId = (int)$id;
                if ($requestMethod === 'GET') {
                    $date = $_GET['date'] ?? null;
                    jsonResponse($chef->getAvailability($chefId, $date));
                } else if ($requestMethod === 'PUT') {
                    $user = $auth->requireChef();
                    $chef->setAvailability($user['id'], $body['slots'] ?? []);
                    jsonResponse(['success' => true]);
                } else {
                    errorResponse('Method not allowed', 405);
                }
            } else if ($subResource === 'gallery') {
                if ($requestMethod === 'POST') {
                    $user = $auth->requireChef();
                    jsonResponse($chef->addGalleryImage($user['id'], $body));
                } else {
                    $chefId = (int)$id;
                    jsonResponse($chef->getGallery($chefId));
                }
            } else if ($subResource === 'reviews') {
                $chefId = (int)$id;
                jsonResponse($chef->getReviews($chefId, (int)($_GET['limit'] ?? 10)));
            } else if ($subResource === 'earnings') {
                $user = $auth->requireChef();
                $period = $_GET['period'] ?? 'month';
                jsonResponse($chef->getEarnings($user['id'], $period));
            } else {
                // GET /chefs/{id} - Single chef
                $chefId = (int)$id;
                $profile = $chef->getProfileById($chefId);
                if (!$profile) errorResponse('Chef not found', 404);
                jsonResponse($profile);
            }
            break;

        // ==================== BOOKINGS ====================
        case 'bookings':
            $booking = new Booking();
            $user = $auth->requireAuth();

            if (!$id) {
                switch ($requestMethod) {
                    case 'GET':
                        $status = $_GET['status'] ?? null;
                        if ($user['user_type'] === 'chef') {
                            $chefProfile = (new Chef())->getProfile($user['id']);
                            if (!$chefProfile) errorResponse('Chef profile not found', 404);
                            jsonResponse($booking->getChefBookings($chefProfile['id'], $status));
                        } else {
                            jsonResponse($booking->getCustomerBookings($user['id'], $status));
                        }
                        break;
                    case 'POST':
                        jsonResponse($booking->create($user['id'], $body), 201);
                        break;
                    default:
                        errorResponse('Method not allowed', 405);
                }
            } else if ($id === 'upcoming') {
                jsonResponse($booking->getUpcomingBookings($user['id'], $user['user_type']));
            } else if ($subResource === 'status') {
                if ($requestMethod !== 'PUT') errorResponse('Method not allowed', 405);
                jsonResponse($booking->updateStatus((int)$id, $body['status'] ?? '', $user['id']));
            } else if ($subResource === 'review') {
                if ($requestMethod !== 'POST') errorResponse('Method not allowed', 405);
                jsonResponse($booking->addReview((int)$id, $user['id'], $body));
            } else {
                // GET /bookings/{id}
                $b = $booking->getById((int)$id);
                if (!$b) errorResponse('Booking not found', 404);
                // Verify access
                $chefProfile = $user['user_type'] === 'chef' ? (new Chef())->getProfile($user['id']) : null;
                if ($b['customer_id'] != $user['id'] && (!$chefProfile || $b['chef_id'] != $chefProfile['id'])) {
                    errorResponse('Not authorized', 403);
                }
                jsonResponse($b);
            }
            break;

        // ==================== SUBSCRIPTIONS ====================
        case 'subscriptions':
            $subscription = new Subscription();

            if ($id === 'plans') {
                jsonResponse($subscription->getAvailablePlans());
            } else if ($id === 'current') {
                $user = $auth->requireAuth();
                $sub = $subscription->getCurrentSubscription($user['id']);
                jsonResponse($sub ?? ['tier' => null, 'message' => 'No active subscription']);
            } else if ($id === 'checkout') {
                if ($requestMethod !== 'POST') errorResponse('Method not allowed', 405);
                $user = $auth->requireAuth();
                jsonResponse($subscription->createCheckoutSession($user['id'], $body['tier'] ?? ''));
            } else if ($id === 'activate') {
                if ($requestMethod !== 'POST') errorResponse('Method not allowed', 405);
                jsonResponse($subscription->activateSubscription($body['session_id'] ?? ''));
            } else if ($id === 'cancel') {
                if ($requestMethod !== 'POST') errorResponse('Method not allowed', 405);
                $user = $auth->requireAuth();
                $subscription->cancelSubscription($user['id']);
                jsonResponse(['cancelled' => true]);
            } else if ($id === 'webhook') {
                // Stripe webhook endpoint
                if ($requestMethod !== 'POST') errorResponse('Method not allowed', 405);
                $subscription->handleWebhook($body);
                jsonResponse(['received' => true]);
            } else {
                errorResponse('Not found', 404);
            }
            break;

        // ==================== PAYMENTS ====================
        case 'payments':
            $payment = new Payment();
            $user = $auth->requireAuth();

            if ($id === 'create-intent') {
                if ($requestMethod !== 'POST') errorResponse('Method not allowed', 405);
                jsonResponse($payment->createPaymentIntent($body['booking_id'] ?? 0, $user['id']));
            } else if ($id === 'confirm') {
                if ($requestMethod !== 'POST') errorResponse('Method not allowed', 405);
                jsonResponse($payment->confirmPayment($body['booking_id'] ?? 0, $body['payment_intent_id'] ?? ''));
            } else if ($id === 'history') {
                jsonResponse($payment->getPaymentHistory($user['id']));
            } else if ($id === 'payouts') {
                jsonResponse($payment->getChefPayouts($user['id']));
            } else if ($id === 'connect') {
                if ($requestMethod !== 'POST') errorResponse('Method not allowed', 405);
                jsonResponse($payment->createStripeConnectAccount($user['id']));
            } else {
                errorResponse('Not found', 404);
            }
            break;

        // ==================== FAVORITES ====================
        case 'favorites':
            $user = $auth->requireAuth();
            $chef = new Chef();

            if ($requestMethod === 'GET') {
                jsonResponse($chef->getFavorites($user['id']));
            } else if ($requestMethod === 'POST') {
                $added = $chef->toggleFavorite($user['id'], (int)($body['chef_id'] ?? 0));
                jsonResponse(['favorited' => $added]);
            } else {
                errorResponse('Method not allowed', 405);
            }
            break;

        // ==================== MESSAGES ====================
        case 'messages':
            $message = new Message();
            $user = $auth->requireAuth();

            if (!$id) {
                // GET /messages - Get all conversations
                if ($requestMethod === 'GET') {
                    jsonResponse($message->getConversations($user['id']));
                } else if ($requestMethod === 'POST') {
                    // Send new message
                    $result = $message->send(
                        $user['id'],
                        (int)($body['receiver_id'] ?? 0),
                        $body['message'] ?? '',
                        $body['booking_id'] ?? null
                    );
                    // Send notification
                    $notification = new Notification();
                    $notification->notifyNewMessage(
                        (int)$body['receiver_id'],
                        $user['id'],
                        $user['first_name']
                    );
                    jsonResponse($result, 201);
                } else {
                    errorResponse('Method not allowed', 405);
                }
            } else if ($id === 'unread') {
                jsonResponse(['count' => $message->getUnreadCount($user['id'])]);
            } else if ($subResource === 'booking') {
                // GET /messages/{booking_id}/booking
                jsonResponse($message->getBookingMessages((int)$id, $user['id']));
            } else {
                // GET /messages/{user_id} - Get conversation with user
                jsonResponse($message->getConversation($user['id'], (int)$id));
            }
            break;

        // ==================== NOTIFICATIONS ====================
        case 'notifications':
            $notification = new Notification();
            $user = $auth->requireAuth();

            if (!$id) {
                if ($requestMethod === 'GET') {
                    $unreadOnly = isset($_GET['unread']);
                    jsonResponse($notification->getForUser($user['id'], 50, $unreadOnly));
                } else {
                    errorResponse('Method not allowed', 405);
                }
            } else if ($id === 'unread') {
                jsonResponse(['count' => $notification->getUnreadCount($user['id'])]);
            } else if ($id === 'read-all') {
                if ($requestMethod !== 'POST') errorResponse('Method not allowed', 405);
                $notification->markAllAsRead($user['id']);
                jsonResponse(['success' => true]);
            } else if ($id === 'subscribe') {
                if ($requestMethod !== 'POST') errorResponse('Method not allowed', 405);
                $notification->subscribePush($user['id'], $body);
                jsonResponse(['subscribed' => true]);
            } else if ($subResource === 'read') {
                if ($requestMethod !== 'POST') errorResponse('Method not allowed', 405);
                $notification->markAsRead((int)$id, $user['id']);
                jsonResponse(['success' => true]);
            } else {
                errorResponse('Not found', 404);
            }
            break;

        // ==================== UPLOADS ====================
        case 'uploads':
            $upload = new Upload();

            if ($id && $requestMethod === 'GET') {
                // Serve uploaded file
                $upload->serveImage($id);
            } else if ($requestMethod === 'POST') {
                $user = $auth->requireAuth();

                if (!isset($_FILES['file'])) {
                    errorResponse('No file uploaded');
                }

                $type = $_POST['type'] ?? 'gallery';

                if ($type === 'avatar') {
                    $url = $upload->uploadAvatar($_FILES['file'], $user['id']);
                    jsonResponse(['url' => $url]);
                } else {
                    $result = $upload->uploadGalleryImage($_FILES['file'], $user['id'], [
                        'caption' => $_POST['caption'] ?? '',
                        'dish_name' => $_POST['dish_name'] ?? ''
                    ]);
                    jsonResponse($result, 201);
                }
            } else if ($requestMethod === 'DELETE' && $id) {
                $user = $auth->requireChef();
                $upload->deleteGalleryImage((int)$id, $user['id']);
                jsonResponse(['deleted' => true]);
            } else {
                errorResponse('Method not allowed', 405);
            }
            break;

        // ==================== STATS (Admin) ====================
        case 'stats':
            $user = $auth->requireAuth();
            if ($user['user_type'] !== 'admin') {
                errorResponse('Admin access required', 403);
            }

            $db = Database::getInstance();

            $stats = [
                'users' => $db->query("SELECT COUNT(*) as count FROM users")[0]['count'],
                'chefs' => $db->query("SELECT COUNT(*) as count FROM chef_profiles WHERE is_active = 1")[0]['count'],
                'bookings_total' => $db->query("SELECT COUNT(*) as count FROM bookings")[0]['count'],
                'bookings_completed' => $db->query("SELECT COUNT(*) as count FROM bookings WHERE status = 'completed'")[0]['count'],
                'revenue_total' => $db->query("SELECT SUM(platform_commission) as total FROM bookings WHERE status = 'completed'")[0]['total'] ?? 0,
                'subscriptions_active' => $db->query("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'")[0]['count'],
            ];

            jsonResponse($stats);
            break;

        // ==================== HEALTH CHECK ====================
        case 'health':
        case '':
            jsonResponse([
                'status' => 'ok',
                'app' => APP_NAME,
                'version' => '1.0.0',
                'timestamp' => date('c')
            ]);
            break;

        default:
            errorResponse('Not found', 404);
    }

} catch (Exception $e) {
    errorResponse($e->getMessage(), 400);
}
