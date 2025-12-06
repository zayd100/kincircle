<?php
// Buffer output to catch any PHP warnings/errors
ob_start();

require_once '../config.php';
require_once '../lib/R2.php';

requireLogin();

header('Content-Type: application/json');

// Clear any buffered output (PHP warnings, etc.)
ob_clean();

try {
    $albumsMap = [];
    $r2 = new R2();

    // Get all approved photos from database
    $stmt = $pdo->prepare("
        SELECT ps.*, u.display_name as uploader_name
        FROM photo_submissions ps
        LEFT JOIN users u ON ps.uploader_id = u.id
        WHERE ps.status = 'approved'
        AND (ps.mime_type LIKE 'image/%' OR ps.file_type LIKE 'image/%')
        ORDER BY ps.uploaded_at DESC
    ");
    $stmt->execute();
    $dbPhotos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($dbPhotos as $photoData) {
        // Skip records without storage_key (old data)
        if (empty($photoData['storage_key'])) {
            continue;
        }

        $albumName = $photoData['final_album'] ?: 'unsorted';

        // Generate R2 URL
        $src = $r2->getDownloadUrl($photoData['storage_key']);

        $photo = [
            'id' => $photoData['id'],
            'src' => $src,
            'filename' => $photoData['filename'],
            'title' => $photoData['photo_title'] ?? $photoData['event_name'] ?? '',
            'desc' => $photoData['photo_description'] ?? $photoData['description'] ?? '',
            'description' => $photoData['photo_description'] ?? $photoData['description'] ?? '',
            'date' => $photoData['date_taken'] ?? '',
            'event' => $photoData['event_name'] ?? '',
            'people' => $photoData['people_in_photo'] ?? ''
        ];

        // Initialize album if not exists
        if (!isset($albumsMap[$albumName])) {
            $albumsMap[$albumName] = [
                'name' => $albumName,
                'album_key' => $albumName,
                'display_name' => ucfirst(str_replace('_', ' ', $albumName)),
                'title' => ucfirst(str_replace('_', ' ', $albumName)),
                'coverEmoji' => '📸',
                'description' => '',
                'date' => '',
                'photoCount' => 0,
                'photo_count' => 0,
                'photos' => []
            ];
        }

        $albumsMap[$albumName]['photos'][] = $photo;
        $albumsMap[$albumName]['photoCount']++;
        $albumsMap[$albumName]['photo_count']++;
    }

    $albums = array_values($albumsMap);

    usort($albums, function($a, $b) {
        return strcmp($a['display_name'], $b['display_name']);
    });

    echo json_encode(['success' => true, 'albums' => $albums]);

} catch (Exception $e) {
    error_log("Error loading albums: " . $e->getMessage());
    echo json_encode(['success' => true, 'albums' => []]);
}
?>