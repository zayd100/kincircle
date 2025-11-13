<?php
require_once '../config.php';
requireLogin();

// Only admins can reject events
if (!isAdmin()) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Access denied']);
    exit;
}

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $eventId = (int)($input['event_id'] ?? 0);
    $reason = sanitizeInput($input['reason'] ?? '');
    
    if (!$eventId) {
        throw new Exception('Event ID is required');
    }
    
    // Update submission status
    $stmt = $pdo->prepare("
        UPDATE event_submissions 
        SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW(),
            admin_notes = ?
        WHERE id = ? AND status = 'pending'
    ");
    $stmt->execute([$_SESSION['user_id'], $reason, $eventId]);
    
    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Event rejected successfully']);
    } else {
        throw new Exception('Event not found or already processed');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>