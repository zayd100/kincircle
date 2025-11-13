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
    // Get form data
    $name = sanitizeInput($_POST['memorial_name'] ?? '');
    $birthDate = sanitizeInput($_POST['birth_date'] ?? '');
    $deathDate = sanitizeInput($_POST['death_date'] ?? '');
    $memorialText = sanitizeInput($_POST['memorial_text'] ?? '');

    // Validate required fields
    if (!$name || !$memorialText) {
        throw new Exception('Name and memorial message are required');
    }

    $photoFilename = null;

    // Handle photo upload if provided
    if (isset($_FILES['memorial_photo']) && $_FILES['memorial_photo']['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES['memorial_photo'];
        $fileSize = $file['size'];
        $fileType = $file['type'];
        $tmpName = $file['tmp_name'];

        // Validate file type
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!in_array($fileType, $allowedTypes)) {
            throw new Exception('Only JPG, PNG, and GIF images are allowed');
        }

        // Validate file size (10MB max)
        if ($fileSize > 10 * 1024 * 1024) {
            throw new Exception('Photo must be less than 10MB');
        }

        // Generate unique filename
        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $photoFilename = uniqid() . '_' . time() . '.' . $extension;
        $uploadPath = '../uploads/memorials/' . $photoFilename;

        // Ensure memorials directory exists
        if (!is_dir('../uploads/memorials')) {
            mkdir('../uploads/memorials', 0755, true);
        }

        // Move uploaded file
        if (!move_uploaded_file($tmpName, $uploadPath)) {
            throw new Exception('Failed to save photo');
        }
    }

    // Insert into memorial_submissions table
    $stmt = $pdo->prepare("
        INSERT INTO memorial_submissions (
            name, birth_date, death_date, memorial_text, photo_filename, submitted_by
        ) VALUES (?, ?, ?, ?, ?, ?)
    ");

    $stmt->execute([
        $name,
        $birthDate,
        $deathDate,
        $memorialText,
        $photoFilename,
        $_SESSION['user_id']
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Memorial submitted successfully!'
    ]);

} catch (Exception $e) {
    // Clean up uploaded file if there was an error
    if (isset($photoFilename) && file_exists('../uploads/memorials/' . $photoFilename)) {
        unlink('../uploads/memorials/' . $photoFilename);
    }

    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
