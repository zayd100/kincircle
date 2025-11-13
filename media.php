<?php
require_once "config.php";
requireLogin();

$isAdmin = isAdmin();
$userId = $_SESSION['user_id'];

// Fetch media from database
try {
    // Note: Media system would eventually have its own database table
    // For now, we'll use placeholder data structure
    $mediaFiles = [];
    $mediaStats = [
        'totalFiles' => 0,
        'videos' => 0,
        'documents' => 0,
        'audio' => 0
    ];
    
} catch (PDOException $e) {
    $mediaFiles = [];
    $mediaStats = [
        'totalFiles' => 0,
        'videos' => 0,
        'documents' => 0,
        'audio' => 0
    ];
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Media Library - Reed & Weaver</title>
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/media.css">
</head>
<body>
    <!-- Header will be automatically inserted here by header.js -->

    <main class="main-content">
        <!-- Media Library Hero Section -->
        <section class="media-hero">
            <div class="hero-backdrop"></div>
            <div class="hero-content">
                <div class="hero-header">
                    <h1 class="hero-title">
                        <span class="title-icon">📚</span>
                        <span class="title-text">Media Library</span>
                    </h1>
                    <a href="upload/media.php" class="hero-upload-btn">
                        <span class="upload-text">Upload Media</span>
                    </a>
                </div>
            </div>
        </section>

        <!-- Media Controls Section -->
        <section class="media-controls">
            <div class="controls-container">
                <div class="filter-section">
                    <button class="filter-btn active" data-filter="all">
                        <span class="filter-icon">📋</span>
                        All Media
                    </button>
                    <button class="filter-btn" data-filter="video">
                        <span class="filter-icon">📹</span>
                        Video
                    </button>
                    <button class="filter-btn" data-filter="audio">
                        <span class="filter-icon">🎵</span>
                        Audio
                    </button>
                    <button class="filter-btn" data-filter="document">
                        <span class="filter-icon">📄</span>
                        Documents
                    </button>
                </div>
                
                <div class="search-section">
                    <input type="text" 
                           id="mediaSearch" 
                           class="media-search" 
                           placeholder="Search titles, descriptions, or uploaders...">
                    <button class="search-icon">🔍</button>
                </div>

                <div class="sort-section">
                    <label class="sort-label">Sort by:</label>
                    <select id="mediaSort" class="sort-select">
                        <option value="recent">Most Recent</option>
                        <option value="title">Title (A-Z)</option>
                        <option value="type">Media Type</option>
                        <option value="uploader">Uploader</option>
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
            <!-- Categories Section -->
            <section class="categories-section" id="categoriesSection">
                <h2 class="section-title">Collections</h2>
                <div class="categories-grid" id="categoriesGrid">
                    <!-- Categories will be populated by JavaScript -->
                </div>
            </section>

            <!-- Media Library List -->
            <section class="library-section">
                <h2 class="section-title">All Media</h2>
                <div class="library-list" id="mediaLibrary">
                    <!-- Media entries will be populated by JavaScript -->
                </div>

                <!-- Load More Button -->
                <div class="load-more-section">
                    <button class="load-more-btn" onclick="loadMoreMedia()">
                        Load More
                    </button>
                </div>
            </section>

            <!-- Media Stats -->
            <div class="media-stats">
                <div class="stat-card">
                    <div class="stat-number" id="totalMedia">0</div>
                    <div class="stat-label">Total Items</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="totalVideos">0</div>
                    <div class="stat-label">Video</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="totalAudio">0</div>
                    <div class="stat-label">Audio</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="totalDocuments">0</div>
                    <div class="stat-label">Documents</div>
                </div>
            </div>
        </div>
    </main>


    <!-- Pass PHP data to JavaScript -->
    <script>
        window.mediaData = {
            files: <?= json_encode($mediaFiles) ?>,
            stats: <?= json_encode($mediaStats) ?>,
            currentUser: {
                id: <?= json_encode($userId) ?>,
                isAdmin: <?= json_encode($isAdmin) ?>
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
    <script src="js/unified-search.js"></script>
    <script src="js/media-main.js"></script>
    <script>
        // Initialize unified search for media
        document.addEventListener('DOMContentLoaded', function() {
            unifiedSearch = new UnifiedSearch('unifiedSearchContainer');
        });
    </script>
</body>
</html>