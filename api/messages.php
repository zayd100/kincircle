<?php
require_once __DIR__ . '/../config.php';
requireLogin();

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// Parse URL path for RESTful routes like /api/messages/4/replies
$requestUri = $_SERVER['REQUEST_URI'];
$pathPattern = '#/api/messages/(\d+)/replies#';
if (preg_match($pathPattern, $requestUri, $matches)) {
    $messageId = (int)$matches[1];

    // Get replies for a specific message
    try {
        $stmt = $pdo->prepare("
            SELECT mr.*, u.display_name as author_name
            FROM message_replies mr
            JOIN users u ON mr.posted_by = u.id
            WHERE mr.message_id = ?
            ORDER BY mr.created_at ASC
        ");
        $stmt->execute([$messageId]);
        $replies = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Transform for frontend
        foreach ($replies as &$reply) {
            $reply['author'] = [
                'name' => $reply['author_name'],
                'initials' => strtoupper(substr($reply['author_name'], 0, 2))
            ];
            $reply['createdAt'] = $reply['created_at'];
            $reply['isEdited'] = false; // Add support for edited flag later
        }

        echo json_encode(['success' => true, 'replies' => $replies]);
        exit;
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        exit;
    }
}

try {
    switch ($method) {
        case 'GET':
            if ($action === 'list') {
                // Get recent messages with author info
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
                
                echo json_encode(['success' => true, 'messages' => $messages]);
                
            } elseif ($action === 'threads') {
                // Get board threads (using messages table)
                $stmt = $pdo->prepare("
                    SELECT m.id, m.subject as title, m.content, m.created_at,
                           m.posted_by as user_id, u.display_name as author_name,
                           COUNT(DISTINCT mr.id) as reply_count,
                           MAX(mr.created_at) as last_reply_time,
                           0 as view_count, 0 as is_pinned, 0 as is_locked,
                           'general' as category
                    FROM messages m
                    LEFT JOIN users u ON m.posted_by = u.id
                    LEFT JOIN message_replies mr ON m.id = mr.message_id
                    WHERE m.is_active = 1
                    GROUP BY m.id
                    ORDER BY COALESCE(MAX(mr.created_at), m.created_at) DESC
                ");
                $stmt->execute();
                $threads = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Transform data for frontend compatibility
                foreach ($threads as &$thread) {
                    $thread['author'] = [
                        'name' => $thread['author_name'],
                        'initials' => strtoupper(substr($thread['author_name'], 0, 2))
                    ];
                    $thread['createdAt'] = $thread['created_at'];
                    $thread['lastActivity'] = $thread['last_reply_time'] ?: $thread['created_at'];
                    $thread['replyCount'] = (int)$thread['reply_count'];
                    $thread['viewCount'] = (int)$thread['view_count'];
                    $thread['isPinned'] = (bool)$thread['is_pinned'];
                    $thread['isLocked'] = (bool)$thread['is_locked'];
                }
                
                echo json_encode(['success' => true, 'threads' => $threads]);
                
            } elseif ($action === 'detail' && isset($_GET['id'])) {
                // Get message with replies
                $messageId = (int)$_GET['id'];
                
                $stmt = $pdo->prepare("
                    SELECT m.*, u.display_name as author_name 
                    FROM messages m 
                    JOIN users u ON m.posted_by = u.id 
                    WHERE m.id = ? AND m.is_active = 1
                ");
                $stmt->execute([$messageId]);
                $message = $stmt->fetch();
                
                if (!$message) {
                    throw new Exception('Message not found');
                }
                
                // Get replies
                $stmt = $pdo->prepare("
                    SELECT mr.*, u.display_name as author_name 
                    FROM message_replies mr 
                    JOIN users u ON mr.posted_by = u.id 
                    WHERE mr.message_id = ? 
                    ORDER BY mr.created_at ASC
                ");
                $stmt->execute([$messageId]);
                $replies = $stmt->fetchAll();
                
                $message['replies'] = $replies;
                echo json_encode(['success' => true, 'message' => $message]);
            }
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            
            if ($action === 'add') {
                // Add new message/board post
                $subject = sanitizeInput($input['subject'] ?? '');
                $content = sanitizeInput($input['content'] ?? '');
                $category = sanitizeInput($input['category'] ?? 'general');
                $isPinned = isset($input['is_pinned']) ? (int)$input['is_pinned'] : 0;

                if (!$subject || !$content) {
                    throw new Exception('Subject and content are required');
                }

                // Only admins can pin posts
                if ($isPinned && !isAdmin()) {
                    $isPinned = 0;
                }

                // Try to insert with new columns, fall back to basic insert if columns don't exist yet
                try {
                    $stmt = $pdo->prepare("
                        INSERT INTO messages (subject, content, posted_by, category, is_pinned)
                        VALUES (?, ?, ?, ?, ?)
                    ");
                    $stmt->execute([$subject, $content, $_SESSION['user_id'], $category, $isPinned]);
                } catch (PDOException $e) {
                    // If columns don't exist, use basic insert (backward compatibility)
                    if (strpos($e->getMessage(), 'Unknown column') !== false) {
                        $stmt = $pdo->prepare("
                            INSERT INTO messages (subject, content, posted_by)
                            VALUES (?, ?, ?)
                        ");
                        $stmt->execute([$subject, $content, $_SESSION['user_id']]);
                    } else {
                        throw $e;
                    }
                }

                echo json_encode(['success' => true, 'message' => 'Message posted successfully']);
                
            } elseif ($action === 'reply') {
                // Add reply to message
                $messageId = (int)($input['message_id'] ?? 0);
                $content = sanitizeInput($input['content'] ?? '');

                if (!$messageId || !$content) {
                    throw new Exception('Message ID and content are required');
                }

                $stmt = $pdo->prepare("
                    INSERT INTO message_replies (message_id, content, posted_by)
                    VALUES (?, ?, ?)
                ");
                $stmt->execute([$messageId, $content, $_SESSION['user_id']]);

                echo json_encode(['success' => true, 'message' => 'Reply posted successfully']);
            }
            break;

        case 'PUT':
        case 'PATCH':
            // Update message (pin, lock, etc.) - admin only
            if (!isAdmin()) {
                throw new Exception('Unauthorized');
            }

            $input = json_decode(file_get_contents('php://input'), true);
            $messageId = (int)($input['id'] ?? 0);

            if (!$messageId) {
                throw new Exception('Message ID is required');
            }

            if ($action === 'pin') {
                $isPinned = (int)($input['is_pinned'] ?? 0);
                // Try to update, fail gracefully if column doesn't exist
                try {
                    $stmt = $pdo->prepare("UPDATE messages SET is_pinned = ? WHERE id = ?");
                    $stmt->execute([$isPinned, $messageId]);
                    echo json_encode(['success' => true, 'message' => 'Thread ' . ($isPinned ? 'pinned' : 'unpinned')]);
                } catch (PDOException $e) {
                    if (strpos($e->getMessage(), 'Unknown column') !== false) {
                        echo json_encode(['success' => false, 'error' => 'Pin feature requires database migration']);
                    } else {
                        throw $e;
                    }
                }
            } elseif ($action === 'lock') {
                $isLocked = (int)($input['is_locked'] ?? 0);
                // Try to update, fail gracefully if column doesn't exist
                try {
                    $stmt = $pdo->prepare("UPDATE messages SET is_locked = ? WHERE id = ?");
                    $stmt->execute([$isLocked, $messageId]);
                    echo json_encode(['success' => true, 'message' => 'Thread ' . ($isLocked ? 'locked' : 'unlocked')]);
                } catch (PDOException $e) {
                    if (strpos($e->getMessage(), 'Unknown column') !== false) {
                        echo json_encode(['success' => false, 'error' => 'Lock feature requires database migration']);
                    } else {
                        throw $e;
                    }
                }
            } else {
                throw new Exception('Invalid action');
            }
            break;

        case 'DELETE':
            // Only admins can delete messages
            if (!isAdmin()) {
                throw new Exception('Unauthorized');
            }

            $input = json_decode(file_get_contents('php://input'), true);
            $messageId = (int)($input['id'] ?? $_GET['id'] ?? 0);

            if (!$messageId) {
                throw new Exception('Message ID is required');
            }

            // Soft delete - set is_active to 0
            $stmt = $pdo->prepare("UPDATE messages SET is_active = 0 WHERE id = ?");
            $stmt->execute([$messageId]);

            echo json_encode(['success' => true, 'message' => 'Thread deleted successfully']);
            break;
            
        default:
            throw new Exception('Method not allowed');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>