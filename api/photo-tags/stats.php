<?php
require_once '../../config.php';
requireLogin();

header('Content-Type: application/json');

try {
    // Only admins can see photo tag stats
    if (!isAdmin()) {
        echo json_encode(['success' => true, 'stats' => ['total_tags' => 0, 'total_people' => 0]]);
        exit;
    }
    
    // Get photo tag statistics
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM photo_tags");
    $totalTags = $stmt->fetch()['total'];
    
    $stmt = $pdo->query("SELECT COUNT(DISTINCT person_name) as total FROM photo_tags");
    $totalPeople = $stmt->fetch()['total'];
    
    // Get photos with tags count
    $stmt = $pdo->query("
        SELECT COUNT(DISTINCT pt.photo_id) as tagged_photos,
               COUNT(DISTINCT ps.id) as total_photos
        FROM photo_tags pt
        RIGHT JOIN photo_submissions ps ON pt.photo_id = ps.id
        WHERE ps.status = 'approved'
    ");
    $photoStats = $stmt->fetch();
    
    echo json_encode([
        'success' => true, 
        'stats' => [
            'total_tags' => $totalTags,
            'total_people' => $totalPeople,
            'tagged_photos' => $photoStats['tagged_photos'] ?: 0,
            'total_photos' => $photoStats['total_photos'] ?: 0
        ]
    ]);
    
} catch (Exception $e) {
    echo json_encode(['success' => true, 'stats' => ['total_tags' => 0, 'total_people' => 0]]);
}
?>