<?php
require_once __DIR__ . '/../config.php';
requireLogin();

header('Content-Type: application/json');

// Helper function to determine media type from mime type
function determineMediaType($mimeType) {
    if (!$mimeType) return 'document';

    if (strpos($mimeType, 'video/') === 0) return 'video';
    if (strpos($mimeType, 'audio/') === 0) return 'audio';
    if (strpos($mimeType, 'application/pdf') === 0) return 'document';
    if (strpos($mimeType, 'application/') === 0) return 'document';

    return 'document';
}

$action = $_GET['action'] ?? 'approved';
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($action) {
        case 'approved':
            // Get all approved media files from photo_submissions table
            // Media files are distinguished by mime_type (non-image types)
            $stmt = $pdo->prepare("
                SELECT ps.*, u.display_name as uploader_name,
                       ps.final_album as category
                FROM photo_submissions ps
                LEFT JOIN users u ON ps.uploader_id = u.id
                WHERE ps.status = 'approved'
                AND (ps.mime_type NOT LIKE 'image/%' OR ps.file_type NOT LIKE 'image/%')
                ORDER BY ps.uploaded_at DESC
            ");
            $stmt->execute();
            $mediaResults = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Map photo_submissions columns to media format
            $media = [];
            foreach ($mediaResults as $item) {
                $media[] = [
                    'id' => $item['id'],
                    'title' => $item['photo_title'] ?: $item['event_name'] ?: 'Untitled Document',
                    'subtitle' => $item['description'] ?: '',
                    'description' => $item['photo_description'] ?: $item['description'] ?: '',
                    'type' => determineMediaType($item['mime_type'] ?? $item['file_type']),
                    'file_path' => '../uploads/albums/' . $item['final_album'] . '/' . $item['filename'],
                    'file_size' => $item['file_size'],
                    'uploaded_by' => $item['uploader_name'] ?: 'Unknown',
                    'date_added' => $item['uploaded_at'],
                    'category' => $item['final_album'],
                    'mime_type' => $item['mime_type'] ?? $item['file_type']
                ];
            }

            echo json_encode(['success' => true, 'media' => $media]);
            break;

        case 'all':
            // Get all media files (admin only)
            if (!isAdmin()) {
                throw new Exception('Access denied');
            }

            $stmt = $pdo->prepare("
                SELECT ps.*, u.display_name as uploader_name,
                       ps.final_album as category
                FROM photo_submissions ps
                LEFT JOIN users u ON ps.uploader_id = u.id
                WHERE (ps.mime_type NOT LIKE 'image/%' OR ps.file_type NOT LIKE 'image/%')
                ORDER BY ps.uploaded_at DESC
            ");
            $stmt->execute();
            $mediaResults = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Map photo_submissions columns to media format
            $media = [];
            foreach ($mediaResults as $item) {
                $filePath = ($item['status'] === 'approved')
                    ? '../uploads/albums/' . $item['final_album'] . '/' . $item['filename']
                    : '../uploads/pending/' . $item['filename'];

                $media[] = [
                    'id' => $item['id'],
                    'title' => $item['photo_title'] ?: $item['event_name'] ?: 'Untitled Document',
                    'subtitle' => $item['description'] ?: '',
                    'description' => $item['photo_description'] ?: $item['description'] ?: '',
                    'type' => determineMediaType($item['mime_type'] ?? $item['file_type']),
                    'file_path' => $filePath,
                    'file_size' => $item['file_size'],
                    'uploaded_by' => $item['uploader_name'] ?: 'Unknown',
                    'date_added' => $item['uploaded_at'],
                    'category' => $item['final_album'],
                    'status' => $item['status'],
                    'mime_type' => $item['mime_type'] ?? $item['file_type']
                ];
            }

            echo json_encode(['success' => true, 'media' => $media]);
            break;
            
        case 'categories':
            // Get available media categories
            $categories = [
                'general' => 'General',
                'family' => 'Family Photos',
                'events' => 'Events',
                'holidays' => 'Holidays',
                'birthdays' => 'Birthdays',
                'anniversaries' => 'Anniversaries',
                'documents' => 'Documents',
                'videos' => 'Videos'
            ];
            
            echo json_encode(['success' => true, 'categories' => $categories]);
            break;
            
        case 'upload':
            if ($method !== 'POST') {
                throw new Exception('Invalid method');
            }
            
            // Handle file upload
            if (!isset($_FILES['media_file']) || $_FILES['media_file']['error'] !== UPLOAD_ERR_OK) {
                throw new Exception('No file uploaded or upload error');
            }
            
            $file = $_FILES['media_file'];
            $title = $_POST['title'] ?? '';
            $description = $_POST['description'] ?? '';
            $category = $_POST['category'] ?? 'general';
            
            // Basic file validation
            $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'application/pdf'];
            if (!in_array($file['type'], $allowedTypes)) {
                throw new Exception('File type not allowed');
            }
            
            // Generate unique filename
            $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
            $filename = uniqid() . '.' . $extension;
            $uploadPath = '../uploads/' . $filename;
            
            if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
                throw new Exception('Failed to save uploaded file');
            }
            
            // Save to database
            $stmt = $pdo->prepare("
                INSERT INTO media_files (filename, original_name, file_type, file_size, title, description, category, uploaded_by, status, uploaded_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
            ");
            $stmt->execute([
                $filename,
                $file['name'],
                $file['type'],
                $file['size'],
                $title,
                $description,
                $category,
                $_SESSION['user_id']
            ]);
            
            echo json_encode(['success' => true, 'message' => 'File uploaded successfully']);
            break;
            
        default:
            throw new Exception('Invalid action');
    }
} catch (Exception $e) {
    // If tables don't exist, return empty data
    if ($action === 'approved') {
        echo json_encode(['success' => true, 'media' => []]);
    } else {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
?>