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

// Handle user deletion
if ($_POST['action'] ?? '' === 'delete_user') {
    $userId = (int)$_POST['user_id'];

    // Prevent admins from deleting themselves
    if ($userId === $_SESSION['user_id']) {
        $message = "You cannot delete your own account! Please have another admin do this if necessary.";
        $messageType = 'error';
    } else {
        try {
            // Delete user from all related tables
            // Column names verified against rwdata_actual.sql (Dec 2025)
            $pdo->beginTransaction();

            // === TABLES WITH CASCADE DELETE (handled automatically, but explicit is safer) ===

            // photo_tags: tagged_by_user_id (has ON DELETE CASCADE)
            try {
                $stmt = $pdo->prepare("DELETE FROM photo_tags WHERE tagged_by_user_id = ?");
                $stmt->execute([$userId]);
            } catch (Exception $e) { /* Table might not exist */ }

            // content_tags: tagged_by_user_id (has ON DELETE CASCADE)
            try {
                $stmt = $pdo->prepare("DELETE FROM content_tags WHERE tagged_by_user_id = ?");
                $stmt->execute([$userId]);
            } catch (Exception $e) { /* Table might not exist */ }

            // people: created_by_user_id (has ON DELETE CASCADE)
            try {
                $stmt = $pdo->prepare("DELETE FROM people WHERE created_by_user_id = ?");
                $stmt->execute([$userId]);
            } catch (Exception $e) { /* Table might not exist */ }

            // event_commitments: user_id (has ON DELETE CASCADE)
            try {
                $stmt = $pdo->prepare("DELETE FROM event_commitments WHERE user_id = ?");
                $stmt->execute([$userId]);
            } catch (Exception $e) { /* Table might not exist */ }

            // private_messages: sender_id, recipient_id (has ON DELETE CASCADE)
            try {
                $stmt = $pdo->prepare("DELETE FROM private_messages WHERE sender_id = ? OR recipient_id = ?");
                $stmt->execute([$userId, $userId]);
            } catch (Exception $e) { /* Table might not exist */ }

            // family_inferences: person_user_id, related_user_id (has ON DELETE CASCADE)
            try {
                $stmt = $pdo->prepare("DELETE FROM family_inferences WHERE person_user_id = ? OR related_user_id = ?");
                $stmt->execute([$userId, $userId]);
            } catch (Exception $e) { /* Table might not exist */ }

            // family_relationships: claimer_user_id, claimed_user_id (has ON DELETE CASCADE)
            try {
                $stmt = $pdo->prepare("DELETE FROM family_relationships WHERE claimer_user_id = ? OR claimed_user_id = ?");
                $stmt->execute([$userId, $userId]);
            } catch (Exception $e) { /* Table might not exist */ }

            // relationship_notifications: user_id (has ON DELETE CASCADE)
            try {
                $stmt = $pdo->prepare("DELETE FROM relationship_notifications WHERE user_id = ?");
                $stmt->execute([$userId]);
            } catch (Exception $e) { /* Table might not exist */ }

            // === TABLES WITHOUT CASCADE (must handle manually) ===

            // messages: posted_by (NO CASCADE)
            try {
                $stmt = $pdo->prepare("DELETE FROM messages WHERE posted_by = ?");
                $stmt->execute([$userId]);
            } catch (Exception $e) { /* Table might not exist */ }

            // message_replies: posted_by (NO CASCADE)
            try {
                $stmt = $pdo->prepare("DELETE FROM message_replies WHERE posted_by = ?");
                $stmt->execute([$userId]);
            } catch (Exception $e) { /* Table might not exist */ }

            // photo_submissions: uploader_id (NO CASCADE)
            try {
                $stmt = $pdo->prepare("DELETE FROM photo_submissions WHERE uploader_id = ?");
                $stmt->execute([$userId]);
            } catch (Exception $e) { /* Table might not exist */ }

            // memorial_submissions: submitted_by (NO CASCADE) - NOT submitter_id!
            try {
                $stmt = $pdo->prepare("DELETE FROM memorial_submissions WHERE submitted_by = ?");
                $stmt->execute([$userId]);
            } catch (Exception $e) { /* Table might not exist */ }

            // memorials: created_by (NO CASCADE)
            try {
                $stmt = $pdo->prepare("DELETE FROM memorials WHERE created_by = ?");
                $stmt->execute([$userId]);
            } catch (Exception $e) { /* Table might not exist */ }

            // calendar_events: created_by (NO CASCADE)
            try {
                $stmt = $pdo->prepare("DELETE FROM calendar_events WHERE created_by = ?");
                $stmt->execute([$userId]);
            } catch (Exception $e) { /* Table might not exist */ }

            // event_submissions: submitter_id (NO CASCADE)
            try {
                $stmt = $pdo->prepare("DELETE FROM event_submissions WHERE submitter_id = ?");
                $stmt->execute([$userId]);
            } catch (Exception $e) { /* Table might not exist */ }

            // recipe_modifications: modified_by (NO CASCADE)
            try {
                $stmt = $pdo->prepare("DELETE FROM recipe_modifications WHERE modified_by = ?");
                $stmt->execute([$userId]);
            } catch (Exception $e) { /* Table might not exist */ }

            // recipes: created_by (NO CASCADE)
            try {
                $stmt = $pdo->prepare("DELETE FROM recipes WHERE created_by = ?");
                $stmt->execute([$userId]);
            } catch (Exception $e) { /* Table might not exist */ }

            // albums: created_by (NO CASCADE)
            try {
                $stmt = $pdo->prepare("DELETE FROM albums WHERE created_by = ?");
                $stmt->execute([$userId]);
            } catch (Exception $e) { /* Table might not exist */ }

            // === SET NULL for reviewer/admin references ===

            // admin_messages: resolved_by
            try {
                $stmt = $pdo->prepare("UPDATE admin_messages SET resolved_by = NULL WHERE resolved_by = ?");
                $stmt->execute([$userId]);
            } catch (Exception $e) { /* Table might not exist */ }

            // pending_users: reviewed_by
            try {
                $stmt = $pdo->prepare("UPDATE pending_users SET reviewed_by = NULL WHERE reviewed_by = ?");
                $stmt->execute([$userId]);
            } catch (Exception $e) { /* Table might not exist */ }

            // photo_submissions: reviewed_by
            try {
                $stmt = $pdo->prepare("UPDATE photo_submissions SET reviewed_by = NULL WHERE reviewed_by = ?");
                $stmt->execute([$userId]);
            } catch (Exception $e) { /* Table might not exist */ }

            // event_submissions: reviewed_by
            try {
                $stmt = $pdo->prepare("UPDATE event_submissions SET reviewed_by = NULL WHERE reviewed_by = ?");
                $stmt->execute([$userId]);
            } catch (Exception $e) { /* Table might not exist */ }

            // memorial_submissions: reviewed_by
            try {
                $stmt = $pdo->prepare("UPDATE memorial_submissions SET reviewed_by = NULL WHERE reviewed_by = ?");
                $stmt->execute([$userId]);
            } catch (Exception $e) { /* Table might not exist */ }

            // family_relationships: revoked_by (has ON DELETE SET NULL, but be explicit)
            try {
                $stmt = $pdo->prepare("UPDATE family_relationships SET revoked_by = NULL WHERE revoked_by = ?");
                $stmt->execute([$userId]);
            } catch (Exception $e) { /* Table might not exist */ }

            // relationship_notifications: claimer_user_id (has ON DELETE SET NULL)
            try {
                $stmt = $pdo->prepare("UPDATE relationship_notifications SET claimer_user_id = NULL WHERE claimer_user_id = ?");
                $stmt->execute([$userId]);
            } catch (Exception $e) { /* Table might not exist */ }

            // Finally delete from users table
            $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
            $stmt->execute([$userId]);

            $pdo->commit();

            $message = "User deleted successfully! All related content has been removed.";
            $messageType = 'success';

        } catch (Exception $e) {
            $pdo->rollBack();
            $message = "Error deleting user: " . $e->getMessage();
            $messageType = 'error';
        }
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
            <p>Manage admin privileges and user accounts for family members.</p>
            
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

                                <?php if ($_SESSION['user_id'] != $user['id']): ?>
                                <form method="POST" class="toggle-form" style="display: inline; margin-left: 5px;">
                                    <input type="hidden" name="action" value="delete_user">
                                    <input type="hidden" name="user_id" value="<?= $user['id'] ?>">
                                    <button type="submit" class="btn btn-outline"
                                            style="background: #fee2e2; color: #991b1b; border-color: #ef4444;"
                                            onclick="return confirm('Are you sure you want to delete <?= htmlspecialchars($user['display_name']) ?>? This will permanently delete all their content and cannot be undone!')">
                                        Delete User
                                    </button>
                                </form>
                                <?php endif; ?>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>

            <div style="margin-top: 20px;">
                <a href="admin.php" class="btn btn-secondary">Back to Admin Dashboard</a>
                <a href="index.php" class="btn btn-primary">Back to Main Dashboard</a>
            </div>
        </div>
    </main>
    
    <script src="js/header.js"></script>
</body>
</html>