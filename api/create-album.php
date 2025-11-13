<?php
require_once '../config.php';
requireLogin();

header('Content-Type: application/json');

// Admin-only access
if (!isAdmin()) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Admin access required']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

try {
    $data = json_decode(file_get_contents('php://input'), true);

    $folder = sanitizeInput($data['folder'] ?? '');
    $title = sanitizeInput($data['title'] ?? '');
    $emoji = sanitizeInput($data['emoji'] ?? '📸');
    $description = sanitizeInput($data['description'] ?? '');
    $dateRange = sanitizeInput($data['dateRange'] ?? '');

    if (empty($folder) || empty($title)) {
        throw new Exception('Folder name and title are required');
    }

    // Validate folder name (alphanumeric, underscores, hyphens only)
    if (!preg_match('/^[a-zA-Z0-9_-]+$/', $folder)) {
        throw new Exception('Folder name can only contain letters, numbers, underscores, and hyphens');
    }

    // Create album directory
    $albumPath = '../uploads/albums/' . $folder;

    if (file_exists($albumPath)) {
        throw new Exception('Album folder already exists');
    }

    if (!is_dir('../uploads/albums')) {
        mkdir('../uploads/albums', 0755, true);
    }

    if (!mkdir($albumPath, 0755, true)) {
        throw new Exception('Failed to create album directory');
    }

    // Create album metadata file
    $metadata = [
        'name' => $folder,
        'display_name' => $title,
        'emoji' => $emoji,
        'description' => $description,
        'date_range' => $dateRange,
        'created_at' => date('Y-m-d H:i:s'),
        'created_by' => $_SESSION['user_id']
    ];

    file_put_contents($albumPath . '/album.json', json_encode($metadata, JSON_PRETTY_PRINT));

    echo json_encode([
        'success' => true,
        'message' => 'Album created successfully',
        'album' => $metadata
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
