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

    $mediaId = $data['id'] ?? '';
    $category = $data['category'] ?? $data['album'] ?? '';
    $reviewerNotes = $data['reviewerNotes'] ?? '';
    $reviewerId = $_SESSION['user_id'];

    if (!$mediaId) {
        throw new Exception('Media ID is required');
    }

    // Get submission details
    $stmt = $pdo->prepare("SELECT * FROM photo_submissions WHERE id = ? AND status = 'pending'");
    $stmt->execute([$mediaId]);
    $submission = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$submission) {
        throw new Exception('Submission not found or already processed');
    }

    $filename = $submission['filename'];

    // Use suggested_album if category not provided
    if (!$category) {
        $category = $submission['suggested_album'] ?: 'general-media';
    }

    // Prevent path traversal attacks
    if (strpos($filename, '..') !== false || strpos($filename, '/') !== false || strpos($filename, '\\') !== false) {
        throw new Exception('Invalid filename');
    }

    if (strpos($category, '..') !== false || strpos($category, '/') !== false || strpos($category, '\\') !== false) {
        throw new Exception('Invalid category name');
    }

    // Sanitize category name for use as path component
    $safeCategory = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $category);

    // R2 Storage: Copy from pending to approved path
    $r2 = new R2();
    $storageKey = $submission['storage_key'];
    $approvedKey = 'approved/media/' . $safeCategory . '/' . $filename;

    if (!$r2->objectExists($storageKey)) {
        throw new Exception('Media file not found in R2 storage');
    }

    if (!$r2->copyObject($storageKey, $approvedKey)) {
        throw new Exception('Failed to copy media to approved location in R2');
    }

    $r2->deleteObject($storageKey);

    // Update storage key in database
    $updateKeyStmt = $pdo->prepare("UPDATE photo_submissions SET storage_key = ? WHERE id = ?");
    $updateKeyStmt->execute([$approvedKey, $mediaId]);

    // Update submission status
    $updateStmt = $pdo->prepare("
        UPDATE photo_submissions
        SET status = 'approved',
            final_album = ?,
            reviewer_notes = ?,
            reviewed_by = ?,
            reviewed_at = NOW()
        WHERE id = ?
    ");

    $updateStmt->execute([$category, $reviewerNotes, $reviewerId, $mediaId]);

    echo json_encode([
        'success' => true,
        'message' => 'Media approved successfully',
        'id' => $mediaId,
        'filename' => $filename,
        'category' => $category
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
