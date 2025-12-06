<?php
// Buffer output to catch any PHP warnings/errors
ob_start();

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../lib/R2.php';

requireLogin();

header('Content-Type: application/json');

// Clear any buffered output (PHP warnings, etc.)
ob_clean();

try {
    if (!isAdmin()) {
        echo json_encode(['success' => true, 'submissions' => []]);
        exit;
    }

    $stmt = $pdo->prepare("
        SELECT ps.*, u.display_name as uploader_name
        FROM photo_submissions ps
        LEFT JOIN users u ON ps.uploader_id = u.id
        WHERE ps.status = 'pending'
        AND (ps.mime_type LIKE 'image/%' OR ps.file_type LIKE 'image/%')
        ORDER BY ps.uploaded_at DESC
    ");
    $stmt->execute();
    $submissions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $r2 = new R2();

    foreach ($submissions as &$submission) {
        if (!empty($submission['storage_key'])) {
            $submission['file_path'] = $r2->getDownloadUrl($submission['storage_key']);
        } else {
            $submission['file_path'] = '';
            error_log("Warning: Empty storage_key for submission ID: " . $submission['id']);
        }
    }

    echo json_encode(['success' => true, 'submissions' => $submissions]);

} catch (Exception $e) {
    error_log("pending-submissions.php error: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => $e->getMessage(), 'submissions' => []]);
}
?>