<?php
require_once '../config.php';
requireLogin();

header('Content-Type: application/json');

// Log for debugging
error_log("Upload Photos API called");
error_log("POST data: " . print_r($_POST, true));
error_log("FILES data: " . print_r($_FILES, true));

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

try {
    // Check if files were uploaded
    if (!isset($_FILES['photos'])) {
        error_log("No 'photos' field in FILES array. Available keys: " . implode(', ', array_keys($_FILES)));
        throw new Exception('No photos field in upload');
    }

    // Ensure we have an array format for consistent processing
    if (!is_array($_FILES['photos']['name'])) {
        // Single file - convert to array format
        $_FILES['photos'] = [
            'name' => [$_FILES['photos']['name']],
            'type' => [$_FILES['photos']['type']],
            'tmp_name' => [$_FILES['photos']['tmp_name']],
            'error' => [$_FILES['photos']['error']],
            'size' => [$_FILES['photos']['size']]
        ];
    }

    // Verify we have at least one valid file
    if (empty($_FILES['photos']['name'][0])) {
        error_log("Empty photos array");
        throw new Exception('No photos uploaded');
    }
    
    // Get form data
    $eventName = sanitizeInput($_POST['event_name'] ?? '');
    $dateTaken = sanitizeInput($_POST['date_taken'] ?? '');
    $peopleInPhoto = sanitizeInput($_POST['people_in_photo'] ?? '');
    $description = sanitizeInput($_POST['description'] ?? '');
    $suggestedAlbum = sanitizeInput($_POST['suggested_album'] ?? '');
    
    // Validate required fields
    if (!$eventName || !$dateTaken) {
        throw new Exception('Event name and date are required');
    }
    
    $uploadedFiles = [];
    $errors = [];
    
    // Process each uploaded file
    foreach ($_FILES['photos']['name'] as $index => $filename) {
        if ($_FILES['photos']['error'][$index] !== UPLOAD_ERR_OK) {
            $errors[] = "Error uploading {$filename}";
            continue;
        }
        
        $tmpName = $_FILES['photos']['tmp_name'][$index];
        $fileSize = $_FILES['photos']['size'][$index];
        $fileType = $_FILES['photos']['type'][$index];
        
        // Validate file type
        $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (!in_array($fileType, $allowedTypes)) {
            $errors[] = "{$filename} is not a valid image type";
            continue;
        }
        
        // Validate file size (10MB max)
        if ($fileSize > 10 * 1024 * 1024) {
            $errors[] = "{$filename} is too large (max 10MB)";
            continue;
        }
        
        // Generate unique filename
        $extension = pathinfo($filename, PATHINFO_EXTENSION);
        $uniqueFilename = uniqid() . '_' . time() . '.' . $extension;
        $uploadPath = '../uploads/pending/' . $uniqueFilename;
        
        // Ensure pending directory exists
        if (!is_dir('../uploads/pending')) {
            mkdir('../uploads/pending', 0755, true);
        }
        
        // Move uploaded file
        if (move_uploaded_file($tmpName, $uploadPath)) {
            // Save to photo_submissions table
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
                $eventName,
                $dateTaken,
                $peopleInPhoto,
                $description,
                $suggestedAlbum,
                $_SESSION['user_id']
            ]);
            
            $uploadedFiles[] = $filename;
        } else {
            $errors[] = "Failed to save {$filename}";
        }
    }
    
    // Return results
    if (!empty($uploadedFiles)) {
        $message = count($uploadedFiles) . ' photo(s) uploaded successfully';
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
        throw new Exception('No photos were uploaded successfully. Errors: ' . implode(', ', $errors));
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>