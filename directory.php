<?php
require_once "config.php";
requireLogin();

$isAdmin = isAdmin();
$userId = $_SESSION['user_id'];

// Fetch family directory from database
try {
    // Get all active users with their family connection info
    $stmt = $pdo->prepare("
        SELECT u.*, pu.family_connection, pu.relationship_note,
               u.cousin_connect_available, u.cousin_connect_interests
        FROM users u
        LEFT JOIN pending_users pu ON u.username = pu.username
        ORDER BY u.display_name ASC
    ");
    $stmt->execute();
    $familyMembers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get Cousin Connect available count
    $cousinConnectStmt = $pdo->prepare("
        SELECT COUNT(*) as count
        FROM users
        WHERE cousin_connect_available = 1
    ");
    $cousinConnectStmt->execute();
    $cousinConnectCount = $cousinConnectStmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    // Get total family member count
    $totalMembers = count($familyMembers);
    
    // Organize by privacy tiers
    $guestMembers = [];
    $familyOnlyMembers = [];
    $cousinConnectMembers = [];
    
    foreach ($familyMembers as $member) {
        // Simple privacy tier logic - can be enhanced
        if ($member['cousin_connect_available']) {
            $cousinConnectMembers[] = $member;
        } else {
            $familyOnlyMembers[] = $member;
        }
    }
    
} catch (PDOException $e) {
    $familyMembers = [];
    $cousinConnectCount = 0;
    $totalMembers = 0;
    $guestMembers = [];
    $familyOnlyMembers = [];
    $cousinConnectMembers = [];
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Family Connections - Reed & Weaver</title>
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/directory.css">
</head>
<body>
    <!-- Header will be automatically inserted here by header.js -->

    <!-- Main Content -->
    <main class="main-content family-main">
        <!-- Hero Section -->
        <section class="connection-hero">
            <div class="hero-content">
                <h1 class="hero-title">Family Connections</h1>
            </div>
        </section>

        <!-- Search & Controls -->
        <section class="connection-controls">
            <div class="controls-container">
                <div class="top-controls">
                    <div class="filter-section">
                        <button class="filter-btn active" data-filter="all">Directory</button>
                        <button class="filter-btn" data-filter="cousin-connect">Cousin Connect</button>
                    </div>
                    
                    <div class="view-section">
                        <button class="view-btn active" data-view="cards">Cards</button>
                        <button class="view-btn" data-view="map">Connection Map</button>
                    </div>
                </div>
                
                <div class="search-section">
                    <div class="search-input-container">
                        <input type="text" id="family-search" placeholder="Search family members, interests, locations...">
                        <button class="search-btn">🔍</button>
                    </div>
                </div>
            </div>
        </section>

        <!-- Family Connections Grid -->
        <section class="family-connections" id="family-connections">
            <div class="connections-grid" id="connections-grid">
                <!-- Family cards will be populated here -->
            </div>
            
            <div class="family-tree-view" id="family-tree-view" style="display: none;">
                <div class="tree-container">
                    <div class="tree-loading">
                        <div class="cosmic-spinner"></div>
                        <p>Mapping family connections across the universe...</p>
                    </div>
                </div>
            </div>
            
            <div class="connection-map-view" id="connection-map-view" style="display: none;">
                <div class="connection-map-container">
                    <div class="map-controls">
                        <h3>🌐 Family Connection Map</h3>
                        <div class="map-actions">
                            <button class="btn btn-secondary" onclick="familyConnectionMap?.refresh()">
                                🔄 Refresh
                            </button>
                            <button class="btn btn-primary" onclick="showRelationshipManager()">
                                ➕ Manage Relationships
                            </button>
                        </div>
                    </div>
                    <div id="familyConnectionMapContainer"></div>
                </div>
                
                <!-- Relationship Management Interface -->
                <div id="relationshipManagerContainer" style="display: none;">
                    <!-- Will be populated by RelationshipManager -->
                </div>
            </div>
        </section>

        <!-- Cousin Connect Panel -->
        <section class="cousin-connect-panel">
            <div class="panel-content">
                <h2>Your Cousin Connect Status</h2>
                <div class="status-card" id="user-status-card">
                    <div class="status-info">
                        <div class="status-indicator" id="status-indicator"></div>
                        <div class="status-text">
                            <h3 id="status-title">Loading...</h3>
                            <p id="status-description">Getting your connection status...</p>
                        </div>
                    </div>
                    <div class="status-actions">
                        <button class="btn status-toggle" id="status-toggle-btn">
                            <span id="toggle-text">Set Available</span>
                        </button>
                        <button class="btn secondary" id="edit-interests-btn">
                            <span>✏️</span> Edit Interests
                        </button>
                    </div>
                </div>
                
                <div class="interests-editor" id="interests-editor" style="display: none;">
                    <h3>What would you like to connect about?</h3>
                    <div class="interest-categories">
                        <label class="interest-category">
                            <input type="checkbox" value="family-history">
                            <span>📚 Family History</span>
                        </label>
                        <label class="interest-category">
                            <input type="checkbox" value="photos">
                            <span>📸 Photos & Memories</span>
                        </label>
                        <label class="interest-category">
                            <input type="checkbox" value="recipes">
                            <span>🍝 Recipes & Cooking</span>
                        </label>
                        <label class="interest-category">
                            <input type="checkbox" value="travel">
                            <span>✈️ Travel & Adventures</span>
                        </label>
                        <label class="interest-category">
                            <input type="checkbox" value="hobbies">
                            <span>🎨 Hobbies & Crafts</span>
                        </label>
                        <label class="interest-category">
                            <input type="checkbox" value="mentoring">
                            <span>🤝 Mentoring & Advice</span>
                        </label>
                        <label class="interest-category">
                            <input type="checkbox" value="events">
                            <span>🎉 Events & Gatherings</span>
                        </label>
                        <label class="interest-category">
                            <input type="checkbox" value="pen-pals">
                            <span>💌 Pen Pals & Chat</span>
                        </label>
                    </div>
                    <div class="interests-actions">
                        <button class="btn" id="save-interests-btn">Save Interests</button>
                        <button class="btn secondary" id="cancel-interests-btn">Cancel</button>
                    </div>
                </div>
            </div>
        </section>

        <!-- Family Stats (Bottom) -->
        <section class="family-stats">
            <div class="stats-container">
                <div class="stat-item">
                    <span id="family-count">0</span>
                    <label>Family Members</label>
                </div>
                <div class="stat-item">
                    <span id="cousin-connect-count">0</span>
                    <label>Cousin Connect</label>
                </div>
                <div class="stat-item">
                    <span id="active-count">0</span>
                    <label>Active Today</label>
                </div>
            </div>
        </section>

        <!-- Profile Modal -->
        <div class="profile-modal" id="profile-modal">
            <div class="modal-backdrop"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="profile-name">Loading...</h2>
                    <button class="modal-close" id="close-profile-modal">×</button>
                </div>
                <div class="modal-body">
                    <div class="profile-info">
                        <div class="profile-avatar">
                            <div class="avatar-placeholder" id="profile-avatar"></div>
                        </div>
                        <div class="profile-details">
                            <div class="detail-item">
                                <label>Email:</label>
                                <span id="profile-email"></span>
                            </div>
                            <div class="detail-item">
                                <label>Phone:</label>
                                <span id="profile-phone"></span>
                            </div>
                            <div class="detail-item">
                                <label>Interests:</label>
                                <span id="profile-interests"></span>
                            </div>
                            <div class="detail-item">
                                <label>Member Since:</label>
                                <span id="profile-member-since"></span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="relationship-section">
                        <h4>Family Connection</h4>
                        <div class="relationship-selector">
                            <select id="profile-relationship-select">
                                <option value="">Select relationship...</option>
                                <option value="parent">Parent</option>
                                <option value="sibling">Sibling</option>
                                <option value="spouse">Spouse</option>
                                <option value="child">Child</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="profile-actions">
                        <button class="btn" id="send-message-btn">
                            <span>💬</span> Send Message
                        </button>
                        <button class="btn secondary" id="view-photos-btn">
                            <span>📸</span> View Photos
                        </button>
                        <button class="btn secondary" id="view-calendar-btn">
                            <span>📅</span> View Calendar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <!-- Pass PHP data to JavaScript -->
    <script>
        window.directoryData = {
            familyMembers: <?= json_encode($familyMembers) ?>,
            stats: {
                totalMembers: <?= json_encode($totalMembers) ?>,
                cousinConnectCount: <?= json_encode($cousinConnectCount) ?>
            },
            privacyTiers: {
                guest: <?= json_encode($guestMembers) ?>,
                family: <?= json_encode($familyOnlyMembers) ?>,
                cousinConnect: <?= json_encode($cousinConnectMembers) ?>
            },
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
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <script src="js/family-inference-engine.js"></script>
    <script src="js/family-connection-map.js"></script>
    <script src="js/family-connections.js"></script>
    <script>
        // Global instances for family connection system
        let familyConnectionMap;
        let relationshipManager;
        let familyInferenceEngine;
        
        // Initialize family connection system when connection map view is shown
        function initializeFamilyConnectionSystem() {
            if (!familyConnectionMap) {
                familyConnectionMap = new FamilyConnectionMap('familyConnectionMapContainer', {
                    width: 800,
                    height: 600
                });
                familyConnectionMap.loadConnectionData();
            }
            
            if (!relationshipManager) {
                relationshipManager = new RelationshipManager('relationshipManagerContainer');
            }
            
            if (!familyInferenceEngine) {
                familyInferenceEngine = new FamilyInferenceEngine();
            }
        }
        
        // Show/hide relationship manager
        function showRelationshipManager() {
            const container = document.getElementById('relationshipManagerContainer');
            if (container.style.display === 'none') {
                container.style.display = 'block';
                if (!relationshipManager) {
                    relationshipManager = new RelationshipManager('relationshipManagerContainer');
                }
            } else {
                container.style.display = 'none';
            }
        }
        
        // Update the existing view switching to initialize connection map
        document.addEventListener('DOMContentLoaded', function() {
            // Hook into existing view switching logic
            const originalShowView = window.showView || function() {};
            window.showView = function(viewName) {
                if (viewName === 'map') {
                    initializeFamilyConnectionSystem();
                }
                return originalShowView.apply(this, arguments);
            };
        });
    </script>
</body>
</html>