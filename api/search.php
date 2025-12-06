<?php
require_once '../config.php';
requireLogin();

header('Content-Type: application/json');

$query = $_GET['q'] ?? '';
$contentType = $_GET['type'] ?? 'all'; // 'all', 'photo', 'media'

if (strlen($query) < 2) {
    echo json_encode(['success' => true, 'results' => []]);
    exit;
}

try {
    $results = [];
    
    // Search people and get their content
    $stmt = $pdo->prepare("
        SELECT p.id, p.display_name, COUNT(ct.id) as content_count
        FROM people p
        LEFT JOIN content_tags ct ON p.id = ct.person_id
        WHERE p.display_name LIKE ? OR p.name LIKE ?
        GROUP BY p.id
        ORDER BY p.display_name ASC
        LIMIT 10
    ");
    $stmt->execute(['%' . $query . '%', '%' . $query . '%']);
    $people = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($people as $person) {
        $personContent = [];
        
        // Get photos if requested
        if ($contentType === 'all' || $contentType === 'photo') {
            $stmt = $pdo->prepare("
                SELECT ps.*, 'photo' as content_type
                FROM photo_submissions ps
                JOIN content_tags ct ON ct.content_id = ps.id AND ct.content_type = 'photo'
                WHERE ct.person_id = ? AND ps.status = 'approved'
                ORDER BY ps.date_taken DESC, ps.uploaded_at DESC
                LIMIT 5
            ");
            $stmt->execute([$person['id']]);
            $personContent['photos'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        
        // Get media if requested (videos/documents from photo_submissions with non-image mime types)
        if ($contentType === 'all' || $contentType === 'media') {
            try {
                $stmt = $pdo->prepare("
                    SELECT ps.*, 'media' as content_type
                    FROM photo_submissions ps
                    JOIN content_tags ct ON ct.content_id = ps.id AND ct.content_type = 'media'
                    WHERE ct.person_id = ? AND ps.status = 'approved'
                    AND (ps.mime_type NOT LIKE 'image/%' OR ps.file_type NOT LIKE 'image/%')
                    ORDER BY ps.uploaded_at DESC
                    LIMIT 5
                ");
                $stmt->execute([$person['id']]);
                $personContent['media'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            } catch (Exception $e) {
                $personContent['media'] = [];
            }
        }
        
        if (!empty($personContent['photos']) || !empty($personContent['media'])) {
            $results[] = [
                'person' => $person,
                'content' => $personContent
            ];
        }
    }
    
    echo json_encode(['success' => true, 'results' => $results]);
    
} catch (Exception $e) {
    error_log("Search API error (query=$query, type=$contentType): " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>