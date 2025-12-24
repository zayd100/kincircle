<?php
/**
 * Memorial Submission API with R2 photo upload support
 * Handles multiple photos uploaded directly to R2
 */

require_once '../config.php';
require_once '../lib/R2.php';

requireLogin();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

try {
    $data = json_decode(file_get_contents('php://input'), true);

    // Memorial details
    $name = sanitizeInput($data['name'] ?? '');
    $birthDate = sanitizeInput($data['birth_date'] ?? '');
    $deathDate = sanitizeInput($data['death_date'] ?? '');
    $memorialText = sanitizeInput($data['memorial_text'] ?? '');

    // Photo data (array of photo objects with storage keys)
    $photos = $data['photos'] ?? [];

    // Validate required fields
    if (!$name || !$memorialText) {
        throw new Exception('Name and memorial text are required');
    }

    // Start transaction
    $pdo->beginTransaction();

    try {
        // Insert memorial submission
        $stmt = $pdo->prepare("
            INSERT INTO memorial_submissions (
                name, birth_date, death_date, memorial_text,
                submitted_by, status, submitted_at
            ) VALUES (?, ?, ?, ?, 'pending', NOW())
        ");

        $stmt->execute([
            $name,
            $birthDate,
            $deathDate,
            $memorialText,
            $_SESSION['user_id']
        ]);

        $submissionId = $pdo->lastInsertId();

        // Insert photos if any
        if (!empty($photos)) {
            $photoStmt = $pdo->prepare("
                INSERT INTO memorial_submission_photos (
                    submission_id, storage_key, filename, file_type, file_size,
                    storage_provider, display_order, uploaded_at
                ) VALUES (?, ?, ?, ?, ?, 'r2', ?, NOW())
            ");

            foreach ($photos as $index => $photo) {
                $photoStmt->execute([
                    $submissionId,
                    $photo['key'],
                    $photo['original_name'],
                    $photo['file_type'],
                    $photo['file_size'],
                    $index
                ]);
            }
        }

        $pdo->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Memorial submitted for review',
            'submission_id' => $submissionId
        ]);

    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
