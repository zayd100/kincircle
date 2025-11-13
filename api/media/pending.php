<?php
require_once '../../config.php';
requireLogin();

header('Content-Type: application/json');

try {
    // Only admins can see pending media
    if (!isAdmin()) {
        echo json_encode(['success' => true, 'media' => []]);
        exit;
    }
    
    // Get pending media files from media_files table
    $stmt = $pdo->prepare("
        SELECT m.*, u.display_name as uploader_name
        FROM media_files m
        LEFT JOIN users u ON m.uploaded_by = u.id
        WHERE m.status = 'pending'
        ORDER BY m.uploaded_at DESC
    ");
    $stmt->execute();
    $media = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['success' => true, 'media' => $media]);
    
} catch (Exception $e) {
    echo json_encode(['success' => true, 'media' => []]);
}
?>