<?php
/**
 * Cleanup Orphaned Tags API
 *
 * Removes tags that point to photos/content that no longer exists
 * Admin-only endpoint
 */

require_once '../config.php';

requireLogin();

header('Content-Type: application/json');

if (!isAdmin()) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Admin access required']);
    exit;
}

try {
    $results = [
        'photo_tags_removed' => 0,
        'content_tags_removed' => 0,
        'rejected_tags_removed' => 0,
        'orphaned_found' => []
    ];

    // Start transaction
    $pdo->beginTransaction();

    // 1. Find and remove orphaned photo_tags (old system)
    // Tags where the photo_id doesn't exist in photo_submissions
    $stmt = $pdo->prepare("
        SELECT pt.id, pt.photo_id, pt.person_name
        FROM photo_tags pt
        LEFT JOIN photo_submissions ps ON pt.photo_id = ps.id
        WHERE ps.id IS NULL
    ");
    $stmt->execute();
    $orphanedPhotoTags = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (count($orphanedPhotoTags) > 0) {
        $stmt = $pdo->prepare("
            DELETE pt FROM photo_tags pt
            LEFT JOIN photo_submissions ps ON pt.photo_id = ps.id
            WHERE ps.id IS NULL
        ");
        $stmt->execute();
        $results['photo_tags_removed'] = $stmt->rowCount();

        foreach ($orphanedPhotoTags as $tag) {
            $results['orphaned_found'][] = [
                'type' => 'photo_tag_orphan',
                'tag_id' => $tag['id'],
                'photo_id' => $tag['photo_id'],
                'person' => $tag['person_name']
            ];
        }
    }

    // 2. Find and remove orphaned content_tags for photos (unified system)
    // Photos that were fully deleted
    $stmt = $pdo->prepare("
        SELECT ct.id, ct.content_id, ct.person_id, p.display_name as person_name
        FROM content_tags ct
        LEFT JOIN photo_submissions ps ON ct.content_id = ps.id
        LEFT JOIN people p ON ct.person_id = p.id
        WHERE ct.content_type = 'photo' AND ps.id IS NULL
    ");
    $stmt->execute();
    $orphanedContentTags = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (count($orphanedContentTags) > 0) {
        $stmt = $pdo->prepare("
            DELETE ct FROM content_tags ct
            LEFT JOIN photo_submissions ps ON ct.content_id = ps.id
            WHERE ct.content_type = 'photo' AND ps.id IS NULL
        ");
        $stmt->execute();
        $results['content_tags_removed'] = $stmt->rowCount();

        foreach ($orphanedContentTags as $tag) {
            $results['orphaned_found'][] = [
                'type' => 'content_tag_orphan',
                'tag_id' => $tag['id'],
                'photo_id' => $tag['content_id'],
                'person' => $tag['person_name']
            ];
        }
    }

    // 3. Find and remove tags on REJECTED photos (soft-deleted - file gone but record remains)
    $stmt = $pdo->prepare("
        SELECT ct.id, ct.content_id, ct.person_id, p.display_name as person_name, ps.status
        FROM content_tags ct
        JOIN photo_submissions ps ON ct.content_id = ps.id
        LEFT JOIN people p ON ct.person_id = p.id
        WHERE ct.content_type = 'photo' AND ps.status = 'rejected'
    ");
    $stmt->execute();
    $rejectedPhotoTags = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (count($rejectedPhotoTags) > 0) {
        $stmt = $pdo->prepare("
            DELETE ct FROM content_tags ct
            JOIN photo_submissions ps ON ct.content_id = ps.id
            WHERE ct.content_type = 'photo' AND ps.status = 'rejected'
        ");
        $stmt->execute();
        $results['rejected_tags_removed'] = $stmt->rowCount();

        foreach ($rejectedPhotoTags as $tag) {
            $results['orphaned_found'][] = [
                'type' => 'rejected_photo_tag',
                'tag_id' => $tag['id'],
                'photo_id' => $tag['content_id'],
                'person' => $tag['person_name']
            ];
        }
    }

    // 4. Also clean up old photo_tags on rejected photos
    $stmt = $pdo->prepare("
        SELECT pt.id, pt.photo_id, pt.person_name
        FROM photo_tags pt
        JOIN photo_submissions ps ON pt.photo_id = ps.id
        WHERE ps.status = 'rejected'
    ");
    $stmt->execute();
    $rejectedOldTags = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (count($rejectedOldTags) > 0) {
        $stmt = $pdo->prepare("
            DELETE pt FROM photo_tags pt
            JOIN photo_submissions ps ON pt.photo_id = ps.id
            WHERE ps.status = 'rejected'
        ");
        $stmt->execute();
        $results['photo_tags_removed'] += $stmt->rowCount();
    }

    // Commit transaction
    $pdo->commit();

    $totalRemoved = $results['photo_tags_removed'] + $results['content_tags_removed'] + $results['rejected_tags_removed'];

    echo json_encode([
        'success' => true,
        'message' => $totalRemoved > 0
            ? "Cleaned up {$totalRemoved} orphaned tag(s)"
            : "No orphaned tags found",
        'results' => $results
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log("Orphan tag cleanup error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error cleaning up tags: ' . $e->getMessage()]);
}
