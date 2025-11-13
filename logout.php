<?php
require_once "config.php";

// Complete poltergeist exorcism - destroy all session data
$_SESSION = array();

// Delete the session cookie completely
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

// Destroy the session completely
session_destroy();

// Clear any other family-related cookies that might exist
setcookie('remember_token', '', time() - 42000, '/');
setcookie('ReedWeaverFamily', '', time() - 42000, '/');

// Redirect to login with a clean slate
header('Location: login.php?logged_out=1');
exit;
?>