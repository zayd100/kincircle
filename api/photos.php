<?php
require_once '../config.php';
require_once '../lib/R2.php';

requireLogin();

header('Content-Type: application/json');

try {
    $photos = [];
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
        $path = $r2->getDownloadUrl($photoData['storage_key']);

        $photo = [
            'id' => $photoData['id'],
            'filename' => $photoData['filename'],
            'original_name' => $photoData['original_name'],
            'path' => $path,
            'album' => $albumName,
            'album_display' => ucfirst(str_replace('_', ' ', $albumName)),
            'event_name' => $photoData['event_name'] ?? '',
            'date_taken' => $photoData['date_taken'] ?? '',
            'people_in_photo' => $photoData['people_in_photo'] ?? '',
            'description' => $photoData['description'] ?? '',
            'uploaded_at' => $photoData['uploaded_at'],
            'uploaded_by' => $photoData['uploader_name'] ?? 'Unknown'
        ];

        $photos[] = $photo;

        if (!isset($albumsMap[$albumName])) {
            $albumsMap[$albumName] = [
                'name' => $albumName,
                'display_name' => ucfirst(str_replace('_', ' ', $albumName)),
                'emoji' => '📸',
                'description' => '',
                'date_range' => '',
                'photo_count' => 0,
                'photos' => []
            ];
        }

        $albumsMap[$albumName]['photos'][] = $photo;
        $albumsMap[$albumName]['photo_count']++;
    }

    $albums = array_values($albumsMap);

    echo json_encode([
        'success' => true,
        'photos' => $photos,
        'albums' => $albums,
        'stats' => [
            'total_photos' => count($photos),
            'total_albums' => count($albums)
        ]
    ]);

} catch (Exception $e) {
    error_log("Error loading photos: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'photos' => [],
        'albums' => []
    ]);
}
?>
