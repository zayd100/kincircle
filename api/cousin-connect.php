<?php
require_once '../config.php';
requireLogin();

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    switch ($method) {
        case 'GET':
            if ($action === 'status') {
                // Get user's current cousin connect status
                $stmt = $pdo->prepare("SELECT cousin_connect_available, cousin_connect_interests, cousin_connect_since FROM users WHERE id = ?");
                $stmt->execute([$_SESSION['user_id']]);
                $status = $stmt->fetch();
                
                echo json_encode(['success' => true, 'status' => $status]);
                
            } elseif ($action === 'available_family') {
                // Get family members available for connection
                $stmt = $pdo->prepare("
                    SELECT id, display_name, email, cousin_connect_interests, cousin_connect_since 
                    FROM users 
                    WHERE cousin_connect_available = 1 AND id != ? 
                    ORDER BY cousin_connect_since DESC
                ");
                $stmt->execute([$_SESSION['user_id']]);
                $availableFamily = $stmt->fetchAll();
                
                echo json_encode(['success' => true, 'family' => $availableFamily]);
            }
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            
            if ($action === 'toggle_availability') {
                // Toggle user's availability for cousin connect
                $available = (bool)($input['available'] ?? false);
                $interests = sanitizeInput($input['interests'] ?? '');
                
                if ($available) {
                    // When setting available, set the timestamp
                    $stmt = $pdo->prepare("
                        UPDATE users 
                        SET cousin_connect_available = 1, 
                            cousin_connect_interests = ?, 
                            cousin_connect_since = NOW() 
                        WHERE id = ?
                    ");
                    $stmt->execute([$interests, $_SESSION['user_id']]);
                } else {
                    // When setting unavailable, clear the timestamp
                    $stmt = $pdo->prepare("
                        UPDATE users 
                        SET cousin_connect_available = 0, 
                            cousin_connect_interests = ?, 
                            cousin_connect_since = NULL 
                        WHERE id = ?
                    ");
                    $stmt->execute([$interests, $_SESSION['user_id']]);
                }
                
                // Verify the update worked
                $verifyStmt = $pdo->prepare("SELECT cousin_connect_available, cousin_connect_interests FROM users WHERE id = ?");
                $verifyStmt->execute([$_SESSION['user_id']]);
                $updatedStatus = $verifyStmt->fetch();
                
                echo json_encode([
                    'success' => true, 
                    'message' => $available ? 'You are now available for cousin connections!' : 'You are no longer available for connections',
                    'updated_status' => $updatedStatus
                ]);
            }
            break;
            
        default:
            throw new Exception('Method not allowed');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>