<?php
require_once '../../config.php';
requireLogin();

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $recipients = $input['recipients'] ?? [];
        $subject = sanitizeInput($input['subject'] ?? '');
        $content = sanitizeInput($input['content'] ?? '');
        $isImportant = (bool)($input['isImportant'] ?? false);
        
        if (empty($recipients) || !$content) {
            throw new Exception('Recipients and content are required');
        }
        
        $senderId = $_SESSION['user_id'];
        $messagesSent = 0;
        
        // Send message to each recipient
        $stmt = $pdo->prepare("
            INSERT INTO private_messages (sender_id, recipient_id, subject, content, is_important, created_at) 
            VALUES (?, ?, ?, ?, ?, NOW())
        ");
        
        foreach ($recipients as $recipientId) {
            $recipientId = (int)$recipientId;
            
            // Verify recipient exists
            $recipientStmt = $pdo->prepare("SELECT id FROM users WHERE id = ?");
            $recipientStmt->execute([$recipientId]);
            
            if ($recipientStmt->fetch()) {
                $stmt->execute([
                    $senderId,
                    $recipientId,
                    $subject,
                    $content,
                    $isImportant ? 1 : 0
                ]);
                $messagesSent++;
            }
        }
        
        echo json_encode([
            'success' => true, 
            'messagesSent' => $messagesSent,
            'message' => "Message sent to {$messagesSent} recipients"
        ]);
        
    } else {
        throw new Exception('Method not allowed');
    }
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>