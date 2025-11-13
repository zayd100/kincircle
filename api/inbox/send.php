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
        $isImportant = (bool)($input['isImportant'] ?? false);
        
        if (!$recipientId || !$content) {
            throw new Exception('Recipient ID and content are required');
        }
        
        // Check if recipient exists
        $recipientStmt = $pdo->prepare("SELECT id FROM users WHERE id = ?");
        $recipientStmt->execute([$recipientId]);
        if (!$recipientStmt->fetch()) {
            throw new Exception('Recipient not found');
        }
        
        // Insert message
        $stmt = $pdo->prepare("
            INSERT INTO private_messages (sender_id, recipient_id, content, is_important, created_at) 
            VALUES (?, ?, ?, ?, NOW())
        ");
        
        $stmt->execute([
            $_SESSION['user_id'],
            $recipientId,
            $content,
            $isImportant ? 1 : 0
        ]);
        
        $messageId = $pdo->lastInsertId();
        
        echo json_encode([
            'success' => true, 
            'messageId' => $messageId,
            'message' => 'Message sent successfully'
        ]);
        
    } else {
        throw new Exception('Method not allowed');
    }
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>