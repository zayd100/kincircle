<?php
/**
 * Confirm upload completion and record in database
 *
 * Called after client successfully uploads to R2.
 * Records file metadata and context in photo_submissions table.
 */

require_once '../config.php';
require_once '../lib/R2.php';

requireLogin();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

try {
    $data = json_decode(file_get_contents('php://input'), true);

    // File info (from get-upload-url response)
    $storageKey = $data['key'] ?? '';
    $originalName = $data['original_name'] ?? '';
    $fileType = $data['file_type'] ?? '';
    $fileSize = intval($data['file_size'] ?? 0);
    $uploadType = $data['upload_type'] ?? 'photo';

    // Context info (from form)
    $eventName = sanitizeInput($data['event_name'] ?? '');
    $dateTaken = sanitizeInput($data['date_taken'] ?? $data['media_date'] ?? '');
    $peopleTagged = sanitizeInput($data['people_in_photo'] ?? $data['people_in_media'] ?? '');
    $description = sanitizeInput($data['description'] ?? '');
    $suggestedAlbum = sanitizeInput($data['suggested_album'] ?? $data['media_category'] ?? '');

    // Validate required fields
    if (!$storageKey || !$originalName || !$fileType) {
        throw new Exception('Missing required file information');
    }

    if (!$eventName) {
        throw new Exception('Event name is required');
    }

    // Verify the file actually exists in R2
    $r2 = new R2();
    if (!$r2->objectExists($storageKey)) {
        throw new Exception('File not found in storage. Upload may have failed.');
    }

    // Extract just the filename from the storage key for database
    $filename = basename($storageKey);

    // Record in database
    $stmt = $pdo->prepare("
        INSERT INTO photo_submissions (
            filename,
            original_name,
            file_type,
            mime_type,
            file_size,
            storage_key,
            storage_provider,
            event_name,
            date_taken,
            people_in_photo,
            description,
            suggested_album,
            uploader_id,
            status,
            uploaded_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'r2', ?, ?, ?, ?, ?, ?, 'pending', NOW())
    ");

    $stmt->execute([
        $filename,
        $originalName,
        $fileType,
        $fileType,  // mime_type = same as file_type
        $fileSize,
        $storageKey,
        $eventName,
        $dateTaken,
        $peopleTagged,
        $description,
        $suggestedAlbum,
        $_SESSION['user_id']
    ]);

    $submissionId = $pdo->lastInsertId();

    echo json_encode([
        'success' => true,
        'message' => 'Upload confirmed',
        'submission_id' => $submissionId,
        'filename' => $originalName
    ]);

} catch (Exception $e) {
    error_log("Upload confirmation error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
