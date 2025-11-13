<?php
require_once '../config.php';
requireLogin();

header('Content-Type: application/json');

try {
    $albums = [];
    $albumsPath = '../uploads/albums';

    // Check if albums directory exists
    if (is_dir($albumsPath)) {
        $directories = array_filter(glob($albumsPath . '/*'), 'is_dir');

        foreach ($directories as $dir) {
            $folderName = basename($dir);
            $metadataFile = $dir . '/album.json';

            // Load album metadata
            $metadata = [];
            if (file_exists($metadataFile)) {
                $metadata = json_decode(file_get_contents($metadataFile), true);
            }

            // Get all image files in this album
            $imageFiles = glob($dir . '/*.{jpg,jpeg,png,gif,JPG,JPEG,PNG,GIF}', GLOB_BRACE);
            $photoCount = count($imageFiles);

            // Build photos array - just paths as strings for frontend compatibility
            $photos = [];
            foreach ($imageFiles as $imagePath) {
                $filename = basename($imagePath);

                // Try to get metadata from database
                $photoData = [
                    'src' => 'uploads/albums/' . $folderName . '/' . $filename,
                    'filename' => $filename
                ];

                try {
                    $stmt = $pdo->prepare("
                        SELECT id, photo_title, photo_description, date_taken, event_name,
                               location_name, location_city, location_state
                        FROM photo_submissions
                        WHERE filename = ? AND final_album = ? AND status = 'approved'
                        LIMIT 1
                    ");
                    $stmt->execute([$filename, $folderName]);
                    $dbData = $stmt->fetch(PDO::FETCH_ASSOC);

                    if ($dbData) {
                        $photoData['id'] = $dbData['id'];  // Database ID needed for tagging
                        $photoData['title'] = $dbData['photo_title'];
                        $photoData['desc'] = $photoData['description'] = $dbData['photo_description'];
                        $photoData['date'] = $dbData['date_taken'];
                        $photoData['event'] = $dbData['event_name'];
                        $photoData['location'] = $dbData['location_name'];
                        $photoData['city'] = $dbData['location_city'];
                        $photoData['state'] = $dbData['location_state'];
                    }
                } catch (Exception $e) {
                    error_log("Error fetching photo metadata for $filename: " . $e->getMessage());
                }

                $photos[] = $photoData;
            }

            $albums[] = [
                'name' => $folderName,
                'album_key' => $folderName,
                'display_name' => $metadata['display_name'] ?? ucfirst($folderName),
                'title' => $metadata['display_name'] ?? ucfirst($folderName),
                'coverEmoji' => $metadata['emoji'] ?? '📸',
                'description' => $metadata['description'] ?? '',
                'date' => $metadata['date_range'] ?? '',
                'photoCount' => $photoCount,
                'photo_count' => $photoCount,
                'photos' => $photos
            ];
        }
    }

    // Sort by display name
    usort($albums, function($a, $b) {
        return strcmp($a['display_name'], $b['display_name']);
    });

    echo json_encode(['success' => true, 'albums' => $albums]);

} catch (Exception $e) {
    error_log("Error loading albums: " . $e->getMessage());
    echo json_encode(['success' => true, 'albums' => []]);
}
?>