<?php
require_once '../config.php';
requireLogin();

header('Content-Type: application/json');

// Admin-only access
if (!isAdmin()) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Admin access required']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

try {
    $data = json_decode(file_get_contents('php://input'), true);

    $filename = $data['filename'] ?? '';
    $album = $data['album'] ?? '';

    if (empty($filename)) {
        throw new Exception('Filename is required');
    }

    if (empty($album)) {
        throw new Exception('Album is required');
    }

    // Construct file path
    $filePath = '../uploads/albums/' . $album . '/' . $filename;

    error_log("Attempting to delete photo: $filePath");

    if (!file_exists($filePath)) {
        error_log("Photo file not found: $filePath");
        throw new Exception('Photo file not found');
    }

    // Delete the file
    if (!unlink($filePath)) {
        error_log("Failed to delete photo file: $filePath");
        throw new Exception('Failed to delete photo file');
    }

    error_log("Successfully deleted photo: $filePath");

    // Optionally update database if photo is tracked there
    try {
        $stmt = $pdo->prepare("DELETE FROM photo_submissions WHERE filename = ?");
        $stmt->execute([$filename]);
    } catch (Exception $e) {
        // Database entry might not exist, that's okay
        error_log("Note: Could not delete from database: " . $e->getMessage());
    }

    echo json_encode([
        'success' => true,
        'message' => 'Photo deleted successfully'
    ]);

} catch (Exception $e) {
    error_log("Delete photo error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
