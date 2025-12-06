<?php
require_once '../../config.php';
requireLogin();

header('Content-Type: application/json');

try {
    $userId = $_SESSION['user_id'];

    // Get user's conversations - simplified query without problematic subquery
    $stmt = $pdo->prepare("
        SELECT
            CASE
                WHEN pm.sender_id = ? THEN pm.recipient_id
                ELSE pm.sender_id
            END as other_user_id,
            u.display_name as other_user_name,
            MAX(pm.created_at) as last_message_time,
            COUNT(*) as total_messages,
            SUM(CASE WHEN pm.recipient_id = ? AND pm.is_read = 0 THEN 1 ELSE 0 END) as unread_count
        FROM private_messages pm
        JOIN users u ON u.id = CASE
            WHEN pm.sender_id = ? THEN pm.recipient_id
            ELSE pm.sender_id
        END
        WHERE pm.sender_id = ? OR pm.recipient_id = ?
        GROUP BY other_user_id, other_user_name
        ORDER BY last_message_time DESC
    ");

    $stmt->execute([$userId, $userId, $userId, $userId, $userId]);
    $conversations = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Transform data for frontend and fetch last message separately
    $formattedConversations = [];

    // Prepare statement for fetching last message
    $lastMsgStmt = $pdo->prepare("
        SELECT content, sender_id
        FROM private_messages
        WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
        ORDER BY created_at DESC
        LIMIT 1
    ");

    foreach ($conversations as $conv) {
        $otherUserId = $conv['other_user_id'];

        // Fetch last message for this conversation
        $lastMsgStmt->execute([$userId, $otherUserId, $otherUserId, $userId]);
        $lastMsg = $lastMsgStmt->fetch(PDO::FETCH_ASSOC);

        $formattedConversations[] = [
            'id' => $otherUserId,
            'type' => 'direct',
            'name' => $conv['other_user_name'],
            'participants' => [
                ['id' => $otherUserId, 'name' => $conv['other_user_name']]
            ],
            'lastMessage' => [
                'content' => $lastMsg['content'] ?? '',
                'timestamp' => $conv['last_message_time'],
                'senderId' => $lastMsg['sender_id'] ?? null
            ],
            'unreadCount' => (int)$conv['unread_count'],
            'totalMessages' => (int)$conv['total_messages']
        ];
    }

    echo json_encode(['success' => true, 'conversations' => $formattedConversations]);

} catch (Exception $e) {
    error_log("Inbox conversations error: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Failed to load conversations', 'debug' => $e->getMessage()]);
}
?>