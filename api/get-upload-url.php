<?php
/**
 * Generate presigned URL for direct-to-R2 uploads
 *
 * Client sends: filename, fileType (mime), fileSize, uploadType (photo|media)
 * Server returns: presigned URL, storage key, headers to include
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

    $filename = $data['filename'] ?? '';
    $fileType = $data['fileType'] ?? '';
    $fileSize = intval($data['fileSize'] ?? 0);
    $uploadType = $data['uploadType'] ?? 'photo'; // 'photo' or 'media'

    // Validate required fields
    if (!$filename || !$fileType || !$fileSize) {
        throw new Exception('Missing required fields: filename, fileType, fileSize');
    }

    // Validate file type
    if ($uploadType === 'photo') {
        if (!R2::isValidPhotoType($fileType)) {
            throw new Exception('Invalid file type. Allowed: JPEG, PNG, GIF, WebP, HEIC');
        }
        $maxSize = R2_MAX_PHOTO_SIZE;
        $prefix = 'pending/photos';
    } else {
        if (!R2::isValidMediaType($fileType)) {
            throw new Exception('Invalid file type for media upload');
        }
        $maxSize = R2_MAX_MEDIA_SIZE;
        $prefix = 'pending/media';
    }

    // Validate file size
    if ($fileSize > $maxSize) {
        $maxMB = round($maxSize / 1024 / 1024);
        throw new Exception("File too large. Maximum size is {$maxMB}MB");
    }

    // Generate unique storage key
    $userId = $_SESSION['user_id'];
    $storageKey = R2::generateKey($prefix, $filename, $userId);

    // Generate presigned upload URL
    $r2 = new R2();
    $uploadData = $r2->getUploadUrl($storageKey, $fileType);

    echo json_encode([
        'success' => true,
        'upload' => [
            'url' => $uploadData['url'],
            'key' => $storageKey,
            'method' => 'PUT',
            'headers' => [
                'Content-Type' => $fileType
            ],
            'expires_in' => $uploadData['expires_in']
        ],
        'file' => [
            'original_name' => $filename,
            'type' => $fileType,
            'size' => $fileSize
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
