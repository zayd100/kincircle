<?php
require_once '../config.php';
requireLogin();

header('Content-Type: application/json');

$action = $_GET['action'] ?? 'status';

try {
    switch ($action) {
        case 'status':
            // Return current user status
            echo json_encode([
                'success' => true,
                'user_id' => $_SESSION['user_id'],
                'username' => $_SESSION['username'] ?? '',
                'display_name' => $_SESSION['display_name'] ?? '',
                'is_admin' => isAdmin(),
                'logged_in' => true
            ]);
            break;
            
        default:
            throw new Exception('Invalid action');
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>