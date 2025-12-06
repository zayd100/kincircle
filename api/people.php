<?php
require_once '../config.php';
requireLogin();

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    switch ($method) {
        case 'GET':
            if ($action === 'search' || $action === '') {
                // Get all people for autocomplete
                $query = $_GET['q'] ?? '';
                
                $sql = "SELECT p.*, COUNT(ct.id) as content_count
                        FROM people p
                        LEFT JOIN content_tags ct ON p.id = ct.person_id
                        WHERE p.display_name LIKE ?
                        GROUP BY p.id
                        ORDER BY p.display_name ASC";
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute(['%' . $query . '%']);
                $people = $stmt->fetchAll();
                
                echo json_encode(['success' => true, 'people' => $people]);
                
            } elseif ($action === 'content' && isset($_GET['id'])) {
                // Get all content for a specific person
                $personId = (int)$_GET['id'];
                
                // Get photos
                $stmt = $pdo->prepare("
                    SELECT ps.*, 'photo' as content_type
                    FROM photo_submissions ps
                    JOIN content_tags ct ON ct.content_id = ps.id AND ct.content_type = 'photo'
                    WHERE ct.person_id = ? AND ps.status = 'approved'
                    ORDER BY ps.date_taken DESC, ps.uploaded_at DESC
                ");
                $stmt->execute([$personId]);
                $photos = $stmt->fetchAll();

                // Get media (videos/documents from photo_submissions with non-image mime types)
                $stmt = $pdo->prepare("
                    SELECT ps.*, 'media' as content_type
                    FROM photo_submissions ps
                    JOIN content_tags ct ON ct.content_id = ps.id AND ct.content_type = 'media'
                    WHERE ct.person_id = ? AND ps.status = 'approved'
                    AND (ps.mime_type NOT LIKE 'image/%' OR ps.file_type NOT LIKE 'image/%')
                    ORDER BY ps.uploaded_at DESC
                ");
                $stmt->execute([$personId]);
                $media = $stmt->fetchAll();
                
                echo json_encode([
                    'success' => true,
                    'photos' => $photos,
                    'media' => $media
                ]);
                
            } elseif ($action === 'content') {
                // Get all people with their tagged content (for photos page People view)
                $stmt = $pdo->prepare("
                    SELECT DISTINCT p.id, p.display_name as name, p.display_name
                    FROM people p
                    JOIN content_tags ct ON p.id = ct.person_id
                    WHERE ct.content_type = 'photo'
                    ORDER BY p.display_name ASC
                ");
                $stmt->execute();
                $people = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                $results = [];
                foreach ($people as $person) {
                    // Get their photos
                    $photoStmt = $pdo->prepare("
                        SELECT ps.id, ps.filename, ps.final_album, ps.photo_title,
                               ps.photo_description, ps.date_taken, ps.event_name
                        FROM photo_submissions ps
                        JOIN content_tags ct ON ct.content_id = ps.id AND ct.content_type = 'photo'
                        WHERE ct.person_id = ? AND ps.status = 'approved'
                        ORDER BY ps.date_taken DESC, ps.uploaded_at DESC
                    ");
                    $photoStmt->execute([$person['id']]);
                    $photoRows = $photoStmt->fetchAll(PDO::FETCH_ASSOC);

                    // Build photo objects with proper paths
                    $photos = [];
                    foreach ($photoRows as $row) {
                        $photos[] = [
                            'photo_src' => 'uploads/albums/' . $row['final_album'] . '/' . $row['filename'],
                            'photo_title' => $row['photo_title'] ?: $row['event_name'],
                            'album_name' => $row['final_album'],
                            'photo_index' => $row['id']
                        ];
                    }

                    if (count($photos) > 0) {
                        $results[] = [
                            'name' => $person['name'],
                            'photo_count' => count($photos),
                            'photos' => $photos
                        ];
                    }
                }
                
                echo json_encode(['success' => true, 'results' => $results]);
            }
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            
            if ($action === 'create') {
                // Create new person
                $name = trim($input['name'] ?? '');
                $normalizedName = strtolower(preg_replace('/[^a-z0-9]/', '', $name));
                
                if (!$name) {
                    throw new Exception('Name is required');
                }
                
                $stmt = $pdo->prepare("
                    INSERT INTO people (name, normalized_name, display_name, created_by_user_id)
                    VALUES (?, ?, ?, ?)
                ");
                $stmt->execute([$name, $normalizedName, $name, $_SESSION['user_id']]);
                
                $personId = $pdo->lastInsertId();
                echo json_encode(['success' => true, 'person_id' => $personId]);
                
            } elseif ($action === 'tag') {
                // Tag content with person
                $personId = (int)($input['person_id'] ?? 0);
                $contentType = $input['content_type'] ?? '';
                $contentId = (int)($input['content_id'] ?? 0);
                
                if (!$personId || !$contentType || !$contentId) {
                    throw new Exception('Person ID, content type, and content ID are required');
                }
                
                $stmt = $pdo->prepare("
                    INSERT IGNORE INTO content_tags (person_id, content_type, content_id, tagged_by_user_id)
                    VALUES (?, ?, ?, ?)
                ");
                $stmt->execute([$personId, $contentType, $contentId, $_SESSION['user_id']]);
                
                echo json_encode(['success' => true]);
            }
            break;
            
        case 'DELETE':
            if ($action === 'untag' && isset($_GET['id'])) {
                // Remove tag
                $tagId = (int)$_GET['id'];
                
                $stmt = $pdo->prepare("DELETE FROM content_tags WHERE id = ?");
                $stmt->execute([$tagId]);
                
                echo json_encode(['success' => true]);
            }
            break;
            
        default:
            throw new Exception('Method not allowed');
    }
    
} catch (Exception $e) {
    error_log("People API error (action=$action): " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>