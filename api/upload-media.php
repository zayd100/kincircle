<?php
require_once '../config.php';
requireLogin();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

try {
    // Check if files were uploaded
    if (!isset($_FILES['media']) || empty($_FILES['media']['name'][0])) {
        throw new Exception('No media files uploaded');
    }

    // Get form data
    $eventName = sanitizeInput($_POST['event_name'] ?? '');
    $mediaDate = sanitizeInput($_POST['media_date'] ?? $_POST['date_taken'] ?? '');
    $mediaTitle = sanitizeInput($_POST['media_title'] ?? '');
    $peopleInMedia = sanitizeInput($_POST['people_in_media'] ?? $_POST['people_in_photo'] ?? '');
    $description = sanitizeInput($_POST['description'] ?? '');
    $mediaCategory = sanitizeInput($_POST['media_category'] ?? $_POST['suggested_album'] ?? '');
    $uploaderName = sanitizeInput($_POST['uploader_name'] ?? $_SESSION['display_name'] ?? '');

    // Validate required fields
    if (!$eventName || !$mediaDate) {
        throw new Exception('Event name and date are required');
    }

    $uploadedFiles = [];
    $errors = [];

    // Define allowed media types
    $allowedTypes = [
        // Video
        'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv', 'video/x-flv',
        // Audio
        'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a',
        // Documents
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain', 'application/epub+zip'
    ];

    $allowedExtensions = ['mp4', 'mov', 'avi', 'wmv', 'flv', 'mp3', 'wav', 'm4a', 'pdf', 'doc', 'docx', 'txt', 'epub'];

    // Process each uploaded file
    foreach ($_FILES['media']['name'] as $index => $filename) {
        if ($_FILES['media']['error'][$index] !== UPLOAD_ERR_OK) {
            $errors[] = "Error uploading {$filename}";
            continue;
        }

        $tmpName = $_FILES['media']['tmp_name'][$index];
        $fileSize = $_FILES['media']['size'][$index];
        $fileType = $_FILES['media']['type'][$index];

        // Get file extension
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

        // Validate file type (check both MIME type and extension)
        $validType = in_array($fileType, $allowedTypes) || in_array($extension, $allowedExtensions);

        if (!$validType) {
            $errors[] = "{$filename} is not a valid media type. Allowed: videos (MP4, MOV, AVI, WMV, FLV), audio (MP3, WAV, M4A), documents (PDF, DOC, DOCX, TXT, EPUB)";
            continue;
        }

        // Validate file size (500MB max for media)
        if ($fileSize > 500 * 1024 * 1024) {
            $errors[] = "{$filename} is too large (max 500MB)";
            continue;
        }

        // Generate unique filename
        $uniqueFilename = uniqid() . '_' . time() . '.' . $extension;
        $uploadPath = '../uploads/pending/' . $uniqueFilename;

        // Ensure pending directory exists
        if (!is_dir('../uploads/pending')) {
            mkdir('../uploads/pending', 0755, true);
        }

        // Move uploaded file
        if (move_uploaded_file($tmpName, $uploadPath)) {
            // Save to photo_submissions table (reusing for media)
            // Note: This uses photo_submissions table for now - could create media_submissions table later
            $stmt = $pdo->prepare("
                INSERT INTO photo_submissions (
                    filename, original_name, file_type, file_size,
                    event_name, date_taken, people_in_photo, description,
                    suggested_album, uploader_id, status, uploaded_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
            ");

            $stmt->execute([
                $uniqueFilename,
                $filename,
                $fileType,
                $fileSize,
                $mediaTitle ?: $eventName,  // Use title if provided, otherwise event name
                $mediaDate,
                $peopleInMedia,
                $description,
                $mediaCategory,
                $_SESSION['user_id']
            ]);

            $uploadedFiles[] = $filename;
        } else {
            $errors[] = "Failed to save {$filename}";
        }
    }

    // Return results
    if (!empty($uploadedFiles)) {
        $message = count($uploadedFiles) . ' media file(s) uploaded successfully';
        if (!empty($errors)) {
            $message .= ', but some uploads failed';
        }

        echo json_encode([
            'success' => true,
            'message' => $message,
            'uploaded' => $uploadedFiles,
            'errors' => $errors
        ]);
    } else {
        throw new Exception('No media files were uploaded successfully. Errors: ' . implode(', ', $errors));
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
