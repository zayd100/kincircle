<?php
require_once '../../config.php';
requireLogin();

header('Content-Type: application/json');

try {
    // Get all people tags
    $stmt = $pdo->prepare("
        SELECT DISTINCT pt.person_name, COUNT(pt.photo_id) as photo_count
        FROM photo_tags pt
        JOIN photo_submissions p ON pt.photo_id = p.id
        WHERE p.status = 'approved'
        GROUP BY pt.person_name
        ORDER BY photo_count DESC, pt.person_name ASC
    ");
    $stmt->execute();
    $people = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['success' => true, 'people' => $people]);
    
} catch (Exception $e) {
    // Return empty people list if table doesn't exist
    echo json_encode(['success' => true, 'people' => []]);
}
?>