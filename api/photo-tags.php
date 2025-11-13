<?php
require_once '../config.php';
requireLogin();

header('Content-Type: application/json');

// Get photo ID from URL
$uri = $_SERVER['REQUEST_URI'];
preg_match('/\/api\/photo-tags\/(\d+)/', $uri, $matches);
$photoId = isset($matches[1]) ? (int)$matches[1] : 0;

if (!$photoId) {
    echo json_encode([]);
    exit;
}

try {
    // Get tags for this photo
    $stmt = $pdo->prepare("
        SELECT ct.id, p.id as person_id, p.display_name as person_name
        FROM content_tags ct
        JOIN people p ON ct.person_id = p.id
        WHERE ct.content_type = 'photo' AND ct.content_id = ?
        ORDER BY p.display_name ASC
    ");
    $stmt->execute([$photoId]);
    $tags = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($tags ?: []);

} catch (Exception $e) {
    error_log("Photo tags error: " . $e->getMessage());
    echo json_encode([]);
}
?>
