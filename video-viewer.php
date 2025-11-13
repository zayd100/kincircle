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
    <title>Media Viewer - Reed & Weaver</title>
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/media-viewer.css">
</head>
<body>
    <!-- Media Viewer Universe Background -->
    <div class="media-viewer-universe">
        <div class="universe-particles"></div>
        <div class="universe-gradient"></div>
    </div>

    <!-- Unified header will be inserted here by header.js -->
    
    <main class="main-content">
        <div class="media-viewer-container">
            <!-- Media Navigation Header -->
            <header class="media-viewer-header">
                <div class="viewer-title">
                    <h1 id="mediaTitle">Loading...</h1>
                    <p id="mediaDescription">Loading description...</p>
                </div>
                <div class="viewer-controls">
                    <a href="media.php" class="control-btn back-btn">
                        <span class="nav-icon">←</span>
                        <span class="nav-text">Back to Library</span>
                    </a>
                    <button class="control-btn" onclick="downloadMedia()">
                        <span class="nav-icon">⬇</span>
                        <span class="nav-text">Download</span>
                    </button>
                </div>
            </header>

            <!-- Main Media Display -->
            <div class="media-display-area">
                <div class="media-container">
                    <!-- Video Player -->
                    <video id="videoPlayer" class="media-player" controls style="display: none;">
                        <source id="videoSource" src="" type="">
                        Your browser does not support the video tag.
                    </video>
                    
                    <!-- Audio Player -->
                    <audio id="audioPlayer" class="media-player audio-player" controls style="display: none;">
                        <source id="audioSource" src="" type="">
                        Your browser does not support the audio tag.
                    </audio>
                    
                    <!-- Loading State -->
                    <div class="media-loading" id="mediaLoading">
                        <div class="loading-spinner"></div>
                        <p>Loading media...</p>
                    </div>
                    
                    <!-- Error State -->
                    <div class="media-error" id="mediaError" style="display: none;">
                        <div class="error-icon">⚠️</div>
                        <h3>Media not found</h3>
                        <p>This media file could not be loaded.</p>
                        <a href="media.php" class="error-btn">Return to Library</a>
                    </div>
                </div>
            </div>

            <!-- Media Information Sidebar -->
            <aside class="media-info-sidebar">
                <div class="media-details-section">
                    <h3 id="mediaTypeIcon">📹</h3>
                    <div class="media-details">
                        <div class="detail-item">
                            <span class="detail-label">Type:</span>
                            <span id="mediaType" class="detail-value">Loading...</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Duration:</span>
                            <span id="mediaDuration" class="detail-value">Loading...</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Added by:</span>
                            <span id="mediaUploader" class="detail-value">Loading...</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Date added:</span>
                            <span id="mediaDate" class="detail-value">Loading...</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Category:</span>
                            <span id="mediaCategory" class="detail-value">Loading...</span>
                        </div>
                    </div>
                </div>
                
                <!-- Media Context Section -->
                <div class="media-context-section">
                    <h3>📝 About this media</h3>
                    <p id="mediaContext" class="media-context-text">Loading context...</p>
                </div>

                <!-- Playback Controls -->
                <div class="playback-controls-section">
                    <h3>⚙️ Playback Options</h3>
                    <div class="playback-options">
                        <div class="option-group">
                            <label class="option-label">
                                <input type="range" id="volumeSlider" min="0" max="100" value="100" class="volume-slider">
                                <span class="slider-label">Volume</span>
                            </label>
                        </div>
                        <div class="option-group">
                            <label class="option-label">
                                <select id="playbackSpeed" class="speed-select">
                                    <option value="0.5">0.5x</option>
                                    <option value="0.75">0.75x</option>
                                    <option value="1" selected>1x</option>
                                    <option value="1.25">1.25x</option>
                                    <option value="1.5">1.5x</option>
                                    <option value="2">2x</option>
                                </select>
                                <span class="slider-label">Speed</span>
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="media-actions">
                    <button class="action-btn" onclick="shareMedia()">
                        <span class="action-icon">🔗</span>
                        <span class="action-text">Share Link</span>
                    </button>
                    <button class="action-btn" onclick="reportIssue()">
                        <span class="action-icon">🚨</span>
                        <span class="action-text">Report Issue</span>
                    </button>
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
    <script src="js/media-viewer.js"></script>
</body>
</html>