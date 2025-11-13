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
    $dateTaken = $data['date_taken'] ?? null;

    if (!$filename || !$album) {
        throw new Exception('Filename and album are required');
    }

    if ($dateTaken === null) {
        throw new Exception('Date is required');
    }

    // Find the photo submission by filename and album
    $stmt = $pdo->prepare("
        SELECT * FROM photo_submissions
        WHERE filename = ? AND final_album = ? AND status = 'approved'
    ");
    $stmt->execute([$filename, $album]);
    $submission = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$submission) {
        throw new Exception('Photo not found in specified album');
    }

    // Update the date
    $updateStmt = $pdo->prepare("
        UPDATE photo_submissions
        SET date_taken = ?
        WHERE filename = ? AND final_album = ?
    ");

    $updateStmt->execute([$dateTaken, $filename, $album]);

    error_log("Updated photo date for: $filename in album: $album to: $dateTaken");

    echo json_encode([
        'success' => true,
        'message' => 'Photo date updated successfully',
        'filename' => $filename,
        'album' => $album,
        'date_taken' => $dateTaken
    ]);

} catch (Exception $e) {
    error_log("Error updating photo date: " . $e->getMessage());
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
