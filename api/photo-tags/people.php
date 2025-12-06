<?php
require_once '../../config.php';
requireLogin();

header('Content-Type: application/json');

try {
    // Get all people from unified people + content_tags system
    $stmt = $pdo->prepare("
        SELECT p.id, p.display_name as person_name, COUNT(ct.id) as photo_count
        FROM people p
        LEFT JOIN content_tags ct ON ct.person_id = p.id AND ct.content_type = 'photo'
        LEFT JOIN photo_submissions ps ON ct.content_id = ps.id AND ps.status = 'approved'
        GROUP BY p.id, p.display_name
        ORDER BY photo_count DESC, p.display_name ASC
    ");
    $stmt->execute();
    $people = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'people' => $people]);

} catch (Exception $e) {
    // Return empty people list if error
    echo json_encode(['success' => true, 'people' => []]);
}
?>