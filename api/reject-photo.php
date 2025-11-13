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
    $reviewerNotes = $data['reviewerNotes'] ?? '';
    $reviewerId = $_SESSION['user_id'];

    if (!$filename) {
        throw new Exception('Filename is required');
    }

    if (empty($reviewerNotes)) {
        throw new Exception('Reviewer notes are required for rejection');
    }

    // Get submission details
    $stmt = $pdo->prepare("SELECT * FROM photo_submissions WHERE filename = ? AND status = 'pending'");
    $stmt->execute([$filename]);
    $submission = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$submission) {
        throw new Exception('Submission not found or already processed');
    }

    // Delete file from pending directory
    $pendingPath = '../uploads/pending/' . $filename;

    if (file_exists($pendingPath)) {
        unlink($pendingPath);
    }

    // Update submission status
    $updateStmt = $pdo->prepare("
        UPDATE photo_submissions
        SET status = 'rejected',
            reviewer_notes = ?,
            reviewed_by = ?,
            reviewed_at = NOW()
        WHERE filename = ?
    ");

    $updateStmt->execute([$reviewerNotes, $reviewerId, $filename]);

    // TODO: Optionally notify uploader about rejection

    echo json_encode([
        'success' => true,
        'message' => 'Photo rejected successfully',
        'filename' => $filename
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
