<?php
require_once "config.php";
requireLogin();

$userId = $_SESSION['user_id'] ?? null;
$displayName = $_SESSION['display_name'] ?? 'Family Member';
$isAdmin = isAdmin();

// Fetch private messages from database
try {
    // Get user's private message conversations
    $stmt = $pdo->prepare("
        SELECT DISTINCT 
            CASE 
                WHEN pm.sender_id = ? THEN pm.recipient_id
                ELSE pm.sender_id
            END as other_user_id,
            u.display_name as other_user_name,
            MAX(pm.created_at) as last_message_time,
            COUNT(*) as message_count,
            SUM(CASE WHEN pm.recipient_id = ? AND pm.is_read = 0 THEN 1 ELSE 0 END) as unread_count
        FROM private_messages pm
        JOIN users u ON u.id = CASE WHEN pm.sender_id = ? THEN pm.recipient_id ELSE pm.sender_id END
        WHERE pm.sender_id = ? OR pm.recipient_id = ?
        GROUP BY other_user_id, other_user_name
        ORDER BY last_message_time DESC
    ");
    $stmt->execute([$userId, $userId, $userId, $userId, $userId]);
    $conversations = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get total unread count
    $unreadStmt = $pdo->prepare("
        SELECT COUNT(*) as count 
        FROM private_messages 
        WHERE recipient_id = ? AND is_read = 0
    ");
    $unreadStmt->execute([$userId]);
    $totalUnread = $unreadStmt->fetch(PDO::FETCH_ASSOC)['count'];
    
} catch (PDOException $e) {
    $conversations = [];
    $totalUnread = 0;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Family Inbox - Reed & Weaver</title>
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/inbox.css">
</head>
<body>
    <!-- Header will be automatically inserted here by header.js -->

    <main class="main-content">
        <!-- Inbox Container -->
        <div class="inbox-container">
        <!-- Sidebar -->
        <div class="inbox-sidebar">
            <div class="inbox-header">
                <h1 class="inbox-title">
                    <span class="inbox-icon">💬</span>
                    Messages
                </h1>
                <button class="compose-btn" id="composeBtn">
                    <span class="compose-icon">✨</span>
                    New Message
                </button>
            </div>

            <!-- Search -->
            <div class="sidebar-search">
                <input type="text" 
                       id="messageSearch" 
                       class="search-input" 
                       placeholder="Search conversations...">
                <span class="search-icon">🔍</span>
            </div>

            <!-- Filter Tabs -->
            <div class="filter-tabs">
                <button class="filter-tab active" data-filter="all">
                    <span class="tab-icon">📨</span>
                    <span class="tab-label">All Messages</span>
                    <span class="tab-count" id="allCount">5</span>
                </button>
                <button class="filter-tab" data-filter="unread">
                    <span class="tab-icon">🆕</span>
                    <span class="tab-label">Unread</span>
                    <span class="tab-count" id="unreadCount">3</span>
                </button>
                <button class="filter-tab" data-filter="starred">
                    <span class="tab-icon">⭐</span>
                    <span class="tab-label">Starred</span>
                    <span class="tab-count" id="starredCount">2</span>
                </button>
            </div>

            <!-- Conversation List -->
            <div class="conversations-list" id="conversationsList">
                <!-- Conversations will be loaded here -->
            </div>
        </div>

        <!-- Main Chat Area -->
        <div class="chat-area" id="chatArea">
            <div class="chat-welcome">
                <div class="welcome-content">
                    <div class="welcome-icon">💝</div>
                    <h2>Welcome to Your Family Inbox</h2>
                    <p>Stay connected with private conversations</p>
                    <p class="welcome-subtitle">Select a conversation or start a new message</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Compose Modal -->
    <div class="modal" id="composeModal">
        <div class="modal-content compose-modal">
            <div class="modal-header">
                <h2>New Message</h2>
                <button class="modal-close" onclick="closeComposeModal()">&times;</button>
            </div>
            
            <form id="composeForm" class="compose-form">
                <div class="recipient-section">
                    <label for="recipientSelect">To:</label>
                    <div class="recipient-input-container">
                        <input type="text" 
                               id="recipientInput" 
                               class="recipient-input" 
                               placeholder="Start typing family member's name...">
                        <div class="recipient-suggestions" id="recipientSuggestions">
                            <!-- Suggestions will appear here -->
                        </div>
                    </div>
                    <div class="selected-recipients" id="selectedRecipients">
                        <!-- Selected recipients will appear here -->
                    </div>
                </div>

                <div class="form-group">
                    <label for="messageSubject">Subject (optional)</label>
                    <input type="text" 
                           id="messageSubject" 
                           class="form-input" 
                           placeholder="What's this about?">
                </div>

                <div class="form-group">
                    <label for="messageContent">Message</label>
                    <textarea id="messageContent" 
                              class="form-textarea" 
                              placeholder="Type your message here..."
                              rows="8"
                              required></textarea>
                </div>

                <div class="compose-options">
                    <label class="option-label">
                        <input type="checkbox" id="markImportant" class="option-checkbox">
                        <span>Mark as important</span>
                    </label>
                    <label class="option-label">
                        <input type="checkbox" id="requestReadReceipt" class="option-checkbox">
                        <span>Request read receipt</span>
                    </label>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="closeComposeModal()">Cancel</button>
                    <button type="submit" class="btn-primary">
                        <span class="btn-icon">📤</span>
                        Send Message
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Quick Contact Modal -->
    <div class="modal" id="quickContactModal">
        <div class="modal-content quick-contact-modal">
            <div class="modal-header">
                <h2>Send Quick Message</h2>
                <button class="modal-close" onclick="closeQuickContactModal()">&times;</button>
            </div>
            
            <div class="quick-contact-info" id="quickContactInfo">
                <!-- Recipient info will be loaded here -->
            </div>
            
            <form id="quickContactForm" class="quick-contact-form">
                <div class="form-group">
                    <textarea id="quickMessage" 
                              class="form-textarea" 
                              placeholder="Send a quick message..."
                              rows="4"
                              required></textarea>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="closeQuickContactModal()">Cancel</button>
                    <button type="submit" class="btn-primary">
                        <span class="btn-icon">💨</span>
                        Send Quick Message
                    </button>
                </div>
            </form>
        </div>
        </div>
    </main>

    <!-- Pass PHP data to JavaScript -->
    <script>
        window.inboxData = {
            conversations: <?= json_encode($conversations) ?>,
            totalUnread: <?= json_encode($totalUnread) ?>,
            currentUser: {
                id: <?= json_encode($userId) ?>,
                name: <?= json_encode($displayName) ?>
            }
        };
    </script>
    <!-- Scripts -->
    <script>
        window.currentUser = {
            id: <?= json_encode($userId ?? $_SESSION['user_id'] ?? null) ?>,
            displayName: <?= json_encode($_SESSION['display_name'] ?? 'User') ?>,
            isAdmin: <?= json_encode($isAdmin) ?>
        };
    </script>
    <script src="js/header.js"></script>
    <script src="js/family-inbox.js"></script>
</body>
</html>