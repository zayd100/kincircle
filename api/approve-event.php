<?php
require_once '../config.php';
requireLogin();

// Only admins can approve events
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
    
    if (!$eventId) {
        throw new Exception('Event ID is required');
    }
    
    // Get the event submission
    $stmt = $pdo->prepare("
        SELECT * FROM event_submissions 
        WHERE id = ? AND status = 'pending'
    ");
    $stmt->execute([$eventId]);
    $submission = $stmt->fetch();
    
    if (!$submission) {
        throw new Exception('Event not found or already processed');
    }
    
    // Begin transaction
    $pdo->beginTransaction();
    
    try {
        // Move to calendar_events table
        $stmt = $pdo->prepare("
            INSERT INTO calendar_events (title, event_date, description, created_by)
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([
            $submission['title'],
            $submission['event_date'],
            $submission['description'],
            $submission['submitter_id']
        ]);
        
        $approvedEventId = $pdo->lastInsertId();
        
        // Update submission status
        $stmt = $pdo->prepare("
            UPDATE event_submissions 
            SET status = 'approved', reviewed_by = ?, reviewed_at = NOW(),
                approved_event_id = ?
            WHERE id = ?
        ");
        $stmt->execute([$_SESSION['user_id'], $approvedEventId, $eventId]);
        
        $pdo->commit();
        
        echo json_encode([
            'success' => true, 
            'message' => 'Event approved and added to calendar',
            'approved_event_id' => $approvedEventId
        ]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>