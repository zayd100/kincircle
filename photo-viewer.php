<?php
require_once "config.php";
requireLogin();

// Get user admin status  
$isAdmin = isAdmin();
$userId = $_SESSION['user_id'] ?? null;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Photo Viewer - Reed & Weaver</title>
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/photo-viewer.css">
</head>
<body>
    <!-- Photo Viewer Universe Background -->
    <div class="photo-viewer-universe">
        <div class="universe-particles"></div>
        <div class="universe-gradient"></div>
    </div>

    <!-- Unified header will be inserted here by header.js -->
    
    <main class="main-content">
        <div class="photo-viewer-container">
            <!-- Photo Navigation Header -->
            <header class="photo-viewer-header">
                <div class="viewer-title">
                    <h1 id="albumTitle">Photo Viewer</h1>
                    <p id="albumDescription">Viewing family memories</p>
                </div>
                <div class="viewer-controls">
                    <button class="control-btn" id="prevPhotoBtn" onclick="navigatePhoto(-1)">
                        <span class="nav-icon">‹</span>
                        <span class="nav-text">Previous</span>
                    </button>
                    <span class="photo-position" id="photoPosition">1 of 1</span>
                    <button class="control-btn" id="nextPhotoBtn" onclick="navigatePhoto(1)">
                        <span class="nav-text">Next</span>
                        <span class="nav-icon">›</span>
                    </button>
                </div>
            </header>

            <!-- Main Photo Display -->
            <div class="photo-display-area">
                <div class="photo-container">
                    <img id="mainPhoto" src="" alt="Family Photo" class="main-photo">
                    <div class="photo-loading">
                        <div class="loading-spinner"></div>
                        <p>Loading photo...</p>
                    </div>
                </div>
            </div>

            <!-- Photo Information Sidebar -->
            <aside class="photo-info-sidebar">
                <div class="photo-details-section">
                    <h3>📸 Photo Details</h3>
                    <div class="photo-details">
                        <div class="detail-item">
                            <span class="detail-label">Album:</span>
                            <span id="photoAlbumName" class="detail-value">Loading...</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Date:</span>
                            <span id="photoDate" class="detail-value">Loading...</span>
                        </div>
                        <div class="detail-item" id="photoLocationItem" style="display: none;">
                            <span class="detail-label">Location:</span>
                            <span id="photoLocation" class="detail-value"></span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Photo:</span>
                            <span id="photoPositionDetail" class="detail-value">Loading...</span>
                        </div>
                    </div>
                    <p id="photoDescription" class="photo-description">Loading description...</p>
                </div>
                
                <!-- People Tags Section -->
                <div class="photo-tags-section">
                    <h3>👥 People in this photo</h3>
                    <div class="current-tags" id="currentTags">
                        <!-- Tags will be loaded here -->
                    </div>
                    <div class="add-tag-section">
                        <input type="text" 
                               id="newTagInput" 
                               class="tag-input" 
                               placeholder="Add a person's name..."
                               autocomplete="off">
                        <button class="add-tag-btn" onclick="addTag()">
                            <span class="add-tag-icon">+</span>
                            Add
                        </button>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="photo-actions">
                    <button class="action-btn" onclick="downloadPhoto()">
                        <span class="action-icon">⬇</span>
                        Download
                    </button>
                    <a href="photos.php" class="action-btn">
                        <span class="action-icon">←</span>
                        Back to Gallery
                    </a>
                </div>
            </aside>
        </div>
    </main>

    <!-- Setup currentUser for header -->
    <script>
        window.currentUser = {
            id: <?= json_encode($userId) ?>,
            displayName: <?= json_encode($_SESSION['display_name'] ?? 'User') ?>,
            isAdmin: <?= json_encode($isAdmin) ?>
        };
    </script>
    
    <!-- Scripts -->
    <script src="js/header.js"></script>
    <script src="js/photo-viewer.js?v=<?= time() ?>"></script>
</body>
</html>