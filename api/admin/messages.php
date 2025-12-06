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
    
    // Get recent messages/board threads for admin
    $stmt = $pdo->prepare("
        SELECT m.id, m.subject as title, m.content, m.created_at,
               m.posted_by as user_id, u.display_name as author_name,
               COUNT(DISTINCT mr.id) as reply_count,
               'active' as status, 0 as report_count,
               'general' as category, 0 as is_pinned, 0 as is_locked
        FROM messages m
        JOIN users u ON m.posted_by = u.id
        LEFT JOIN message_replies mr ON m.id = mr.message_id
        WHERE m.is_active = 1
        GROUP BY m.id
        ORDER BY m.created_at DESC
    ");
    $stmt->execute();
    $threads = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Transform data to match admin expectations
    foreach ($threads as &$thread) {
        $thread['author'] = [
            'name' => $thread['author_name'],
            'id' => $thread['user_id']
        ];
        $thread['isPinned'] = (bool)$thread['is_pinned'];
        $thread['isLocked'] = (bool)$thread['is_locked'];
        $thread['replyCount'] = (int)$thread['reply_count'];
        $thread['reportCount'] = (int)$thread['report_count'];
        $thread['createdAt'] = $thread['created_at'];
    }

    echo json_encode([
        'success' => true,
        'boardThreads' => $threads,  // Changed from 'messages' to 'boardThreads'
        'reportedMessages' => [],     // No reported messages yet
        'stats' => [
            'total' => $totalMessages,
            'replies' => $totalReplies
        ]
    ]);
    
} catch (Exception $e) {
    echo json_encode(['success' => true, 'messages' => [], 'stats' => ['total' => 0]]);
}
?>