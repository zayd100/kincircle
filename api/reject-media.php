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
    $reviewerNotes = $data['reviewerNotes'] ?? 'No reason provided';
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

    // Delete from R2
    $r2 = new R2();
    $r2->deleteObject($submission['storage_key']);

    // Update submission status
    $updateStmt = $pdo->prepare("
        UPDATE photo_submissions
        SET status = 'rejected',
            reviewer_notes = ?,
            reviewed_by = ?,
            reviewed_at = NOW()
        WHERE id = ?
    ");

    $updateStmt->execute([$reviewerNotes, $reviewerId, $mediaId]);

    echo json_encode([
        'success' => true,
        'message' => 'Media rejected successfully',
        'id' => $mediaId,
        'filename' => $filename
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
