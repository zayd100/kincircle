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
    
    // Reported content count - feature not yet implemented (flagged columns don't exist)
    // TODO: Add flagged/flagged_reviewed columns to messages and photo_submissions tables when implementing reporting
    $reportedContentCount = 0;

    // Pending events count (from event_submissions, not calendar_events)
    $pendingEventsStmt = $pdo->prepare("SELECT COUNT(*) as count FROM event_submissions WHERE status = 'pending'");
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
                <div class="stat-card pending" onclick="switchToPhotosAndRefresh()" style="cursor: pointer;">
                    <div class="stat-number"><?= $pendingPhotosCount ?></div>
                    <div class="stat-label">Pending Photos</div>
                </div>
                <div class="stat-card media" onclick="switchToMediaAndRefresh()" style="cursor: pointer;">
                    <div class="stat-number"><?= $pendingMediaCount ?></div>
                    <div class="stat-label">Pending Media</div>
                </div>
                <div class="stat-card memorials" style="cursor: pointer;">
                    <div class="stat-number"><?= $pendingMemorialsCount ?></div>
                    <div class="stat-label">Pending Memorials</div>
                </div>
                <div class="stat-card reports" onclick="adminCore && adminCore.switchModule('messages')" style="cursor: pointer;">
                    <div class="stat-number"><?= $reportedContentCount ?></div>
                    <div class="stat-label">Reported Content</div>
                </div>
                <div class="stat-card users" onclick="adminCore && adminCore.switchModule('users')" style="cursor: pointer;">
                    <div class="stat-number"><?= $pendingUsersCount ?></div>
                    <div class="stat-label">New Users</div>
                </div>
                <div class="stat-card events" onclick="adminCore && adminCore.switchModule('events')" style="cursor: pointer;">
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
    <script>
        // Helper functions for stat card clicks - switch module and force refresh
        async function switchToPhotosAndRefresh() {
            if (adminCore) {
                await adminCore.switchModule('photos');
                // Force refresh after switching
                if (typeof photosAdmin !== 'undefined') {
                    photosAdmin.dataLoaded = false;
                    await photosAdmin.loadDashboardData();
                    photosAdmin.dataLoaded = true;
                    photosAdmin.renderPendingPhotos();
                }
            }
        }

        async function switchToMediaAndRefresh() {
            if (adminCore) {
                await adminCore.switchModule('media');
                // Force refresh after switching
                if (typeof mediaAdmin !== 'undefined' && mediaAdmin.refresh) {
                    mediaAdmin.refresh();
                }
            }
        }
    </script>
</body>
</html>