<?php
// Start with just config to get session
require_once "config.php";

// Don't use requireLogin - we want to see the actual state
?>
<!DOCTYPE html>
<html>
<head>
    <title>Session Test</title>
</head>
<body>
    <h1>Session Debug</h1>
    <pre>
Session ID: <?= htmlspecialchars(session_id()) ?>
Session Name: <?= htmlspecialchars(session_name()) ?>

isLoggedIn(): <?= isLoggedIn() ? 'YES' : 'NO' ?>
isAdmin(): <?= isAdmin() ? 'YES' : 'NO' ?>

Session Data:
<?= htmlspecialchars(print_r($_SESSION, true)) ?>

Cookie Data:
<?= htmlspecialchars(print_r($_COOKIE, true)) ?>
    </pre>
    
    <h2>Test Links</h2>
    <ul>
        <li><a href="index.php">Index (should work)</a></li>
        <li><a href="photos.php">Photos (should work)</a></li>
        <li><a href="calendar.php">Calendar (problematic?)</a></li>
        <li><a href="board.php">Board (problematic?)</a></li>
    </ul>
</body>
</html>