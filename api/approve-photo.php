<?php
require_once '../config.php';
require_once '../lib/R2.php';

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

    $submissionId = $data['id'] ?? '';
    $filename = $data['filename'] ?? '';
    $album = $data['album'] ?? '';
    $reviewerNotes = $data['reviewerNotes'] ?? '';
    $reviewerId = $_SESSION['user_id'];

    if (!$submissionId && !$filename) {
        throw new Exception('Submission ID or filename required');
    }

    if (!$album) {
        throw new Exception('Album is required');
    }

    if (strpos($album, '..') !== false || strpos($album, '/') !== false || strpos($album, '\\') !== false) {
        throw new Exception('Invalid album name');
    }

    // Sanitize album name for use as path component
    $safeAlbum = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $album);

    // Get submission details - prefer ID if available
    if ($submissionId) {
        $stmt = $pdo->prepare("SELECT * FROM photo_submissions WHERE id = ? AND status = 'pending'");
        $stmt->execute([$submissionId]);
    } else {
        $stmt = $pdo->prepare("SELECT * FROM photo_submissions WHERE filename = ? AND status = 'pending'");
        $stmt->execute([$filename]);
    }
    $submission = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$submission) {
        throw new Exception('Submission not found or already processed');
    }

    // R2 Storage: Copy from pending to approved path
    $r2 = new R2();
    $storageKey = $submission['storage_key'];
    // Use the unique filename from the submission record, not the request
    $uniqueFilename = $submission['filename'];
    $approvedKey = 'approved/albums/' . $safeAlbum . '/' . $uniqueFilename;

    if (!$r2->objectExists($storageKey)) {
        throw new Exception('Photo file not found in R2 storage');
    }

    if (!$r2->copyObject($storageKey, $approvedKey)) {
        throw new Exception('Failed to copy photo to approved location in R2');
    }

    $r2->deleteObject($storageKey);

    // Update submission status and storage key using submission ID
    $updateStmt = $pdo->prepare("
        UPDATE photo_submissions
        SET status = 'approved',
            storage_key = ?,
            final_album = ?,
            reviewer_notes = ?,
            reviewed_by = ?,
            reviewed_at = NOW()
        WHERE id = ?
    ");

    $updateStmt->execute([$approvedKey, $album, $reviewerNotes, $reviewerId, $submission['id']]);

    echo json_encode([
        'success' => true,
        'message' => 'Photo approved successfully',
        'filename' => $uniqueFilename,
        'album' => $album
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
