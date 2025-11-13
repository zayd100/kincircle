<?php
require_once __DIR__ . '/../config.php';
requireLogin();

header('Content-Type: application/json');

try {
    // Only admins can see pending submissions
    if (!isAdmin()) {
        echo json_encode(['success' => true, 'submissions' => []]);
        exit;
    }
    
    // Get pending photo submissions (images only, not media files)
    $stmt = $pdo->prepare("
        SELECT ps.*, u.display_name as uploader_name
        FROM photo_submissions ps
        JOIN users u ON ps.uploader_id = u.id
        WHERE ps.status = 'pending'
        AND (ps.mime_type LIKE 'image/%' OR ps.file_type LIKE 'image/%')
        ORDER BY ps.uploaded_at DESC
    ");
    $stmt->execute();
    $submissions = $stmt->fetchAll();
    
    echo json_encode(['success' => true, 'submissions' => $submissions]);
    
} catch (Exception $e) {
    // Return empty array if database error (graceful degradation)
    echo json_encode(['success' => true, 'submissions' => []]);
}
?>