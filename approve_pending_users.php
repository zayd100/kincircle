<?php
require_once "config.php";
requireLogin();

if (!isAdmin()) {
    header('Location: index.php?error=admin_required');
    exit;
}

$message = '';
$messageType = '';

// Debug what was submitted
if ($_POST) {
    $debugInfo = "DEBUG: Form submitted with action='" . ($_POST['action'] ?? 'NONE') . "', pending_id='" . ($_POST['pending_id'] ?? 'NONE') . "'";
}

// Handle approval
if ($_POST['action'] ?? '' === 'approve') {
    $debugInfo .= " | EXECUTING APPROVAL CODE";
    $pendingId = (int)$_POST['pending_id'];
    
    try {
        // Get pending user data (remove status check to see if already processed)
        $stmt = $pdo->prepare("SELECT * FROM pending_users WHERE id = ?");
        $stmt->execute([$pendingId]);
        $pendingUser = $stmt->fetch();
        
        if (!$pendingUser) {
            throw new Exception('Pending user not found');
        }
        
        // Check if user was already approved (prevent double insertion)
        if ($pendingUser['status'] === 'approved') {
            $message = "User '{$pendingUser['display_name']}' has already been approved.";
            $messageType = 'success';
            $debugInfo .= " | USER ALREADY APPROVED - SKIPPING";
        } else {
            // Check if username already exists in users table (extra safety)
            $checkStmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
            $checkStmt->execute([$pendingUser['username']]);
            if ($checkStmt->fetch()) {
                throw new Exception("Username '{$pendingUser['username']}' already exists in the system");
            }
            
            // Move to main users table (without family_connection and relationship_note - those stay in pending_users)
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
            
            // Update pending user status
            $stmt = $pdo->prepare("
                UPDATE pending_users 
                SET status = 'approved', reviewed_by = ?, reviewed_at = NOW() 
                WHERE id = ?
            ");
            $stmt->execute([$_SESSION['user_id'], $pendingId]);
            
            $message = "User '{$pendingUser['display_name']}' approved successfully! They can now login.";
            $messageType = 'success';
            $debugInfo .= " | APPROVAL SUCCESSFUL | NEW USER ID: $newUserId";
        }
        
    } catch (Exception $e) {
        $message = "Error approving user: " . $e->getMessage();
        $messageType = 'error';
        // Add detailed error info to debug
        if (isset($debugInfo)) {
            $debugInfo .= " | ERROR: " . $e->getMessage();
        }
    }
}

// Handle rejection
if ($_POST['action'] ?? '' === 'reject') {
    $debugInfo .= " | EXECUTING REJECTION CODE";
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

// Get pending users
try {
    $stmt = $pdo->prepare("
        SELECT id, username, display_name, email, phone, birthday,
               family_connection, relationship_note, created_at, status
        FROM pending_users 
        WHERE status = 'pending'
        ORDER BY created_at DESC
    ");
    $stmt->execute();
    $pendingUsers = $stmt->fetchAll();
} catch (Exception $e) {
    $message = "Error loading pending users: " . $e->getMessage();
    $messageType = 'error';
    $pendingUsers = [];
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Approve Pending Users - Reed & Weaver Family Hub</title>
    <link rel="stylesheet" href="css/main.css">
    <style>
        .pending-user {
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            border-radius: 12px;
            padding: 20px;
            margin: 15px 0;
        }
        .user-info {
            margin-bottom: 15px;
        }
        .user-info h3 {
            margin: 0 0 10px 0;
            color: var(--text-primary);
        }
        .user-detail {
            margin: 5px 0;
            color: var(--text-secondary);
        }
        .actions {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }
        .message {
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
        }
        .message.success {
            background: #d1fae5;
            color: #065f46;
            border: 1px solid #10b981;
        }
        .message.error {
            background: #fee2e2;
            color: #991b1b;
            border: 1px solid #ef4444;
        }
        .empty-state {
            text-align: center;
            padding: 40px;
            color: var(--text-secondary);
        }
        .connection-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            margin-left: 8px;
        }
        .connection-reed { background: #ddd6fe; color: #5b21b6; }
        .connection-weaver { background: #fef3c7; color: #92400e; }
        .connection-married { background: #f3e8ff; color: #7c3aed; }
        .connection-other { background: #f3f4f6; color: #374151; }
    </style>
</head>
<body>
    <main class="main-content">
        <div class="container">
            <h1 class="page-title">👥 Approve Pending Family Members</h1>
            <p>Review and approve new family member registrations. This is where you can approve your real account!</p>
            
            <?php if ($message): ?>
                <div class="message <?= $messageType ?>">
                    <?= htmlspecialchars($message) ?>
                    <?php if (isset($debugInfo)): ?>
                        <br><small><?= htmlspecialchars($debugInfo) ?></small>
                    <?php endif; ?>
                </div>
            <?php endif; ?>
            
            <?php if (empty($pendingUsers)): ?>
                <div class="empty-state">
                    <h3>No Pending Registrations</h3>
                    <p>All family member registrations have been processed.</p>
                    <p>If you just registered a new account, it should appear here shortly.</p>
                </div>
            <?php else: ?>
                <h2>Pending Registrations (<?= count($pendingUsers) ?>)</h2>
                
                <?php foreach ($pendingUsers as $user): ?>
                    <div class="pending-user">
                        <div class="user-info">
                            <h3>
                                <?= htmlspecialchars($user['display_name']) ?> 
                                (@<?= htmlspecialchars($user['username']) ?>)
                                <span class="connection-badge connection-<?= $user['family_connection'] ?>">
                                    <?= ucfirst($user['family_connection']) ?>
                                </span>
                            </h3>
                            
                            <div class="user-detail">
                                <strong>Email:</strong> <?= htmlspecialchars($user['email'] ?? 'Not provided') ?>
                            </div>
                            
                            <?php if ($user['phone']): ?>
                                <div class="user-detail">
                                    <strong>Phone:</strong> <?= htmlspecialchars($user['phone']) ?>
                                </div>
                            <?php endif; ?>
                            
                            <?php if ($user['birthday']): ?>
                                <div class="user-detail">
                                    <strong>Birthday:</strong> <?= date('F j, Y', strtotime($user['birthday'])) ?>
                                </div>
                            <?php endif; ?>
                            
                            <div class="user-detail">
                                <strong>Family Connection:</strong> <?= ucfirst($user['family_connection']) ?>
                            </div>
                            
                            <div class="user-detail">
                                <strong>Relationship Note:</strong> <?= htmlspecialchars($user['relationship_note']) ?>
                            </div>
                            
                            <div class="user-detail">
                                <strong>Registered:</strong> <?= date('M j, Y g:i A', strtotime($user['created_at'])) ?>
                            </div>
                        </div>
                        
                        <div class="actions">
                            <form method="POST" style="display: inline;" onsubmit="return handleFormSubmit(this);">
                                <input type="hidden" name="action" value="approve">
                                <input type="hidden" name="pending_id" value="<?= $user['id'] ?>">
                                <button type="submit" class="btn btn-primary">
                                    ✅ Approve
                                </button>
                            </form>
                            
                            <form method="POST" style="display: inline;" onsubmit="return handleFormSubmit(this);">
                                <input type="hidden" name="action" value="reject">
                                <input type="hidden" name="pending_id" value="<?= $user['id'] ?>">
                                <input type="text" name="reason" placeholder="Reason for rejection" style="margin-right: 5px;">
                                <button type="submit" class="btn btn-outline" 
                                       onclick="return confirm('Are you sure you want to reject this registration?')">
                                    ❌ Reject
                                </button>
                            </form>
                        </div>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>
            
            <div style="margin-top: 30px;">
                <a href="admin_user_management.php" class="btn btn-secondary">User Management</a>
                <a href="index.php" class="btn btn-secondary">Back to Dashboard</a>
            </div>
        </div>
    </main>
    
    <script src="js/header.js"></script>
    <script>
        // Prevent double form submission
        let formSubmitting = false;
        
        function handleFormSubmit(form) {
            if (formSubmitting) {
                console.log('Form already submitting, preventing duplicate submission');
                return false;
            }
            
            formSubmitting = true;
            
            // Disable all submit buttons to prevent double-click
            const submitButtons = form.querySelectorAll('button[type="submit"]');
            submitButtons.forEach(btn => {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            });
            
            // Show loading indicator in the button
            const primaryBtn = form.querySelector('.btn-primary, .btn');
            if (primaryBtn) {
                const originalText = primaryBtn.innerHTML;
                primaryBtn.innerHTML = '⏳ Processing...';
            }
            
            return true;
        }
    </script>
</body>
</html>