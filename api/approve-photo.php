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
    $reviewerNotes = $data['reviewerNotes'] ?? '';
    $reviewerId = $_SESSION['user_id'];

    if (!$filename || !$album) {
        throw new Exception('Filename and album are required');
    }

    // Get submission details
    $stmt = $pdo->prepare("SELECT * FROM photo_submissions WHERE filename = ? AND status = 'pending'");
    $stmt->execute([$filename]);
    $submission = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$submission) {
        throw new Exception('Submission not found or already processed');
    }

    // Move file from pending to album directory
    $pendingPath = '../uploads/pending/' . $filename;
    $albumPath = '../uploads/albums/' . $album;
    $approvedPath = $albumPath . '/' . $filename;

    error_log("Attempting to approve photo:");
    error_log("  Pending path: $pendingPath");
    error_log("  Album path: $albumPath");
    error_log("  Approved path: $approvedPath");

    if (!file_exists($pendingPath)) {
        error_log("ERROR: Photo file not found at: $pendingPath");
        throw new Exception('Photo file not found in pending directory');
    }

    // Ensure album directory exists
    if (!is_dir($albumPath)) {
        error_log("Creating album directory: $albumPath");
        if (!mkdir($albumPath, 0777, true)) {
            error_log("ERROR: Failed to create album directory");
            throw new Exception('Failed to create album directory');
        }
        chmod($albumPath, 0777);
    }

    // Move the file
    error_log("Moving file from $pendingPath to $approvedPath");
    if (!rename($pendingPath, $approvedPath)) {
        $error = error_get_last();
        error_log("ERROR: Failed to move photo file: " . print_r($error, true));
        throw new Exception('Failed to move photo file - check permissions');
    }

    // Set file permissions
    chmod($approvedPath, 0666);
    error_log("Successfully moved and set permissions on photo");

    // Update submission status
    $updateStmt = $pdo->prepare("
        UPDATE photo_submissions
        SET status = 'approved',
            final_album = ?,
            reviewer_notes = ?,
            reviewed_by = ?,
            reviewed_at = NOW()
        WHERE filename = ?
    ");

    $updateStmt->execute([$album, $reviewerNotes, $reviewerId, $filename]);

    // TODO: Add photo to the actual album/gallery system
    // This would involve creating entries in a photos table or similar

    echo json_encode([
        'success' => true,
        'message' => 'Photo approved successfully',
        'filename' => $filename,
        'album' => $album
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
