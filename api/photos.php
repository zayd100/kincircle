<?php
require_once '../config.php';
requireLogin();

header('Content-Type: application/json');

try {
    $photos = [];
    $albums = [];
    $albumsPath = '../uploads/albums';

    // Scan all album directories
    if (is_dir($albumsPath)) {
        $albumDirs = array_filter(glob($albumsPath . '/*'), 'is_dir');

        foreach ($albumDirs as $albumDir) {
            $albumName = basename($albumDir);
            $metadataFile = $albumDir . '/album.json';

            // Load album metadata
            $albumMetadata = [];
            if (file_exists($metadataFile)) {
                $albumMetadata = json_decode(file_get_contents($metadataFile), true);
            }

            // Get all image files in this album
            $imageFiles = glob($albumDir . '/*.{jpg,jpeg,png,gif,JPG,JPEG,PNG,GIF}', GLOB_BRACE);

            $albumPhotos = [];
            foreach ($imageFiles as $imagePath) {
                $filename = basename($imagePath);

                // Try to get submission data from database
                $photoData = null;
                try {
                    $stmt = $pdo->prepare("
                        SELECT * FROM photo_submissions
                        WHERE filename = ? AND status = 'approved'
                    ");
                    $stmt->execute([$filename]);
                    $photoData = $stmt->fetch(PDO::FETCH_ASSOC);
                } catch (Exception $e) {
                    // Database might not have this photo
                }

                $photo = [
                    'filename' => $filename,
                    'path' => '/uploads/albums/' . $albumName . '/' . $filename,
                    'album' => $albumName,
                    'album_display' => $albumMetadata['display_name'] ?? ucfirst($albumName),
                    'event_name' => $photoData['event_name'] ?? '',
                    'date_taken' => $photoData['date_taken'] ?? '',
                    'people_in_photo' => $photoData['people_in_photo'] ?? '',
                    'description' => $photoData['description'] ?? '',
                    'uploaded_at' => $photoData['uploaded_at'] ?? date('Y-m-d H:i:s', filemtime($imagePath))
                ];

                $albumPhotos[] = $photo;
                $photos[] = $photo;
            }

            if (!empty($albumPhotos)) {
                $albums[] = [
                    'name' => $albumName,
                    'display_name' => $albumMetadata['display_name'] ?? ucfirst($albumName),
                    'emoji' => $albumMetadata['emoji'] ?? '📸',
                    'description' => $albumMetadata['description'] ?? '',
                    'date_range' => $albumMetadata['date_range'] ?? '',
                    'photo_count' => count($albumPhotos),
                    'photos' => $albumPhotos
                ];
            }
        }
    }

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
