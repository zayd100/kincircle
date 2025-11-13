<?php
require_once '../../config.php';
requireLogin();

header('Content-Type: application/json');

try {
    // Get all family members (active users)
    $stmt = $pdo->prepare("
        SELECT id, display_name, username, email
        FROM users 
        WHERE id != ?
        ORDER BY display_name ASC
    ");
    
    $stmt->execute([$_SESSION['user_id']]);
    $members = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format for frontend
    $formattedMembers = [];
    foreach ($members as $member) {
        $formattedMembers[] = [
            'id' => $member['id'],
            'name' => $member['display_name'],
            'display_name' => $member['display_name'],
            'username' => $member['username'],
            'email' => $member['email'] ?? '',
            'initials' => substr($member['display_name'], 0, 1) . 
                         (strpos($member['display_name'], ' ') !== false ? 
                          substr($member['display_name'], strpos($member['display_name'], ' ') + 1, 1) : '')
        ];
    }
    
    echo json_encode(['success' => true, 'members' => $formattedMembers]);
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage(), 'members' => []]);
}
?>