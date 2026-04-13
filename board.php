<?php
require_once "config.php";
requireLogin();

$displayName = $_SESSION['display_name'] ?? 'Family Member';
$userId = $_SESSION['user_id'] ?? null;
$isAdmin = isAdmin();

// Initialize data arrays
$threads = [];
$totalThreads = 0;
$totalReplies = 0;
$totalViews = 0;
$recentActivity = [];
$recentMessages = 0;
$activeContributors = 0;

// Fetch board data from database
try {
    // Get all threads with reply counts (using messages table) also i need comments so Changing the query.
    $stmt = $pdo->prepare("
    SELECT 
        m.id, 
        m.subject as title, 
        m.content, 
        m.created_at,
        m.posted_by as user_id, 
        u.display_name as author_name,

        COUNT(DISTINCT r.id) as reply_count,
        MAX(r.created_at) as last_reply_time,

        0 as view_count, 
        0 as is_pinned, 
        0 as is_locked,
        'general' as category,

        JSON_ARRAYAGG(
            JSON_OBJECT(
                'id', r.id,
                'content', r.content,
                'created_at', r.created_at,
                'author', u2.display_name
            )
        ) as replies

    FROM messages m
    LEFT JOIN users u ON m.posted_by = u.id
    LEFT JOIN message_replies r ON m.id = r.message_id
    LEFT JOIN users u2 ON r.posted_by = u2.id

    WHERE m.is_active = 1
    GROUP BY m.id
    ORDER BY COALESCE(MAX(r.created_at), m.created_at) DESC
");
    $stmt->execute();
    $threads = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get statistics
    $totalThreads = count($threads);

    $stmt = $pdo->prepare("SELECT COUNT(*) FROM message_replies");
    $stmt->execute();
    $totalReplies = $stmt->fetchColumn();

    // View count not tracked yet - set to 0
    $totalViews = 0;

    // Get recent activity
    $stmt = $pdo->prepare("
        SELECT 'thread' as type, m.id, m.subject as title, m.created_at, u.display_name
        FROM messages m
        JOIN users u ON m.posted_by = u.id
        WHERE m.is_active = 1
        ORDER BY m.created_at DESC
        LIMIT 5
    ");
    $stmt->execute();
    $recentActivity = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
} catch (PDOException $e) {
    // If tables don't exist yet, just use empty arrays
    error_log("Board data fetch error: " . $e->getMessage());
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Family Board - Reed & Weaver</title>
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/board.css">
</head>
<body>
    <!-- Header will be automatically inserted here by header.js -->

    <main class="main-content">
        <!-- Board Hero Section -->
        <section class="board-hero">
            <div class="hero-backdrop"></div>
            <div class="hero-content">
                <div class="hero-header">
                    <h1 class="hero-title">
                        <span class="title-icon">💬</span>
                        <span class="title-text">Family Board</span>
                    </h1>
                    <button class="hero-upload-btn" id="newThreadBtn">
                        <span class="upload-text">Start Conversation</span>
                    </button>
                </div>
            </div>
        </section>

        <!-- Board Controls Section -->
        <section class="board-controls">
            <div class="controls-container">
                <div class="filter-section">
                    <button class="filter-btn active" data-filter="all">
                        <span class="filter-icon">💭</span>
                        All Topics
                    </button>
                    <button class="filter-btn" data-filter="announcements">
                        <span class="filter-icon">📢</span>
                        Announcements
                    </button>
                    <button class="filter-btn" data-filter="events">
                        <span class="filter-icon">📅</span>
                        Events
                    </button>
                    <button class="filter-btn" data-filter="memories">
                        <span class="filter-icon">📸</span>
                        Memories
                    </button>
                    <button class="filter-btn" data-filter="questions">
                        <span class="filter-icon">❓</span>
                        Questions
                    </button>
                </div>
                
                <div class="search-section">
                    <input type="text" 
                           id="searchInput" 
                           class="board-search" 
                           placeholder="Search conversations, topics, or people...">
                    <button class="search-icon">🔍</button>
                </div>
            </div>
        </section>

        <div class="container">
            <!-- Loading State -->
            <div class="board-loading" id="boardLoading">
                <div class="loading-animation">
                    <div class="loading-bubble"></div>
                    <div class="loading-bubble"></div>
                    <div class="loading-bubble"></div>
                </div>
                <p class="loading-text">Loading family conversations...</p>
            </div>

            <!-- Message Threads Container -->
            <div class="board-container" id="boardContainer" style="display: none;">
                <div class="threads-list" id="threadsList">
                    <!-- Threads will be dynamically loaded here -->
                </div>
                
                <!-- Pagination -->
                <div class="board-pagination" id="boardPagination">
                    <!-- Pagination controls will be added dynamically -->
                </div>
            </div>
        </div>

    <!-- New Thread Modal -->
    <div class="modal" id="newThreadModal">
        <div class="modal-content new-thread-modal">
            <div class="modal-header">
                <h2>Start a New Conversation</h2>
                <button class="modal-close">&times;</button>
            </div>
            
            <form id="newThreadForm" class="thread-form">
                <div class="form-group">
                    <label for="threadTitle">Title</label>
                    <input type="text" 
                           id="threadTitle" 
                           name="threadTitle"
                           class="form-input" 
                           placeholder="What would you like to discuss?"
                           maxlength="200"
                           required>
                    <span class="char-count" id="titleCharCount">0/200</span>
                </div>

                <div class="form-group">
                    <fieldset class="category-fieldset">
                        <legend class="category-legend">Category</legend>
                        <div class="category-selector" role="radiogroup" aria-labelledby="category-legend">
                            <input type="radio" id="cat-announcements" name="threadCategory" value="announcements" class="category-radio sr-only">
                            <label for="cat-announcements" class="category-option" data-category="announcements">
                                <span class="category-emoji">📢</span>
                                <span>Announcement</span>
                            </label>
                            
                            <input type="radio" id="cat-events" name="threadCategory" value="events" class="category-radio sr-only">
                            <label for="cat-events" class="category-option" data-category="events">
                                <span class="category-emoji">📅</span>
                                <span>Event</span>
                            </label>
                            
                            <input type="radio" id="cat-memories" name="threadCategory" value="memories" class="category-radio sr-only">
                            <label for="cat-memories" class="category-option" data-category="memories">
                                <span class="category-emoji">📸</span>
                                <span>Memory</span>
                            </label>
                            
                            <input type="radio" id="cat-questions" name="threadCategory" value="questions" class="category-radio sr-only">
                            <label for="cat-questions" class="category-option" data-category="questions">
                                <span class="category-emoji">❓</span>
                                <span>Question</span>
                            </label>
                            
                            <input type="radio" id="cat-general" name="threadCategory" value="general" class="category-radio sr-only" checked>
                            <label for="cat-general" class="category-option active" data-category="general">
                                <span class="category-emoji">💭</span>
                                <span>General</span>
                            </label>
                        </div>
                    </fieldset>
                </div>

                <div class="form-group">
                    <label for="threadContent">Message</label>
                    <textarea id="threadContent" 
                              name="threadContent"
                              class="form-textarea" 
                              placeholder="Share your thoughts with the family..."
                              rows="6"
                              maxlength="5000"
                              required></textarea>
                    <span class="char-count" id="contentCharCount">0/5000</span>
                </div>

                <div class="form-group">
                    <label class="checkbox-label" for="threadPinned">
                        <input type="checkbox" id="threadPinned" name="threadPinned" class="form-checkbox">
                        <span>Pin this conversation (Admin only)</span>
                    </label>
                </div>

                <div class="form-actions">
                    <button type="submit" class="btn-primary">
                        <span class="btn-icon">🚀</span>
                        Post Conversation
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Thread Detail Modal -->
    <div class="modal" id="threadDetailModal">
        <div class="modal-content thread-detail-modal">
            <div id="threadDetailContent">
                <!-- Thread details and replies will be loaded here -->
            </div>
        </div>
    </div>

        </div>
    </main>

    <!-- Pass PHP data to JavaScript -->
    <script>
        window.boardData = {
            threads: <?= json_encode($threads) ?>,
            stats: {
                totalThreads: <?= json_encode($totalThreads) ?>,
                recentMessages: <?= json_encode($recentMessages) ?>,
                activeContributors: <?= json_encode($activeContributors) ?>
            },
            currentUser: {
                id: <?= json_encode($userId) ?>,
                displayName: <?= json_encode($displayName) ?>,
                isAdmin: <?= json_encode($isAdmin) ?>
            }
        };
        
        // Set global currentUser for header
        window.currentUser = {
            id: <?= json_encode($userId ?? $_SESSION['user_id'] ?? null) ?>,
            displayName: <?= json_encode($_SESSION['display_name'] ?? 'User') ?>,
            isAdmin: <?= json_encode($isAdmin) ?>
        };
    </script>
    <!-- Scripts -->
    <script src="js/header.js"></script>
    <script src="js/family-board.js"></script>
</body>
</html>