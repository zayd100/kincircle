<?php
require_once "config.php";
requireLogin();

if (!isAdmin()) {
    header('Location: index.php?error=admin_required');
    exit;
}

$message = '';
$messageType = '';

// Debug POST data
if ($_POST) {
    error_log("DEBUG: Received POST data: " . print_r($_POST, true));
}

// Handle form submissions - user approval/rejection
if ($_POST['action'] ?? '' === 'approve') {
    error_log("DEBUG: Processing APPROVE action for user ID: " . ($_POST['pending_id'] ?? 'NONE'));
    $pendingId = (int)$_POST['pending_id'];
    
    try {
        // Get pending user data
        $stmt = $pdo->prepare("SELECT * FROM pending_users WHERE id = ? AND status = 'pending'");
        $stmt->execute([$pendingId]);
        $pendingUser = $stmt->fetch();
        
        if (!$pendingUser) {
            throw new Exception('Pending user not found');
        }
        
        // Start transaction for atomic operation
        $pdo->beginTransaction();
        
        try {
            // Move to main users table
            $stmt = $pdo->prepare("
                INSERT INTO users (username, password_hash, display_name, email, phone, birthday, 
                                 is_admin, password_type, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, 0, ?, NOW())
            ");
            
            $stmt->execute([
                $pendingUser['username'],
                $pendingUser['password_hash'],
                $pendingUser['display_name'],
                $pendingUser['email'],
                $pendingUser['phone'],
                $pendingUser['birthday'],
                $pendingUser['password_type'] ?? 'three_field'
            ]);
            
            $newUserId = $pdo->lastInsertId();
            error_log("DEBUG: Created new user with ID: $newUserId");
            
            // Update pending user status
            $stmt = $pdo->prepare("
                UPDATE pending_users 
                SET status = 'approved', reviewed_by = ?, reviewed_at = NOW() 
                WHERE id = ?
            ");
            $stmt->execute([$_SESSION['user_id'], $pendingId]);
            
            // Commit transaction
            $pdo->commit();
            error_log("DEBUG: Successfully approved user {$pendingUser['display_name']}");
            
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
        
        $message = "User '{$pendingUser['display_name']}' approved successfully!";
        $messageType = 'success';
        
    } catch (Exception $e) {
        $message = "Error approving user: " . $e->getMessage();
        $messageType = 'error';
    }
}

if ($_POST['action'] ?? '' === 'reject') {
    error_log("DEBUG: Processing REJECT action for user ID: " . ($_POST['pending_id'] ?? 'NONE'));
    $pendingId = (int)$_POST['pending_id'];
    $reason = sanitizeInput($_POST['reason'] ?? 'No reason provided');
    
    try {
        $stmt = $pdo->prepare("
            UPDATE pending_users 
            SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW(), admin_notes = ? 
            WHERE id = ?
        ");
        $stmt->execute([$_SESSION['user_id'], $reason, $pendingId]);
        
        $message = "User registration rejected.";
        $messageType = 'error';
        
    } catch (Exception $e) {
        $message = "Error rejecting user: " . $e->getMessage();
        $messageType = 'error';
    }
}

// Gather ALL admin data in one place - no API calls needed!
$adminData = [
    'stats' => [],
    'pending_users' => [],
    'active_users' => [],
    'pending_photos' => [],
    'pending_messages' => [],
    'pending_events' => [],
    'user_info' => [
        'id' => $_SESSION['user_id'],
        'name' => $_SESSION['display_name'] ?? 'Admin',
        'is_admin' => true
    ]
];

// Load user data for unified admin modules
try {
    // Load pending user registrations
    $stmt = $pdo->prepare("
        SELECT id, username, display_name, email, phone, 
               family_connection, relationship_note, created_at, status
        FROM pending_users 
        WHERE status = 'pending'
        ORDER BY created_at DESC
    ");
    $stmt->execute();
    $adminData['pending_users'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Load active users
    $stmt = $pdo->prepare("
        SELECT id, username, display_name, email, phone, is_admin,
               created_at, last_login, cousin_connect_available, 
               cousin_connect_interests, cousin_connect_since
        FROM users 
        ORDER BY created_at DESC
    ");
    $stmt->execute();
    $adminData['active_users'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    error_log("DEBUG: Loaded " . count($adminData['pending_users']) . " pending users, " . count($adminData['active_users']) . " active users");
    
} catch (Exception $e) {
    error_log("ERROR loading user data: " . $e->getMessage());
    $adminData['pending_users'] = [];
    $adminData['active_users'] = [];
}

try {
    // Get pending users (like the working approve_pending_users.php)
    $stmt = $pdo->prepare("
        SELECT id, username, display_name, email, phone, birthday,
               family_connection, relationship_note, created_at, status
        FROM pending_users 
        WHERE status = 'pending'
        ORDER BY created_at DESC
    ");
    $stmt->execute();
    $adminData['pending_users'] = $stmt->fetchAll();
    
    // Get active users
    $stmt = $pdo->prepare("
        SELECT id, username, display_name, email, phone, is_admin,
               created_at, last_login, cousin_connect_available, 
               cousin_connect_interests, cousin_connect_since
        FROM users 
        ORDER BY created_at DESC
    ");
    $stmt->execute();
    $adminData['active_users'] = $stmt->fetchAll();
    
    // Get pending photos (if photos table exists)
    $stmt = $pdo->prepare("SHOW TABLES LIKE 'photo_submissions'");
    $stmt->execute();
    if ($stmt->rowCount() > 0) {
        $stmt = $pdo->prepare("
            SELECT id, filename, title, description, submitter_id, created_at, status
            FROM photo_submissions 
            WHERE status = 'pending'
            ORDER BY created_at DESC
        ");
        $stmt->execute();
        $adminData['pending_photos'] = $stmt->fetchAll();
    }
    
    // Get pending events (already working)
    $stmt = $pdo->prepare("
        SELECT id, title, event_date, description, submitter_id, status, created_at
        FROM event_submissions 
        WHERE status = 'pending'
        ORDER BY created_at DESC
    ");
    $stmt->execute();
    $adminData['pending_events'] = $stmt->fetchAll();
    
    // Calculate stats with safe counting
    $adminData['stats'] = [
        'pending_users' => count($adminData['pending_users'] ?? []),
        'active_users' => count($adminData['active_users'] ?? []),
        'pending_photos' => count($adminData['pending_photos'] ?? []),
        'pending_events' => count($adminData['pending_events'] ?? []),
        'cousin_connect_active' => count(array_filter($adminData['active_users'] ?? [], function($u) { 
            return ($u['cousin_connect_available'] ?? 0) == 1; 
        }))
    ];
    
} catch (Exception $e) {
    // Graceful fallback with safe defaults
    error_log("Admin data loading error: " . $e->getMessage());
    $adminData['stats'] = [
        'pending_users' => 0,
        'active_users' => 0,
        'pending_photos' => 0,
        'pending_events' => 0,
        'cousin_connect_active' => 0
    ];
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reed & Weaver Family Hub - Admin</title>
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/admin.css">
    <style>
        /* Enhanced admin styles for the unified interface */
        .admin-module {
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            border-radius: var(--radius-lg);
            padding: 1.5rem;
            margin: 1rem 0;
            backdrop-filter: var(--glass-backdrop);
        }
        
        .module-tabs {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 2rem;
            flex-wrap: wrap;
        }
        
        .module-tab {
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            padding: 0.75rem 1.5rem;
            border-radius: var(--radius-md);
            cursor: pointer;
            transition: all var(--animation-normal);
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .module-tab:hover {
            background: var(--primary-light);
            border-color: var(--primary);
        }
        
        .module-tab.active {
            background: var(--primary);
            color: white;
            border-color: var(--primary);
        }
        
        .user-card {
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            border-radius: var(--radius-md);
            padding: 1rem;
            margin: 0.5rem 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .user-actions {
            display: flex;
            gap: 0.5rem;
        }
        
        .btn {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: var(--radius-sm);
            cursor: pointer;
            font-weight: 500;
            transition: all var(--animation-normal);
        }
        
        .btn.approve {
            background: #10b981;
            color: white;
        }
        
        .btn.reject {
            background: #ef4444;
            color: white;
        }
        
        .btn:hover {
            transform: translateY(-1px);
            opacity: 0.9;
        }
    </style>
</head>
<body>
    <script src="js/header.js"></script>
    
    <main class="main-content">
        <div class="container">
            <h1 class="page-title">🛠️ Family Hub Administration</h1>
            <p>Unified admin interface powered by direct database connections</p>
            
            <?php if ($message): ?>
                <div class="message <?= $messageType ?>" style="
                    padding: 1rem;
                    border-radius: var(--radius-md);
                    margin: 1rem 0;
                    <?= $messageType === 'success' ? 'background: #d1fae5; color: #065f46; border: 2px solid #10b981;' : 'background: #fee2e2; color: #991b1b; border: 2px solid #ef4444;' ?>
                ">
                    <?= htmlspecialchars($message) ?>
                </div>
            <?php endif; ?>
            
            <!-- Stats Dashboard -->
            <div class="stats-grid">
                <div class="stat-card users">
                    <div class="stat-number"><?= $adminData['stats']['pending_users'] ?></div>
                    <div class="stat-label">Pending Users</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number"><?= $adminData['stats']['active_users'] ?></div>
                    <div class="stat-label">Active Users</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number"><?= $adminData['stats']['pending_photos'] ?></div>
                    <div class="stat-label">Pending Photos</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number"><?= $adminData['stats']['pending_events'] ?></div>
                    <div class="stat-label">Pending Events</div>
                </div>
            </div>
            
            <!-- Module Tabs -->
            <div class="module-tabs">
                <button class="module-tab active" onclick="showModule('users')">
                    👥 Users (<?= $adminData['stats']['pending_users'] ?>)
                </button>
                <button class="module-tab" onclick="showModule('photos')">
                    📸 Photos (<?= $adminData['stats']['pending_photos'] ?>)
                </button>
                <button class="module-tab" onclick="showModule('events')">
                    📅 Events (<?= $adminData['stats']['pending_events'] ?>)
                </button>
                <button class="module-tab" onclick="showModule('overview')">
                    📊 Overview
                </button>
            </div>
            
            <!-- Users Module -->
            <div id="module-users" class="admin-module">
                <h2>👥 User Management</h2>
                
                <?php if (empty($adminData['pending_users'])): ?>
                    <div class="empty-state">
                        <h3>✅ No pending approvals</h3>
                        <p>All family member registrations have been processed.</p>
                    </div>
                <?php else: ?>
                    <h3>Pending Approvals (<?= count($adminData['pending_users']) ?>)</h3>
                    <?php foreach ($adminData['pending_users'] as $user): ?>
                        <div class="user-card">
                            <div class="user-info">
                                <h4><?= htmlspecialchars($user['display_name']) ?></h4>
                                <p><strong>Username:</strong> <?= htmlspecialchars($user['username']) ?></p>
                                <p><strong>Email:</strong> <?= htmlspecialchars($user['email']) ?></p>
                                <p><strong>Connection:</strong> <?= htmlspecialchars($user['family_connection']) ?></p>
                                <p><strong>Note:</strong> <?= htmlspecialchars($user['relationship_note']) ?></p>
                                <p><strong>Submitted:</strong> <?= date('M j, Y', strtotime($user['created_at'])) ?></p>
                            </div>
                            <div class="user-actions">
                                <button class="btn approve" onclick="approveUser(<?= $user['id'] ?>)">
                                    ✅ Approve
                                </button>
                                <button class="btn reject" onclick="rejectUser(<?= $user['id'] ?>)">
                                    ❌ Reject
                                </button>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
            
            <!-- Photos Module -->
            <div id="module-photos" class="admin-module" style="display: none;">
                <h2>📸 Photo Management</h2>
                <p>Photo moderation system - <?= count($adminData['pending_photos']) ?> pending</p>
                <!-- Photo approval interface would go here -->
            </div>
            
            <!-- Events Module -->
            <div id="module-events" class="admin-module" style="display: none;">
                <h2>📅 Event Management</h2>
                <p>Event approval system - <?= count($adminData['pending_events']) ?> pending</p>
                <!-- Event approval interface would go here -->
            </div>
            
            <!-- Overview Module -->
            <div id="module-overview" class="admin-module" style="display: none;">
                <h2>📊 System Overview</h2>
                <div class="overview-grid">
                    <div class="overview-card">
                        <h3>Database Status</h3>
                        <p>✅ Connected and operational</p>
                    </div>
                    <div class="overview-card">
                        <h3>Active Users</h3>
                        <p><?= $adminData['stats']['active_users'] ?> family members</p>
                    </div>
                    <div class="overview-card">
                        <h3>Cousin Connect</h3>
                        <p><?= $adminData['stats']['cousin_connect_active'] ?> users available</p>
                    </div>
                </div>
            </div>
        </div>
    </main>
    
    <!-- Embed data directly in JavaScript - NO API CALLS NEEDED! -->
    <script>
        // All data is already loaded and embedded - this is the key innovation!
        window.adminData = <?= json_encode($adminData, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP) ?>;
        
        function showModule(moduleName) {
            // Hide all modules
            document.querySelectorAll('.admin-module').forEach(module => {
                module.style.display = 'none';
            });
            
            // Remove active class from all tabs
            document.querySelectorAll('.module-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Show selected module
            document.getElementById('module-' + moduleName).style.display = 'block';
            event.target.classList.add('active');
        }
        
        async function approveUser(userId) {
            if (!confirm('Approve this user registration?')) return;
            
            try {
                // Use a simple form submission instead of fetch API
                const form = document.createElement('form');
                form.method = 'POST';
                form.style.display = 'none';
                
                const actionInput = document.createElement('input');
                actionInput.name = 'action';
                actionInput.value = 'approve';
                form.appendChild(actionInput);
                
                const idInput = document.createElement('input');
                idInput.name = 'pending_id';
                idInput.value = userId;
                form.appendChild(idInput);
                
                document.body.appendChild(form);
                form.submit();
                
            } catch (error) {
                alert('Error approving user. Please try again.');
                console.error('Approval error:', error);
            }
        }
        
        function rejectUser(userId) {
            const reason = prompt('Reason for rejection (optional):');
            if (reason === null) return;
            
            const form = document.createElement('form');
            form.method = 'POST';
            form.style.display = 'none';
            
            const actionInput = document.createElement('input');
            actionInput.name = 'action';
            actionInput.value = 'reject';
            form.appendChild(actionInput);
            
            const idInput = document.createElement('input');
            idInput.name = 'pending_id';
            idInput.value = userId;
            form.appendChild(idInput);
            
            const reasonInput = document.createElement('input');
            reasonInput.name = 'reason';
            reasonInput.value = reason;
            form.appendChild(reasonInput);
            
            document.body.appendChild(form);
            form.submit();
        }
        
        // Set current user for header
        window.currentUser = adminData.user_info;
        
        console.log('🎯 Unified Admin System Loaded');
        console.log('📊 Stats:', adminData.stats);
        console.log('👥 Pending Users:', adminData.pending_users.length);
    </script>
</body>
</html>