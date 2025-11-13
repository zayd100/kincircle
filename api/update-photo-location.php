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
    $location = $data['location'] ?? null;
    $city = $data['city'] ?? null;
    $state = $data['state'] ?? null;

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

    if ($location !== null) {
        $updateFields[] = "location_name = ?";
        $updateValues[] = $location;
    }

    if ($city !== null) {
        $updateFields[] = "location_city = ?";
        $updateValues[] = $city;
    }

    if ($state !== null) {
        $updateFields[] = "location_state = ?";
        $updateValues[] = $state;
    }

    if (empty($updateFields)) {
        throw new Exception('No location fields to update');
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

    error_log("Updated photo location for: $filename in album: $album");

    echo json_encode([
        'success' => true,
        'message' => 'Photo location updated successfully',
        'filename' => $filename,
        'album' => $album
    ]);

} catch (Exception $e) {
    error_log("Error updating photo location: " . $e->getMessage());
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
