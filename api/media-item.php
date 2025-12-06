<?php
require_once __DIR__ . '/../config.php';
requireLogin();

header('Content-Type: application/json');

// Get media ID from URL path
$requestUri = $_SERVER['REQUEST_URI'];
$matches = [];
if (preg_match('/\/api\/media\/(\d+)/', $requestUri, $matches)) {
    $mediaId = $matches[1];
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid media ID']);
    exit;
}

try {
    // Get media item from photo_submissions table
    $stmt = $pdo->prepare("
        SELECT ps.*, u.display_name as uploader_name,
               ps.final_album as category
        FROM photo_submissions ps
        LEFT JOIN users u ON ps.uploader_id = u.id
        WHERE ps.id = ?
        AND ps.status = 'approved'
        AND (ps.mime_type NOT LIKE 'image/%' OR ps.file_type NOT LIKE 'image/%')
    ");
    $stmt->execute([$mediaId]);
    $item = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$item) {
        http_response_code(404);
        echo json_encode(['error' => 'Media not found']);
        exit;
    }

    // Determine media type
    function determineMediaType($mimeType) {
        if (!$mimeType) return 'document';
        if (strpos($mimeType, 'video/') === 0) return 'video';
        if (strpos($mimeType, 'audio/') === 0) return 'audio';
        if (strpos($mimeType, 'application/pdf') === 0) return 'document';
        if (strpos($mimeType, 'application/') === 0) return 'document';
        return 'document';
    }

    // Map to expected format
    $media = [
        'id' => $item['id'],
        'title' => $item['photo_title'] ?: $item['event_name'] ?: 'Untitled Document',
        'subtitle' => $item['description'] ?: '',
        'description' => $item['photo_description'] ?: $item['description'] ?: '',
        'type' => determineMediaType($item['mime_type'] ?? $item['file_type']),
        'subtype' => (strpos($item['mime_type'] ?? $item['file_type'], 'pdf') !== false) ? 'pdf' : 'text',
        'filePath' => '/uploads/albums/' . $item['final_album'] . '/' . $item['filename'],
        'file_path' => '/uploads/albums/' . $item['final_album'] . '/' . $item['filename'],
        'file_size' => $item['file_size'],
        'fileSize' => formatFileSize($item['file_size']),
        'uploaded_by' => $item['uploader_name'] ?: 'Unknown',
        'uploadedBy' => $item['uploader_name'] ?: 'Unknown',
        'date_added' => $item['uploaded_at'],
        'dateAdded' => $item['uploaded_at'],
        'category' => $item['final_album'],
        'mime_type' => $item['mime_type'] ?? $item['file_type'],
        'pages' => 'Unknown', // PDF page count would require parsing
        'context' => $item['description'] ?: 'No additional context available'
    ];

    echo json_encode($media);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}

function formatFileSize($bytes) {
    if ($bytes === 0) return '0 Bytes';
    $k = 1024;
    $sizes = ['Bytes', 'KB', 'MB', 'GB'];
    $i = floor(log($bytes) / log($k));
    return round($bytes / pow($k, $i), 2) . ' ' . $sizes[$i];
}
?>
