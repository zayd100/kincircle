<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../lib/R2.php';

requireLogin();

header('Content-Type: application/json');

try {
    if (!isAdmin()) {
        echo json_encode(['success' => true, 'submissions' => []]);
        exit;
    }

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

    $r2 = new R2();

    foreach ($submissions as &$submission) {
        $submission['file_path'] = $r2->getDownloadUrl($submission['storage_key']);
        $submission['type'] = determineMediaType($submission['mime_type'] ?? $submission['file_type']);
    }

    echo json_encode(['success' => true, 'submissions' => $submissions]);

} catch (Exception $e) {
    echo json_encode(['success' => true, 'submissions' => []]);
}

function determineMediaType($mimeType) {
    if (!$mimeType) return 'document';
    if (strpos($mimeType, 'video/') === 0) return 'video';
    if (strpos($mimeType, 'audio/') === 0) return 'audio';
    return 'document';
}
?>
