<?php
require_once "config.php";
requireLogin();

// Only existing admins can access this page
if (!isAdmin()) {
    header('Location: index.php?error=admin_required');
    exit;
}

$message = '';
$messageType = '';

// Handle admin toggle
if ($_POST['action'] ?? '' === 'toggle_admin') {
    $userId = (int)$_POST['user_id'];
    $makeAdmin = $_POST['make_admin'] === '1' ? 1 : 0;
    
    try {
        $stmt = $pdo->prepare("UPDATE users SET is_admin = ? WHERE id = ?");
        $stmt->execute([$makeAdmin, $userId]);
        
        $action = $makeAdmin ? 'granted' : 'removed';
        $message = "Admin privileges {$action} successfully!";
        $messageType = 'success';
        
    } catch (Exception $e) {
        $message = "Error updating admin status: " . $e->getMessage();
        $messageType = 'error';
    }
}

// Get all users
try {
    $stmt = $pdo->query("SELECT id, username, display_name, email, is_admin, created_at FROM users ORDER BY created_at DESC");
    $users = $stmt->fetchAll();
} catch (Exception $e) {
    $message = "Error loading users: " . $e->getMessage();
    $messageType = 'error';
    $users = [];
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin User Management - Reed & Weaver Family Hub</title>
    <link rel="stylesheet" href="css/main.css">
    <style>
        .user-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .user-table th,
        .user-table td {
            padding: 12px;
            border: 1px solid var(--glass-border);
            text-align: left;
        }
        .user-table th {
            background: var(--glass-bg);
            font-weight: bold;
        }
        .admin-badge {
            background: #10b981;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
        }
        .regular-badge {
            background: #6b7280;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
        }
        .toggle-form {
            display: inline-block;
            margin-left: 10px;
        }
        .message {
            padding: 10px;
            border-radius: 8px;
            margin: 10px 0;
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
        .current-user {
            background: #fef3c7;
        }
        .warning {
            background: #fef3c7;
            color: #92400e;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border: 1px solid #f59e0b;
        }
    </style>
</head>
<body>
    <main class="main-content">
        <div class="container">
            <h1 class="page-title">🔑 Admin User Management</h1>
            <p>Manage admin privileges for family members. Use this to banish poltergeist accounts and grant proper admin access.</p>
            
            <?php if ($message): ?>
                <div class="message <?= $messageType ?>">
                    <?= htmlspecialchars($message) ?>
                </div>
            <?php endif; ?>
            
            <div class="warning">
                <strong>⚠️ Important:</strong> Only grant admin privileges to family members you trust completely. 
                Admins can add/remove content, manage users, and access all family data.
            </div>
            
            <table class="user-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Username</th>
                        <th>Display Name</th>
                        <th>Email</th>
                        <th>Admin Status</th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($users as $user): ?>
                        <tr <?= $_SESSION['user_id'] == $user['id'] ? 'class="current-user"' : '' ?>>
                            <td><?= $user['id'] ?></td>
                            <td>
                                <?= htmlspecialchars($user['username']) ?>
                                <?php if ($_SESSION['user_id'] == $user['id']): ?>
                                    <small>(You)</small>
                                <?php endif; ?>
                            </td>
                            <td><?= htmlspecialchars($user['display_name']) ?></td>
                            <td><?= htmlspecialchars($user['email'] ?? 'Not provided') ?></td>
                            <td>
                                <?php if ($user['is_admin']): ?>
                                    <span class="admin-badge">Admin</span>
                                <?php else: ?>
                                    <span class="regular-badge">Regular User</span>
                                <?php endif; ?>
                            </td>
                            <td><?= date('M j, Y', strtotime($user['created_at'])) ?></td>
                            <td>
                                <form method="POST" class="toggle-form" style="display: inline;">
                                    <input type="hidden" name="action" value="toggle_admin">
                                    <input type="hidden" name="user_id" value="<?= $user['id'] ?>">
                                    
                                    <?php if ($user['is_admin']): ?>
                                        <input type="hidden" name="make_admin" value="0">
                                        <button type="submit" class="btn btn-outline" 
                                               <?= $_SESSION['user_id'] == $user['id'] ? 'onclick="return confirm(\'Remove your own admin privileges? You won\\\'t be able to access this page after!\')"' : '' ?>>
                                            Remove Admin
                                        </button>
                                    <?php else: ?>
                                        <input type="hidden" name="make_admin" value="1">
                                        <button type="submit" class="btn btn-primary">
                                            Make Admin
                                        </button>
                                    <?php endif; ?>
                                </form>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
            
            <div style="margin-top: 30px;">
                <h3>Next Steps</h3>
                <ol>
                    <li><strong>Grant yourself admin privileges</strong> if you're not already an admin</li>
                    <li><strong>Logout completely</strong> using the logout link</li>
                    <li><strong>Register a new account</strong> properly through the registration system</li>
                    <li><strong>Have an existing admin approve your new account</strong></li>
                    <li><strong>Login with your new account</strong> and test that everything works</li>
                    <li><strong>Delete the poltergeist account</strong> once the new one is working</li>
                </ol>
            </div>
            
            <div style="margin-top: 20px;">
                <a href="index.php" class="btn btn-secondary">Back to Dashboard</a>
                <a href="logout.php" class="btn btn-primary">Complete Logout (Exorcise Poltergeist)</a>
            </div>
        </div>
    </main>
    
    <script src="js/header.js"></script>
</body>
</html>