<?php
/**
 * Delete Photo API
 * Deletes a photo from R2 storage and the database
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../lib/R2.php';

// Require login and admin
requireLogin();

header('Content-Type: application/json');

if (!isAdmin()) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Admin access required']);
    exit;
}

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Get request data
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || empty($input['id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Photo ID required']);
    exit;
}

$photoId = (int) $input['id'];

try {
    // Start transaction
    $pdo->beginTransaction();

    // Get the photo record to find the storage key
    $stmt = $pdo->prepare("
        SELECT id, storage_key, filename, final_album
        FROM photo_submissions
        WHERE id = ?
    ");
    $stmt->execute([$photoId]);
    $photo = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$photo) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Photo not found']);
        exit;
    }

    // Delete from R2 storage if storage_key exists
    if (!empty($photo['storage_key'])) {
        $r2 = new R2();
        $deleted = $r2->deleteObject($photo['storage_key']);

        if (!$deleted) {
            // Log warning but continue - the file might already be gone
            error_log("Warning: Could not delete R2 object: " . $photo['storage_key']);
        }
    }

    // Delete any photo tags associated with this photo (old system)
    $stmt = $pdo->prepare("DELETE FROM photo_tags WHERE photo_id = ?");
    $stmt->execute([$photoId]);
    $tagsDeleted = $stmt->rowCount();

    // Delete from content_tags table (unified tagging system)
    $stmt = $pdo->prepare("DELETE FROM content_tags WHERE content_type = 'photo' AND content_id = ?");
    $stmt->execute([$photoId]);
    $tagsDeleted += $stmt->rowCount();

    // Delete the photo record from the database
    $stmt = $pdo->prepare("DELETE FROM photo_submissions WHERE id = ?");
    $stmt->execute([$photoId]);

    if ($stmt->rowCount() === 0) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'error' => 'Failed to delete photo record']);
        exit;
    }

    // Commit transaction
    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Photo deleted successfully',
        'deleted_tags' => $tagsDeleted
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log("Delete photo error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error during deletion']);
}
