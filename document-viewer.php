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
    <title>Document Viewer - Reed & Weaver</title>
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/document-viewer.css">
</head>
<body>
    <!-- Document Viewer Universe Background -->
    <div class="document-viewer-universe">
        <div class="universe-particles"></div>
        <div class="universe-gradient"></div>
    </div>

    <!-- Unified header will be inserted here by header.js -->
    
    <main class="main-content">
        <div class="document-viewer-container">
            <!-- Document Navigation Header -->
            <header class="document-viewer-header">
                <div class="viewer-title">
                    <h1 id="documentTitle">Loading...</h1>
                    <p id="documentDescription">Loading description...</p>
                </div>
                <div class="viewer-controls">
                    <a href="media.php" class="control-btn back-btn">
                        <span class="nav-icon">←</span>
                        <span class="nav-text">Back to Library</span>
                    </a>
                    <button class="control-btn" onclick="downloadDocument()">
                        <span class="nav-icon">⬇</span>
                        <span class="nav-text">Download</span>
                    </button>
                    <button class="control-btn" onclick="printDocument()">
                        <span class="nav-icon">🖨</span>
                        <span class="nav-text">Print</span>
                    </button>
                </div>
            </header>

            <!-- Main Document Display -->
            <div class="document-display-area">
                <div class="document-container">
                    <!-- PDF Viewer -->
                    <div id="pdfViewer" class="document-viewer" style="display: none;">
                        <iframe id="pdfFrame" class="pdf-frame" src="" frameborder="0"></iframe>
                        <div class="pdf-fallback" id="pdfFallback" style="display: none;">
                            <div class="fallback-content">
                                <div class="fallback-icon">📄</div>
                                <h3>PDF Viewer</h3>
                                <p>This PDF document is ready to view.</p>
                                <div class="fallback-actions">
                                    <button class="fallback-btn primary" onclick="openInNewTab()">Open in New Tab</button>
                                    <button class="fallback-btn secondary" onclick="downloadDocument()">Download PDF</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- EPUB/Text Viewer -->
                    <div id="textViewer" class="document-viewer" style="display: none;">
                        <div class="text-reader">
                            <div class="text-content" id="textContent">
                                <!-- Text content will be loaded here -->
                            </div>
                        </div>
                    </div>
                    
                    <!-- Loading State -->
                    <div class="document-loading" id="documentLoading">
                        <div class="loading-spinner"></div>
                        <p>Loading document...</p>
                    </div>
                    
                    <!-- Error State -->
                    <div class="document-error" id="documentError" style="display: none;">
                        <div class="error-icon">📄</div>
                        <h3>Document not found</h3>
                        <p>This document could not be loaded.</p>
                        <a href="media.php" class="error-btn">Return to Library</a>
                    </div>
                </div>
            </div>

            <!-- Document Information Sidebar -->
            <aside class="document-info-sidebar">
                <div class="document-details-section">
                    <h3 id="documentTypeIcon">📄 Document Details</h3>
                    <div class="document-details">
                        <div class="detail-item">
                            <span class="detail-label">Type:</span>
                            <span id="documentType" class="detail-value">Loading...</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Pages:</span>
                            <span id="documentPages" class="detail-value">Loading...</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">File size:</span>
                            <span id="documentSize" class="detail-value">Loading...</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Added by:</span>
                            <span id="documentUploader" class="detail-value">Loading...</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Date added:</span>
                            <span id="documentDate" class="detail-value">Loading...</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Category:</span>
                            <span id="documentCategory" class="detail-value">Loading...</span>
                        </div>
                    </div>
                </div>
                
                <!-- Document Context Section -->
                <div class="document-context-section">
                    <h3>📝 About this document</h3>
                    <p id="documentContext" class="document-context-text">Loading context...</p>
                </div>

                <!-- Reading Controls -->
                <div class="reading-controls-section">
                    <h3>👀 Reading Options</h3>
                    <div class="reading-options">
                        <div class="option-group">
                            <label class="option-label">
                                <input type="range" id="textSizeSlider" min="12" max="24" value="16" class="text-size-slider">
                                <span class="slider-label">Text Size</span>
                            </label>
                        </div>
                        <div class="option-group">
                            <label class="option-label">
                                <select id="fontFamily" class="font-select">
                                    <option value="serif">Serif (Traditional)</option>
                                    <option value="sans-serif" selected>Sans-serif (Modern)</option>
                                    <option value="monospace">Monospace (Code)</option>
                                </select>
                                <span class="slider-label">Font Style</span>
                            </label>
                        </div>
                        <div class="option-group">
                            <label class="option-label">
                                <select id="pageWidth" class="width-select">
                                    <option value="narrow">Narrow (Reading)</option>
                                    <option value="medium" selected>Medium</option>
                                    <option value="wide">Wide (Full)</option>
                                </select>
                                <span class="slider-label">Page Width</span>
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Quick Navigation -->
                <div class="navigation-section" id="navigationSection">
                    <h3>📑 Quick Navigation</h3>
                    <div class="page-navigation">
                        <button class="nav-btn" onclick="previousPage()" id="prevPageBtn">
                            <span class="nav-icon">←</span>
                            Previous
                        </button>
                        <span class="page-info" id="pageInfo">Page 1 of 1</span>
                        <button class="nav-btn" onclick="nextPage()" id="nextPageBtn">
                            Next
                            <span class="nav-icon">→</span>
                        </button>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="document-actions">
                    <button class="action-btn" onclick="shareDocument()">
                        <span class="action-icon">🔗</span>
                        <span class="action-text">Share Link</span>
                    </button>
                    <button class="action-btn" onclick="fullscreenMode()">
                        <span class="action-icon">⛶</span>
                        <span class="action-text">Fullscreen</span>
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
    <script src="js/document-viewer.js"></script>
</body>
</html>