<?php
require_once "config.php";
requireLogin();

// Admin-only access
if (!isAdmin()) {
    header('Location: index.php');
    exit;
}

// Get admin statistics from database
try {
    // Pending users count
    $pendingUsersStmt = $pdo->prepare("SELECT COUNT(*) as count FROM pending_users WHERE status = 'pending'");
    $pendingUsersStmt->execute();
    $pendingUsersCount = $pendingUsersStmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    // Pending photos count (images only)
    $pendingPhotosStmt = $pdo->prepare("
        SELECT COUNT(*) as count FROM photo_submissions
        WHERE status = 'pending'
        AND (mime_type LIKE 'image/%' OR file_type LIKE 'image/%')
    ");
    $pendingPhotosStmt->execute();
    $pendingPhotosCount = $pendingPhotosStmt->fetch(PDO::FETCH_ASSOC)['count'];

    // Pending media count (non-images)
    $pendingMediaStmt = $pdo->prepare("
        SELECT COUNT(*) as count FROM photo_submissions
        WHERE status = 'pending'
        AND (mime_type NOT LIKE 'image/%' OR file_type NOT LIKE 'image/%')
    ");
    $pendingMediaStmt->execute();
    $pendingMediaCount = $pendingMediaStmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    // Reported content count (messages, photos, etc.)
    $reportedContentStmt = $pdo->prepare("
        SELECT COUNT(*) as count FROM (
            SELECT id FROM messages WHERE flagged = 1 AND flagged_reviewed = 0
            UNION ALL
            SELECT id FROM photo_submissions WHERE flagged = 1 AND flagged_reviewed = 0
        ) as reported
    ");
    $reportedContentStmt->execute();
    $reportedContentCount = $reportedContentStmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    // Pending events count
    $pendingEventsStmt = $pdo->prepare("SELECT COUNT(*) as count FROM calendar_events WHERE status = 'pending'");
    $pendingEventsStmt->execute();
    $pendingEventsCount = $pendingEventsStmt->fetch(PDO::FETCH_ASSOC)['count'];

    // Pending memorials count
    $pendingMemorialsStmt = $pdo->prepare("SELECT COUNT(*) as count FROM memorial_submissions WHERE status = 'pending'");
    $pendingMemorialsStmt->execute();
    $pendingMemorialsCount = $pendingMemorialsStmt->fetch(PDO::FETCH_ASSOC)['count'];

} catch (PDOException $e) {
    // Default values if database not connected or tables don't exist
    $pendingUsersCount = 0;
    $pendingPhotosCount = 0;
    $pendingMediaCount = 0;
    $reportedContentCount = 0;
    $pendingEventsCount = 0;
    $pendingMemorialsCount = 0;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - Reed & Weaver</title>
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/admin.css">
    <link rel="stylesheet" href="css/events-admin.css">
</head>
<body>
    <!-- Header will be automatically inserted here by header.js -->

    <main class="main-content">
        <div class="admin-container">
            <header class="admin-header">
                <h1>🛠️ Admin Dashboard</h1>
                <p>Moderate family content and manage the site</p>
            </header>

            <!-- Moderation Stats - Things that need attention -->
            <div class="moderation-stats" id="adminStats">
                <div class="stat-card pending" onclick="adminCore && adminCore.switchModule('photos')" style="cursor: pointer;">
                    <div class="stat-number"><?= $pendingPhotosCount ?></div>
                    <div class="stat-label">Pending Photos</div>
                </div>
                <div class="stat-card media" onclick="adminCore && adminCore.switchModule('media')" style="cursor: pointer;">
                    <div class="stat-number"><?= $pendingMediaCount ?></div>
                    <div class="stat-label">Pending Media</div>
                </div>
                <div class="stat-card memorials">
                    <div class="stat-number"><?= $pendingMemorialsCount ?></div>
                    <div class="stat-label">Pending Memorials</div>
                </div>
                <div class="stat-card reports" style="cursor: pointer;">
                    <div class="stat-number"><?= $reportedContentCount ?></div>
                    <div class="stat-label">Reported Content</div>
                </div>
                <div class="stat-card users" style="cursor: pointer;">
                    <div class="stat-number"><?= $pendingUsersCount ?></div>
                    <div class="stat-label">New Users</div>
                </div>
                <div class="stat-card events" style="cursor: pointer;">
                    <div class="stat-number"><?= $pendingEventsCount ?></div>
                    <div class="stat-label">Pending Events</div>
                </div>
            </div>

            <!-- Admin Module Navigation and Content -->
            <div class="admin-modules" id="adminModules">
                <!-- Admin modules will be loaded here -->
            </div>
        </div>
    </main>

    <!-- Pass PHP data to JavaScript -->
    <script>
        // Set current user for header
        window.currentUser = {
            id: <?= json_encode($_SESSION['user_id'] ?? null) ?>,
            displayName: <?= json_encode($_SESSION['display_name'] ?? 'Admin') ?>,
            isAdmin: true
        };
        
        window.adminStats = {
            pendingPhotos: <?= json_encode($pendingPhotosCount) ?>,
            reportedContent: <?= json_encode($reportedContentCount) ?>,
            newUsers: <?= json_encode($pendingUsersCount) ?>,
            pendingEvents: <?= json_encode($pendingEventsCount) ?>
        };
    </script>

    <script src="js/header.js"></script>
    <script src="js/admin-core.js"></script>
</body>
</html>