<?php
require_once '../../config.php';
requireLogin();

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $recipientId = (int)($input['recipientId'] ?? 0);
        $content = sanitizeInput($input['content'] ?? '');
        
        if (!$recipientId || !$content) {
            throw new Exception('Recipient ID and content are required');
        }
        
        // Check if recipient exists
        $recipientStmt = $pdo->prepare("SELECT display_name FROM users WHERE id = ?");
        $recipientStmt->execute([$recipientId]);
        $recipient = $recipientStmt->fetch();
        
        if (!$recipient) {
            throw new Exception('Recipient not found');
        }
        
        // Insert quick message
        $stmt = $pdo->prepare("
            INSERT INTO private_messages (sender_id, recipient_id, content, created_at) 
            VALUES (?, ?, ?, NOW())
        ");
        
        $stmt->execute([
            $_SESSION['user_id'],
            $recipientId,
            $content
        ]);
        
        $messageId = $pdo->lastInsertId();
        
        echo json_encode([
            'success' => true, 
            'messageId' => $messageId,
            'message' => "Quick message sent to {$recipient['display_name']}"
        ]);
        
    } else {
        throw new Exception('Method not allowed');
    }
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>