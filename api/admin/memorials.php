<?php
require_once '../../config.php';
requireLogin();

header('Content-Type: application/json');

// Admin-only access
if (!isAdmin()) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Admin access required']);
    exit;
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = $_GET['action'] ?? '';

        if ($action === 'pending') {
            // Get all pending memorial submissions
            $stmt = $pdo->prepare("
                SELECT ms.*, u.display_name as submitted_by_name
                FROM memorial_submissions ms
                JOIN users u ON ms.submitted_by = u.id
                WHERE ms.status = 'pending'
                ORDER BY ms.submitted_at DESC
            ");
            $stmt->execute();
            $memorials = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get photos for each memorial
            require_once '../../lib/R2.php';
            $r2 = new R2();

            foreach ($memorials as &$memorial) {
                $photosStmt = $pdo->prepare("
                    SELECT * FROM memorial_submission_photos
                    WHERE submission_id = ?
                    ORDER BY display_order
                ");
                $photosStmt->execute([$memorial['id']]);
                $photos = $photosStmt->fetchAll(PDO::FETCH_ASSOC);

                // Add download URLs for photos
                foreach ($photos as &$photo) {
                    $photo['url'] = $r2->getDownloadUrl($photo['storage_key']);
                }
                $memorial['photos'] = $photos;
            }

            echo json_encode([
                'success' => true,
                'memorials' => $memorials
            ]);
        } else {
            throw new Exception('Invalid action');
        }

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? '';
        $id = $data['id'] ?? '';

        if (!$id) {
            throw new Exception('Memorial ID required');
        }

        // Get submission details
        $stmt = $pdo->prepare("SELECT * FROM memorial_submissions WHERE id = ? AND status = 'pending'");
        $stmt->execute([$id]);
        $submission = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$submission) {
            throw new Exception('Memorial submission not found or already processed');
        }

        if ($action === 'approve') {
            // Start transaction
            $pdo->beginTransaction();

            try {
                // Create approved memorial
                $insertStmt = $pdo->prepare("
                    INSERT INTO memorials (name, birth_date, death_date, memorial_text, created_by, created_at, is_active)
                    VALUES (?, ?, ?, ?, NOW(), 1)
                ");
                $insertStmt->execute([
                    $submission['name'],
                    $submission['birth_date'],
                    $submission['death_date'],
                    $submission['memorial_text'],
                    $submission['submitted_by']
                ]);

                $memorialId = $pdo->lastInsertId();

                // Get all photos for this submission
                $photosStmt = $pdo->prepare("
                    SELECT * FROM memorial_submission_photos
                    WHERE submission_id = ?
                    ORDER BY display_order
                ");
                $photosStmt->execute([$id]);
                $photos = $photosStmt->fetchAll(PDO::FETCH_ASSOC);

                // Copy photos from pending to approved
                require_once '../../lib/R2.php';
                $r2 = new R2();

                foreach ($photos as $photo) {
                    $pendingKey = $photo['storage_key'];
                    // Change path from pending to approved
                    $approvedKey = str_replace('pending/photos', 'approved/memorials', $pendingKey);

                    if ($r2->objectExists($pendingKey)) {
                        if ($r2->copyObject($pendingKey, $approvedKey)) {
                            // Delete from pending
                            $r2->deleteObject($pendingKey);

                            // Insert into memorial_photos table
                            $photoInsertStmt = $pdo->prepare("
                                INSERT INTO memorial_photos (
                                    memorial_id, storage_key, filename, file_type, file_size,
                                    storage_provider, display_order, uploaded_at
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
                            ");
                            $photoInsertStmt->execute([
                                $memorialId,
                                $approvedKey,
                                $photo['filename'],
                                $photo['file_type'],
                                $photo['file_size'],
                                'r2',
                                $photo['display_order']
                            ]);
                        }
                    }
                }

                // Update submission status
                $updateStmt = $pdo->prepare("
                    UPDATE memorial_submissions
                    SET status = 'approved',
                        reviewed_by = ?,
                        reviewed_at = NOW(),
                        approved_memorial_id = ?
                    WHERE id = ?
                ");
                $updateStmt->execute([$_SESSION['user_id'], $memorialId, $id]);

                $pdo->commit();

                echo json_encode([
                    'success' => true,
                    'message' => 'Memorial approved and published',
                    'memorial_id' => $memorialId
                ]);

            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }

        } elseif ($action === 'reject') {
            $notes = $data['notes'] ?? '';

            // Update submission status
            $updateStmt = $pdo->prepare("
                UPDATE memorial_submissions
                SET status = 'rejected',
                    reviewed_by = ?,
                    reviewed_at = NOW(),
                    reviewer_notes = ?
                WHERE id = ?
            ");
            $updateStmt->execute([$_SESSION['user_id'], $notes, $id]);

            // Delete pending photo if exists
            if ($submission['photo_filename']) {
                $pendingPath = '../uploads/memorials/pending/' . $submission['photo_filename'];
                if (file_exists($pendingPath)) {
                    unlink($pendingPath);
                }
            }

            echo json_encode([
                'success' => true,
                'message' => 'Memorial rejected'
            ]);

        } else {
            throw new Exception('Invalid action');
        }

    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    }

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
