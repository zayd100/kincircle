<?php
require_once __DIR__ . '/../config.php';
requireLogin();

header('Content-Type: application/json');

try {
    // Only admins can see pending media
    if (!isAdmin()) {
        echo json_encode(['success' => true, 'submissions' => []]);
        exit;
    }

    // Get pending media submissions (non-images only)
    $stmt = $pdo->prepare("
        SELECT ps.*, u.display_name as uploader_name
        FROM photo_submissions ps
        JOIN users u ON ps.uploader_id = u.id
        WHERE ps.status = 'pending'
        AND (ps.mime_type NOT LIKE 'image/%' OR ps.file_type NOT LIKE 'image/%')
        ORDER BY ps.uploaded_at DESC
    ");
    $stmt->execute();
    $submissions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Add file paths and determine types
    foreach ($submissions as &$submission) {
        $submission['file_path'] = '../uploads/pending/' . $submission['filename'];
        $submission['type'] = determineMediaType($submission['mime_type'] ?? $submission['file_type']);
    }

    echo json_encode(['success' => true, 'submissions' => $submissions]);

} catch (Exception $e) {
    // Return empty array if database error (graceful degradation)
    echo json_encode(['success' => true, 'submissions' => []]);
}

function determineMediaType($mimeType) {
    if (!$mimeType) return 'document';

    if (strpos($mimeType, 'video/') === 0) return 'video';
    if (strpos($mimeType, 'audio/') === 0) return 'audio';
    if (strpos($mimeType, 'application/pdf') === 0) return 'document';
    if (strpos($mimeType, 'application/') === 0) return 'document';

    return 'document';
}
?>
