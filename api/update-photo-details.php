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
    $title = $data['title'] ?? null;
    $description = $data['description'] ?? null;
    $date = $data['date'] ?? null;
    $event = $data['event'] ?? null;

    if (!$filename || !$album) {
        throw new Exception('Filename and album are required');
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

    // Build update query dynamically based on provided fields
    $updateFields = [];
    $updateValues = [];

    if ($title !== null) {
        $updateFields[] = "photo_title = ?";
        $updateValues[] = $title;
    }

    if ($description !== null) {
        $updateFields[] = "photo_description = ?";
        $updateValues[] = $description;
    }

    if ($date !== null) {
        $updateFields[] = "date_taken = ?";
        $updateValues[] = $date;
    }

    if ($event !== null) {
        $updateFields[] = "event_name = ?";
        $updateValues[] = $event;
    }

    if (empty($updateFields)) {
        throw new Exception('No fields to update');
    }

    // Add filename to WHERE clause
    $updateValues[] = $filename;
    $updateValues[] = $album;

    $updateStmt = $pdo->prepare("
        UPDATE photo_submissions
        SET " . implode(', ', $updateFields) . "
        WHERE filename = ? AND final_album = ?
    ");

    $updateStmt->execute($updateValues);

    error_log("Updated photo details for: $filename in album: $album");

    echo json_encode([
        'success' => true,
        'message' => 'Photo details updated successfully',
        'filename' => $filename,
        'album' => $album
    ]);

} catch (Exception $e) {
    error_log("Error updating photo details: " . $e->getMessage());
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
