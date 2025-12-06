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

    // Get photo tag statistics from unified content_tags + people system
    $stmt = $pdo->query("
        SELECT COUNT(*) as total
        FROM content_tags
        WHERE content_type = 'photo'
    ");
    $totalTags = $stmt->fetch()['total'];

    $stmt = $pdo->query("SELECT COUNT(*) as total FROM people");
    $totalPeople = $stmt->fetch()['total'];

    // Get photos with tags count
    $stmt = $pdo->query("
        SELECT COUNT(DISTINCT ct.content_id) as tagged_photos,
               (SELECT COUNT(*) FROM photo_submissions WHERE status = 'approved') as total_photos
        FROM content_tags ct
        JOIN photo_submissions ps ON ct.content_id = ps.id
        WHERE ct.content_type = 'photo' AND ps.status = 'approved'
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