<?php
require_once '../config.php';

header('Content-Type: application/json');

try {
    // Get approved images from the media files table for splash display
    $stmt = $pdo->prepare("
        SELECT filename, original_name, title, description
        FROM media_files 
        WHERE status = 'approved' 
        AND file_type LIKE 'image%'
        ORDER BY uploaded_at DESC 
        LIMIT 12
    ");
    $stmt->execute();
    $images = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // If no approved images, return sample images from the gallery folder
    if (empty($images)) {
        $galleryPath = '../images/gallery/';
        $sampleImages = [];
        
        for ($i = 1; $i <= 12; $i++) {
            $filename = "family_" . sprintf('%02d', $i) . ".jpg";
            if (file_exists($galleryPath . $filename)) {
                $sampleImages[] = [
                    'filename' => $filename,
                    'original_name' => $filename,
                    'title' => "Family Memory " . $i,
                    'description' => "A cherished family moment",
                    'path' => '/images/gallery/' . $filename
                ];
            }
        }
        $images = $sampleImages;
    } else {
        // Add full path for approved images
        foreach ($images as &$image) {
            $image['path'] = '/uploads/' . $image['filename'];
        }
    }
    
    echo json_encode(['success' => true, 'images' => $images]);
    
} catch (Exception $e) {
    // Return sample images on error
    $sampleImages = [];
    for ($i = 1; $i <= 12; $i++) {
        $filename = "family_" . sprintf('%02d', $i) . ".jpg";
        $sampleImages[] = [
            'filename' => $filename,
            'original_name' => $filename,
            'title' => "Family Memory " . $i,
            'description' => "A cherished family moment",
            'path' => '/images/gallery/' . $filename
        ];
    }
    
    echo json_encode(['success' => true, 'images' => $sampleImages]);
}
?>