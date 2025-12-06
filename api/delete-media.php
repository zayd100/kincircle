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

    $mediaId = $data['id'] ?? '';

    if (!$mediaId) {
        throw new Exception('Media ID is required');
    }

    // Get media details
    $stmt = $pdo->prepare("SELECT * FROM photo_submissions WHERE id = ?");
    $stmt->execute([$mediaId]);
    $media = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$media) {
        throw new Exception('Media not found');
    }

    $filename = $media['filename'];
    $status = $media['status'];

    // Prevent path traversal attacks
    if (strpos($filename, '..') !== false || strpos($filename, '/') !== false || strpos($filename, '\\') !== false) {
        throw new Exception('Invalid filename in database');
    }

    // Determine file path based on status
    if ($status === 'approved') {
        $album = $media['final_album'];
        // Prevent path traversal in album name
        if (strpos($album, '..') !== false || strpos($album, '/') !== false || strpos($album, '\\') !== false) {
            throw new Exception('Invalid album name in database');
        }
        $filePath = '../uploads/albums/' . $album . '/' . $filename;
    } else if ($status === 'pending') {
        $filePath = '../uploads/pending/' . $filename;
    } else {
        $filePath = null;
    }

    // Delete file if it exists
    if ($filePath && file_exists($filePath)) {
        if (!unlink($filePath)) {
            throw new Exception('Failed to delete media file from disk');
        }
    }

    // Delete database record
    $deleteStmt = $pdo->prepare("DELETE FROM photo_submissions WHERE id = ?");
    $deleteStmt->execute([$mediaId]);

    echo json_encode([
        'success' => true,
        'message' => 'Media deleted successfully',
        'id' => $mediaId,
        'filename' => $filename
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
