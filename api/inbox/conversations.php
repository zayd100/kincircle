<?php
require_once '../../config.php';
requireLogin();

header('Content-Type: application/json');

try {
    // Get user's conversations
    $stmt = $pdo->prepare("
        SELECT DISTINCT 
            CASE 
                WHEN pm.sender_id = ? THEN pm.recipient_id
                ELSE pm.sender_id
            END as other_user_id,
            u.display_name as other_user_name,
            MAX(pm.created_at) as last_message_time,
            COUNT(*) as total_messages,
            SUM(CASE WHEN pm.recipient_id = ? AND pm.is_read = 0 THEN 1 ELSE 0 END) as unread_count,
            (SELECT content FROM private_messages pm2 
             WHERE (pm2.sender_id = ? AND pm2.recipient_id = other_user_id) 
                OR (pm2.sender_id = other_user_id AND pm2.recipient_id = ?) 
             ORDER BY pm2.created_at DESC LIMIT 1) as last_message
        FROM private_messages pm
        JOIN users u ON u.id = CASE 
            WHEN pm.sender_id = ? THEN pm.recipient_id
            ELSE pm.sender_id
        END
        WHERE pm.sender_id = ? OR pm.recipient_id = ?
        GROUP BY other_user_id, other_user_name
        ORDER BY last_message_time DESC
    ");
    
    $userId = $_SESSION['user_id'];
    $stmt->execute([$userId, $userId, $userId, $userId, $userId, $userId, $userId]);
    $conversations = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Transform data for frontend
    $formattedConversations = [];
    foreach ($conversations as $conv) {
        $formattedConversations[] = [
            'id' => $conv['other_user_id'],
            'type' => 'direct',
            'name' => $conv['other_user_name'],
            'participants' => [
                ['id' => $conv['other_user_id'], 'name' => $conv['other_user_name']]
            ],
            'lastMessage' => [
                'content' => $conv['last_message'] ?? '',
                'timestamp' => $conv['last_message_time'],
                'senderId' => null // We'd need another query to get this
            ],
            'unreadCount' => (int)$conv['unread_count'],
            'totalMessages' => (int)$conv['total_messages']
        ];
    }
    
    echo json_encode(['success' => true, 'conversations' => $formattedConversations]);
    
} catch (Exception $e) {
    echo json_encode(['success' => true, 'conversations' => []]);
}
?>