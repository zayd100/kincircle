<?php
require_once '../../config.php';
requireLogin();

header('Content-Type: application/json');

try {
    // Only admins can see admin message stats
    if (!isAdmin()) {
        echo json_encode(['success' => true, 'messages' => [], 'stats' => ['total' => 0]]);
        exit;
    }
    
    // Get message statistics for admin
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM messages WHERE is_active = 1");
    $totalMessages = $stmt->fetch()['total'];
    
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM message_replies");
    $totalReplies = $stmt->fetch()['total'];
    
    // Get recent messages
    $stmt = $pdo->prepare("
        SELECT m.*, u.display_name as author_name,
               COUNT(mr.id) as reply_count
        FROM messages m 
        JOIN users u ON m.posted_by = u.id 
        LEFT JOIN message_replies mr ON m.id = mr.message_id
        WHERE m.is_active = 1 
        GROUP BY m.id
        ORDER BY m.created_at DESC 
        LIMIT 10
    ");
    $stmt->execute();
    $messages = $stmt->fetchAll();
    
    echo json_encode([
        'success' => true, 
        'messages' => $messages,
        'stats' => [
            'total' => $totalMessages,
            'replies' => $totalReplies
        ]
    ]);
    
} catch (Exception $e) {
    echo json_encode(['success' => true, 'messages' => [], 'stats' => ['total' => 0]]);
}
?>