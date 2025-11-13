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
    $fromAlbum = $data['from_album'] ?? '';
    $toAlbum = $data['to_album'] ?? '';

    if (!$filename || !$fromAlbum || !$toAlbum) {
        throw new Exception('Filename, from_album, and to_album are required');
    }

    if ($fromAlbum === $toAlbum) {
        throw new Exception('Source and destination albums cannot be the same');
    }

    // Find the photo submission
    $stmt = $pdo->prepare("
        SELECT * FROM photo_submissions
        WHERE filename = ? AND final_album = ? AND status = 'approved'
    ");
    $stmt->execute([$filename, $fromAlbum]);
    $submission = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$submission) {
        throw new Exception('Photo not found in source album');
    }

    // Define file paths
    $fromPath = '../uploads/albums/' . $fromAlbum . '/' . $filename;
    $toAlbumDir = '../uploads/albums/' . $toAlbum;
    $toPath = $toAlbumDir . '/' . $filename;

    error_log("Moving photo:");
    error_log("  From: $fromPath");
    error_log("  To: $toPath");

    // Check if source file exists
    if (!file_exists($fromPath)) {
        error_log("ERROR: Source file not found: $fromPath");
        throw new Exception('Source photo file not found');
    }

    // Ensure destination album directory exists
    if (!is_dir($toAlbumDir)) {
        error_log("Creating destination album directory: $toAlbumDir");
        if (!mkdir($toAlbumDir, 0777, true)) {
            error_log("ERROR: Failed to create destination album directory");
            throw new Exception('Failed to create destination album directory');
        }
        chmod($toAlbumDir, 0777);
    }

    // Check if file already exists in destination
    if (file_exists($toPath)) {
        throw new Exception('A photo with this filename already exists in the destination album');
    }

    // Move the file
    if (!rename($fromPath, $toPath)) {
        $error = error_get_last();
        error_log("ERROR: Failed to move photo file: " . print_r($error, true));
        throw new Exception('Failed to move photo file - check permissions');
    }

    // Set file permissions
    chmod($toPath, 0666);
    error_log("Successfully moved photo to new album");

    // Update database
    $updateStmt = $pdo->prepare("
        UPDATE photo_submissions
        SET final_album = ?
        WHERE filename = ? AND final_album = ?
    ");
    $updateStmt->execute([$toAlbum, $filename, $fromAlbum]);

    echo json_encode([
        'success' => true,
        'message' => 'Photo moved successfully',
        'filename' => $filename,
        'from_album' => $fromAlbum,
        'to_album' => $toAlbum
    ]);

} catch (Exception $e) {
    error_log("Error moving photo: " . $e->getMessage());
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
