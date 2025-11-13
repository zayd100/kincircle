<?php
require_once __DIR__ . '/../config.php';
requireLogin();

// DEPRECATED: This API endpoint is deprecated in favor of the unified admin system
// Users should be managed through admin-unified.php to prevent dual execution issues
error_log("WARNING: Deprecated API users endpoint accessed. Use admin-unified.php instead.");

// Temporary disable approval actions to prevent conflicts
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $actionType = $input['action'] ?? '';
    
    if ($actionType === 'approve_user' || $actionType === 'reject_user') {
        http_response_code(410);
        echo json_encode([
            'success' => false, 
            'error' => 'This endpoint is deprecated. Please use the unified admin interface.',
            'redirect' => '/admin-unified.php'
        ]);
        exit;
    }
}

// Check if this is a family members request (anyone can access)
if (isset($_GET['family'])) {
    // Family members endpoint - anyone can access
    header('Content-Type: application/json');
    
    try {
        $stmt = $pdo->prepare("SELECT id, username, display_name, last_login FROM users ORDER BY display_name");
        $stmt->execute();
        $members = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'members' => $members]);
    } catch (Exception $e) {
        echo json_encode(['success' => true, 'members' => []]);
    }
    exit;
}

// Check if this is a directory request (family members can access)
$action = $_GET['action'] ?? '';
if ($action === 'directory') {
    // Directory access handled within the action logic
} else {
    // Only admins can manage users for other operations
    if (!isAdmin()) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Access denied']);
        exit;
    }
}

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    switch ($method) {
        case 'GET':
            if ($action === 'pending') {
                // Get pending user registrations
                $stmt = $pdo->prepare("
                    SELECT id, username, display_name, email, phone, 
                           family_connection, relationship_note, created_at, status
                    FROM pending_users 
                    WHERE status = 'pending'
                    ORDER BY created_at DESC
                ");
                $stmt->execute();
                $users = $stmt->fetchAll();
                
                echo json_encode(['success' => true, 'users' => $users]);
                
            } elseif ($action === 'active') {
                // Get active users
                $stmt = $pdo->prepare("
                    SELECT id, username, display_name, email, phone, is_admin,
                           created_at, last_login, cousin_connect_available, 
                           cousin_connect_interests, cousin_connect_since
                    FROM users 
                    ORDER BY created_at DESC
                ");
                $stmt->execute();
                $users = $stmt->fetchAll();
                
                echo json_encode(['success' => true, 'users' => $users]);
                
            } elseif ($action === 'directory') {
                // Get users for directory with privacy tiers
                $currentUserId = $_SESSION['user_id'] ?? null;
                $isLoggedIn = !empty($currentUserId);
                
                if ($isLoggedIn) {
                    // Logged in users see full contact info
                    $stmt = $pdo->prepare("
                        SELECT id, display_name, email, phone, 
                               cousin_connect_available, cousin_connect_interests,
                               cousin_connect_since, created_at, last_login
                        FROM users 
                        WHERE id != ?
                        ORDER BY display_name ASC
                    ");
                    $stmt->execute([$currentUserId]);
                } else {
                    // Guests only see names and cousin connect emails
                    $stmt = $pdo->prepare("
                        SELECT id, display_name, 
                               CASE WHEN cousin_connect_available = 1 THEN email ELSE NULL END as email,
                               cousin_connect_available, cousin_connect_interests,
                               cousin_connect_since
                        FROM users 
                        ORDER BY display_name ASC
                    ");
                    $stmt->execute();
                }
                
                $users = $stmt->fetchAll();
                
                echo json_encode([
                    'success' => true, 
                    'users' => $users,
                    'privacy_level' => $isLoggedIn ? 'family' : 'guest'
                ]);
            }
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            $actionType = $input['action'] ?? '';
            
            if ($actionType === 'approve_user') {
                $userId = (int)($input['user_id'] ?? 0);
                
                // Get pending user data
                $stmt = $pdo->prepare("SELECT * FROM pending_users WHERE id = ? AND status = 'pending'");
                $stmt->execute([$userId]);
                $pendingUser = $stmt->fetch();
                
                if (!$pendingUser) {
                    throw new Exception('User not found or already processed');
                }
                
                // Begin transaction
                $pdo->beginTransaction();
                
                try {
                    // Create user account with all required fields
                    $stmt = $pdo->prepare("
                        INSERT INTO users (username, password_hash, display_name, email, phone, birthday, password_type, created_at) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
                    ");
                    $stmt->execute([
                        $pendingUser['username'],
                        $pendingUser['password_hash'],
                        $pendingUser['display_name'],
                        $pendingUser['email'],
                        $pendingUser['phone'],
                        $pendingUser['birthday'],
                        $pendingUser['password_type'] ?? 'three_field'
                    ]);
                    
                    $newUserId = $pdo->lastInsertId();
                    
                    // Update pending user record
                    $stmt = $pdo->prepare("
                        UPDATE pending_users 
                        SET status = 'approved', reviewed_by = ?, reviewed_at = NOW(),
                            admin_notes = 'Auto-approved via admin panel'
                        WHERE id = ?
                    ");
                    $stmt->execute([$_SESSION['user_id'], $userId]);
                    
                    $pdo->commit();
                    
                    echo json_encode([
                        'success' => true, 
                        'message' => 'User approved successfully',
                        'new_user_id' => $newUserId
                    ]);
                    
                } catch (Exception $e) {
                    $pdo->rollBack();
                    throw $e;
                }
                
            } elseif ($actionType === 'reject_user') {
                $userId = (int)($input['user_id'] ?? 0);
                $reason = sanitizeInput($input['reason'] ?? '');
                
                $stmt = $pdo->prepare("
                    UPDATE pending_users 
                    SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW(),
                        admin_notes = ?
                    WHERE id = ? AND status = 'pending'
                ");
                $stmt->execute([$_SESSION['user_id'], $reason, $userId]);
                
                if ($stmt->rowCount() > 0) {
                    echo json_encode(['success' => true, 'message' => 'User rejected successfully']);
                } else {
                    throw new Exception('User not found or already processed');
                }
                
            } elseif ($actionType === 'update_profile') {
                $userId = (int)($input['user_id'] ?? 0);
                $removeFromDirectory = (bool)($input['remove_from_directory'] ?? false);
                
                // Users can only update their own profile (unless admin)
                if ($userId !== $_SESSION['user_id'] && !isAdmin()) {
                    throw new Exception('Permission denied');
                }
                
                if ($removeFromDirectory) {
                    // User requested removal from directory
                    $stmt = $pdo->prepare("
                        UPDATE users 
                        SET cousin_connect_available = 0, 
                            cousin_connect_interests = NULL,
                            cousin_connect_since = NULL
                        WHERE id = ?
                    ");
                    $stmt->execute([$userId]);
                }
                
                echo json_encode(['success' => true, 'message' => 'Profile updated successfully']);
                
            } else {
                throw new Exception('Invalid action');
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