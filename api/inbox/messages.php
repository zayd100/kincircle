<?php
require_once '../../config.php';
requireLogin();

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$userId = $_SESSION['user_id'];

try {
    if ($method === 'GET') {
        // Get messages for a specific conversation
        $conversationId = (int)($_GET['conversation_id'] ?? 0);
        
        if (!$conversationId) {
            throw new Exception('Conversation ID required');
        }
        
        // Get messages between current user and the other user
        $stmt = $pdo->prepare("
            SELECT pm.*, 
                   u.display_name as sender_name
            FROM private_messages pm
            JOIN users u ON pm.sender_id = u.id
            WHERE (pm.sender_id = ? AND pm.recipient_id = ?) 
               OR (pm.sender_id = ? AND pm.recipient_id = ?)
            ORDER BY pm.created_at ASC
        ");
        
        $stmt->execute([$userId, $conversationId, $conversationId, $userId]);
        $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Mark messages as read
        $readStmt = $pdo->prepare("
            UPDATE private_messages 
            SET is_read = 1 
            WHERE sender_id = ? AND recipient_id = ? AND is_read = 0
        ");
        $readStmt->execute([$conversationId, $userId]);
        
        // Format messages for frontend
        $formattedMessages = [];
        foreach ($messages as $msg) {
            $formattedMessages[] = [
                'id' => $msg['id'],
                'content' => $msg['content'],
                'senderId' => $msg['sender_id'],
                'senderName' => $msg['sender_name'],
                'timestamp' => $msg['created_at'],
                'isRead' => (bool)$msg['is_read'],
                'isImportant' => (bool)($msg['is_important'] ?? false)
            ];
        }
        
        echo json_encode(['success' => true, 'messages' => $formattedMessages]);
        
    } else {
        throw new Exception('Method not allowed');
    }
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>