<?php
require_once "config.php";
requireLogin();

if (!isAdmin()) {
    header('Location: index.php?error=admin_required');
    exit;
}

$message = '';
$messageType = '';
$debugInfo = '';

// Debug what was submitted
if ($_POST) {
    $debugInfo = "DEBUG: Form submitted with action='" . ($_POST['action'] ?? 'NONE') . "', pending_id='" . ($_POST['pending_id'] ?? 'NONE') . "'";
}

// Handle form submission - USE ELSEIF to prevent double execution
if ($_POST['action'] ?? '' === 'approve') {
    $debugInfo .= " | EXECUTING APPROVAL CODE ONLY";
    $pendingId = (int)$_POST['pending_id'];
    
    try {
        // Get pending user data
        $stmt = $pdo->prepare("SELECT * FROM pending_users WHERE id = ? AND status = 'pending'");
        $stmt->execute([$pendingId]);
        $pendingUser = $stmt->fetch();
        
        if (!$pendingUser) {
            throw new Exception('Pending user not found or already processed');
        }
        
        // Create user in main table
        $stmt = $pdo->prepare("
            INSERT INTO users (username, password_hash, display_name, email, phone, birthday, 
                             is_admin, password_type, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, 1, ?, NOW())
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
        
        $message = "🎉 SUCCESS! User '{$pendingUser['display_name']}' approved and granted admin privileges! They can now login.";
        $messageType = 'success';
        $debugInfo .= " | APPROVAL COMPLETED | NEW USER ID: $newUserId";
        
    } catch (Exception $e) {
        $message = "❌ Error approving user: " . $e->getMessage();
        $messageType = 'error';
        $debugInfo .= " | ERROR: " . $e->getMessage();
    }

} elseif ($_POST['action'] ?? '' === 'reject') {
    $debugInfo .= " | EXECUTING REJECTION CODE ONLY";
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
        $debugInfo .= " | REJECTION COMPLETED";
        
    } catch (Exception $e) {
        $message = "Error rejecting user: " . $e->getMessage();
        $messageType = 'error';
        $debugInfo .= " | ERROR: " . $e->getMessage();
    }

} elseif ($_POST) {
    $debugInfo .= " | UNKNOWN ACTION: '" . ($_POST['action'] ?? 'NONE') . "'";
    $message = "Unknown action received.";
    $messageType = 'error';
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
    <title>Simple Approve - Reed & Weaver Family Hub</title>
    <link rel="stylesheet" href="css/main.css">
    <style>
        .pending-user {
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            border-radius: 12px;
            padding: 20px;
            margin: 15px 0;
        }
        .message {
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
        }
        .message.success {
            background: #d1fae5;
            color: #065f46;
            border: 2px solid #10b981;
        }
        .message.error {
            background: #fee2e2;
            color: #991b1b;
            border: 2px solid #ef4444;
        }
        .approve-btn {
            background: #10b981;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            font-weight: bold;
            cursor: pointer;
        }
        .debug-info {
            font-family: monospace;
            font-size: 12px;
            color: #666;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <main class="main-content">
        <div class="container">
            <h1 class="page-title">✨ Simple User Approval (No Double Execution)</h1>
            <p>Fixed version that prevents both approve and reject from running simultaneously.</p>
            
            <?php if ($message): ?>
                <div class="message <?= $messageType ?>">
                    <?= htmlspecialchars($message) ?>
                    <?php if ($debugInfo): ?>
                        <div class="debug-info"><?= htmlspecialchars($debugInfo) ?></div>
                    <?php endif; ?>
                </div>
            <?php endif; ?>
            
            <?php if (empty($pendingUsers)): ?>
                <div style="text-align: center; padding: 40px;">
                    <h3>No Pending Registrations</h3>
                    <p>All family member registrations have been processed.</p>
                </div>
            <?php else: ?>
                <h2>Pending Registrations (<?= count($pendingUsers) ?>)</h2>
                
                <?php foreach ($pendingUsers as $user): ?>
                    <div class="pending-user">
                        <h3><?= htmlspecialchars($user['display_name']) ?> (@<?= htmlspecialchars($user['username']) ?>)</h3>
                        
                        <p><strong>Email:</strong> <?= htmlspecialchars($user['email'] ?? 'Not provided') ?></p>
                        <p><strong>Family Connection:</strong> <?= ucfirst($user['family_connection']) ?></p>
                        <p><strong>Relationship:</strong> <?= htmlspecialchars($user['relationship_note']) ?></p>
                        <p><strong>Registered:</strong> <?= date('M j, Y g:i A', strtotime($user['created_at'])) ?></p>
                        
                        <div style="margin-top: 15px;">
                            <form method="POST" style="display: inline-block; margin-right: 10px;">
                                <input type="hidden" name="action" value="approve">
                                <input type="hidden" name="pending_id" value="<?= $user['id'] ?>">
                                <button type="submit" class="approve-btn">
                                    ✅ APPROVE & MAKE ADMIN
                                </button>
                            </form>
                        </div>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>
            
            <div style="margin-top: 30px;">
                <a href="debug_post_data.php" class="btn btn-secondary">Debug POST Data</a>
                <a href="approve_pending_users.php" class="btn btn-secondary">Original Approval Page</a>
                <a href="index.php" class="btn btn-secondary">Dashboard</a>
            </div>
        </div>
    </main>
    
    <script src="js/header.js"></script>
</body>
</html>