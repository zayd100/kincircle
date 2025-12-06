<?php
require_once "config.php";
requireLogin();

// Get user admin status
$isAdmin = isAdmin();

// Fetch approved photos and albums from database
try {
    // Get all approved photos with their album information
    $stmt = $pdo->prepare("
        SELECT p.*, a.display_name as album_name, a.description as album_description
        FROM photo_submissions p
        LEFT JOIN albums a ON p.final_album = a.folder_name
        WHERE p.status = 'approved'
        ORDER BY p.date_taken DESC
    ");
    $stmt->execute();
    $photos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get album statistics
    $albumStmt = $pdo->prepare("
        SELECT final_album, COUNT(*) as photo_count,
               MIN(date_taken) as earliest_date,
               MAX(date_taken) as latest_date
        FROM photo_submissions
        WHERE status = 'approved' AND final_album IS NOT NULL
        GROUP BY final_album
    ");
    $albumStmt->execute();
    $albumStats = $albumStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get unique people tags
    $peopleStmt = $pdo->prepare("
        SELECT DISTINCT pt.person_name, COUNT(pt.photo_id) as photo_count
        FROM photo_tags pt
        JOIN photo_submissions p ON pt.photo_id = p.id
        WHERE p.status = 'approved'
        GROUP BY pt.person_name
        ORDER BY photo_count DESC
    ");
    $peopleStmt->execute();
    $peopleTags = $peopleStmt->fetchAll(PDO::FETCH_ASSOC);

    if ($isAdmin) {
        // Get pending photo count for admin bar
        $pendingStmt = $pdo->prepare("
            SELECT COUNT(*) as count
            FROM photo_submissions
            WHERE status = 'pending'
        ");
        $pendingStmt->execute();
        $pendingCount = $pendingStmt->fetch(PDO::FETCH_ASSOC)['count'];
    }
    
} catch (PDOException $e) {
    // If database is not connected, use empty arrays
    $photos = [];
    $albumStats = [];
    $peopleTags = [];
    $pendingCount = 0;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Photos - Reed & Weaver</title>
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/photos.css">
</head>
<body>
    <!-- Header will be automatically inserted here by header.js -->

    <main class="main-content">
        <!-- Photo Gallery Hero Section -->
        <section class="photo-hero">
            <div class="hero-backdrop"></div>
            <div class="hero-content">
                <div class="hero-header">
                    <h1 class="hero-title">
                        <span class="title-icon">📸</span>
                        <span class="title-text">Photo Gallery</span>
                    </h1>
                    <a href="upload/photos.php" class="hero-upload-btn">
                        <span class="upload-text">Upload Photos</span>
                    </a>
                </div>
            </div>
        </section>

        <!-- Photo Controls Section -->
        <section class="photo-controls">
            <div class="controls-container">
                <div class="view-options">
                    <button class="view-btn active" data-view="albums">
                        <span class="view-icon">📁</span>
                        Albums
                    </button>
                    <button class="view-btn" data-view="timeline">
                        <span class="view-icon">📅</span>
                        Timeline
                    </button>
                    <button class="view-btn" data-view="people">
                        <span class="view-icon">👥</span>
                        People
                    </button>
                    <button class="view-btn" data-view="all">
                        <span class="view-icon">🖼️</span>
                        All Photos
                    </button>
                </div>
                
                <div class="search-wrapper">
                    <input type="text" 
                           id="photoSearch" 
                           class="photo-search" 
                           placeholder="Search albums, events, people, dates...">
                    <button class="search-icon">🔍</button>
                </div>

                <div class="sort-section">
                    <label class="sort-label">Sort by:</label>
                    <select id="photoSort" class="sort-select">
                        <option value="recent">Most Recent</option>
                        <option value="oldest">Oldest First</option>
                        <option value="name">Album Name</option>
                        <option value="event">Event Type</option>
                    </select>
                </div>
            </div>
        </section>

        <!-- Unified Search -->
        <section class="unified-search-section">
            <div class="container">
                <div id="unifiedSearchContainer"></div>
            </div>
        </section>

        <div class="container">
        
        <div class="photo-grid" id="photoGrid">
            <!-- Photos will be loaded here -->
        </div>
        </div>
    </main>

    <!-- Pass PHP data to JavaScript -->
    <script>
        // Set current user for header
        window.currentUser = {
            id: <?= json_encode($userId ?? $_SESSION['user_id'] ?? null) ?>,
            displayName: <?= json_encode($_SESSION['display_name'] ?? 'User') ?>,
            isAdmin: <?= json_encode($isAdmin) ?>
        };
        
        // Initialize data from PHP
        window.photoGalleryData = {
            photos: <?= json_encode($photos) ?>,
            albums: <?= json_encode($albumStats) ?>,
            people: <?= json_encode($peopleTags) ?>,
            isAdmin: <?= json_encode($isAdmin) ?>,
            pendingCount: <?= isset($pendingCount) ? $pendingCount : 0 ?>
        };
    </script>
    
    <!-- Scripts -->
    <script src="js/header.js"></script>
    <script src="js/unified-search.js"></script>
    <script src="js/photos.js"></script>
    <script>
        // Initialize unified search for photos
        document.addEventListener('DOMContentLoaded', function() {
            unifiedSearch = new UnifiedSearch('unifiedSearchContainer');
        });
    </script>
</body>
</html>