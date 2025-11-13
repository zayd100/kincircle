<?php
// Bootstrap script to create the first admin user
// DELETE THIS FILE AFTER USE!

require_once "config.php";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nameField = sanitizeInput($_POST['name_field'] ?? '');
    $beverageField = sanitizeInput($_POST['beverage_field'] ?? '');
    $numberField = sanitizeInput($_POST['number_field'] ?? '');
    $displayName = sanitizeInput($_POST['display_name'] ?? '');
    $email = sanitizeInput($_POST['email'] ?? '');
    $username = sanitizeInput($_POST['username'] ?? '');
    
    if ($nameField && $beverageField && $numberField && $displayName && $username) {
        $threeFieldPassword = $nameField . '|' . $beverageField . '|' . $numberField;
        $passwordHash = password_hash($threeFieldPassword, PASSWORD_DEFAULT);
        
        try {
            $stmt = $pdo->prepare("INSERT INTO users (username, password_hash, display_name, email, is_admin, password_type) VALUES (?, ?, ?, ?, 1, 'three_field')");
            $stmt->execute([$username, $passwordHash, $displayName, $email]);
            
            echo "<h1>✅ Admin User Created Successfully!</h1>";
            echo "<p><strong>Username:</strong> " . htmlspecialchars($username) . "</p>";
            echo "<p><strong>Login with:</strong></p>";
            echo "<ul>";
            echo "<li><strong>Name:</strong> " . htmlspecialchars($nameField) . "</li>";
            echo "<li><strong>Beverage:</strong> " . htmlspecialchars($beverageField) . "</li>";
            echo "<li><strong>Number:</strong> " . htmlspecialchars($numberField) . "</li>";
            echo "</ul>";
            echo "<p><a href='login.php'>Go to Login</a></p>";
            echo "<p><strong style='color: red;'>IMPORTANT: Delete this file (bootstrap_admin.php) now for security!</strong></p>";
            
        } catch (PDOException $e) {
            echo "<h1>❌ Error</h1>";
            echo "<p>" . htmlspecialchars($e->getMessage()) . "</p>";
        }
    } else {
        echo "<h1>❌ Missing Fields</h1>";
        echo "<p>Please fill in all fields.</p>";
    }
    exit;
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>Bootstrap Admin User</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; }
        input { width: 100%; padding: 10px; margin: 5px 0; box-sizing: border-box; }
        button { width: 100%; padding: 15px; background: #6366f1; color: white; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #4338ca; }
        .warning { background: #fee; border: 1px solid #fcc; padding: 15px; margin: 10px 0; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="warning">
        <strong>⚠️ SECURITY WARNING:</strong> This is a one-time bootstrap script. Delete this file immediately after creating your admin account!
    </div>
    
    <h1>Create First Admin User</h1>
    <form method="POST">
        <label>Username:</label>
        <input type="text" name="username" required>
        
        <label>Display Name:</label>
        <input type="text" name="display_name" required>
        
        <label>Email:</label>
        <input type="email" name="email" required>
        
        <h3>Three-Field Password:</h3>
        <label>Name:</label>
        <input type="text" name="name_field" placeholder="Your name" required>
        
        <label>Beverage:</label>
        <input type="text" name="beverage_field" placeholder="Favorite drink" required>
        
        <label>Number:</label>
        <input type="text" name="number_field" placeholder="Any number" required>
        
        <button type="submit">Create Admin User</button>
    </form>
</body>
</html>