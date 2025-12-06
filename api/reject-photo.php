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
    $reviewerNotes = $data['reviewerNotes'] ?? '';
    $reviewerId = $_SESSION['user_id'];

    if (!$submissionId && !$filename) {
        throw new Exception('Submission ID or filename required');
    }

    if (empty($reviewerNotes)) {
        throw new Exception('Reviewer notes are required for rejection');
    }

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

    // Delete from R2
    $r2 = new R2();
    $r2->deleteObject($submission['storage_key']);

    // Clean up any tags on this photo (since file is being deleted)
    $stmt = $pdo->prepare("DELETE FROM photo_tags WHERE photo_id = ?");
    $stmt->execute([$submission['id']]);

    $stmt = $pdo->prepare("DELETE FROM content_tags WHERE content_type = 'photo' AND content_id = ?");
    $stmt->execute([$submission['id']]);

    // Update submission status using ID
    $updateStmt = $pdo->prepare("
        UPDATE photo_submissions
        SET status = 'rejected',
            reviewer_notes = ?,
            reviewed_by = ?,
            reviewed_at = NOW()
        WHERE id = ?
    ");

    $updateStmt->execute([$reviewerNotes, $reviewerId, $submission['id']]);

    echo json_encode([
        'success' => true,
        'message' => 'Photo rejected successfully',
        'id' => $submission['id']
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
