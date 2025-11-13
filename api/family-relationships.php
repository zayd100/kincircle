<?php
require_once '../config.php';
requireLogin();

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$userId = $_SESSION['user_id'];

try {
    switch ($method) {
        case 'GET':
            if ($action === 'my_relationships') {
                // Get all relationships involving the current user
                $stmt = $pdo->prepare("
                    SELECT 
                        fr.*,
                        CASE 
                            WHEN fr.claimer_user_id = ? THEN 'claimed'
                            ELSE 'claimed_by'
                        END as relationship_direction,
                        CASE 
                            WHEN fr.claimer_user_id = ? THEN claimed.display_name
                            ELSE claimer.display_name
                        END as other_person_name,
                        CASE 
                            WHEN fr.claimer_user_id = ? THEN fr.claimed_user_id
                            ELSE fr.claimer_user_id
                        END as other_person_id
                    FROM family_relationships fr
                    JOIN users claimer ON fr.claimer_user_id = claimer.id
                    JOIN users claimed ON fr.claimed_user_id = claimed.id
                    WHERE (fr.claimer_user_id = ? OR fr.claimed_user_id = ?) 
                      AND fr.active = TRUE
                    ORDER BY fr.created_at DESC
                ");
                $stmt->execute([$userId, $userId, $userId, $userId, $userId]);
                $relationships = $stmt->fetchAll();
                
                echo json_encode(['success' => true, 'relationships' => $relationships]);
                
            } elseif ($action === 'claims_about_me') {
                // Get all active claims made about the current user
                $stmt = $pdo->prepare("
                    SELECT fr.*, u.display_name as claimer_name
                    FROM family_relationships fr
                    JOIN users u ON fr.claimer_user_id = u.id
                    WHERE fr.claimed_user_id = ? AND fr.active = TRUE
                    ORDER BY fr.created_at DESC
                ");
                $stmt->execute([$userId]);
                $claims = $stmt->fetchAll();
                
                echo json_encode(['success' => true, 'claims' => $claims]);
                
            } elseif ($action === 'family_tree' && isset($_GET['user_id'])) {
                // Get family tree data for a specific user
                $targetUserId = (int)$_GET['user_id'];
                
                $relationships = getFamilyTreeData($pdo, $targetUserId);
                $inferences = calculateFamilyInferences($pdo, $targetUserId);
                
                echo json_encode([
                    'success' => true, 
                    'direct_relationships' => $relationships,
                    'inferred_relationships' => $inferences
                ]);
                
            } elseif ($action === 'connection_map') {
                // Get full family connection map
                $cacheKey = 'family_map_' . md5(serialize($_SESSION));
                
                // Try to get from cache first
                $stmt = $pdo->prepare("
                    SELECT graph_data FROM family_connection_cache 
                    WHERE cache_key = ? AND expires_at > NOW()
                ");
                $stmt->execute([$cacheKey]);
                $cached = $stmt->fetch();
                
                if ($cached) {
                    echo $cached['graph_data'];
                } else {
                    // Generate fresh connection map
                    $connectionMap = generateConnectionMap($pdo);
                    
                    // Cache the result for 30 minutes
                    $expiresAt = date('Y-m-d H:i:s', strtotime('+30 minutes'));
                    $stmt = $pdo->prepare("
                        INSERT INTO family_connection_cache (cache_key, graph_data, person_count, expires_at)
                        VALUES (?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE 
                        graph_data = VALUES(graph_data),
                        person_count = VALUES(person_count),
                        expires_at = VALUES(expires_at),
                        created_at = NOW()
                    ");
                    $stmt->execute([
                        $cacheKey, 
                        json_encode($connectionMap), 
                        count($connectionMap['nodes'] ?? []),
                        $expiresAt
                    ]);
                    
                    echo json_encode($connectionMap);
                }
            }
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            
            if ($action === 'claim_relationship') {
                // Claim a relationship with another user
                $claimedUserId = (int)($input['claimed_user_id'] ?? 0);
                $relationship = $input['relationship'] ?? '';
                
                if (!$claimedUserId || !in_array($relationship, ['parent', 'child', 'sibling', 'spouse'])) {
                    throw new Exception('Valid claimed user ID and relationship type required');
                }
                
                if ($claimedUserId === $userId) {
                    throw new Exception('Cannot claim relationship with yourself');
                }
                
                // Check if this exact claim was already revoked by the claimed person
                $stmt = $pdo->prepare("
                    SELECT id FROM family_relationships 
                    WHERE claimer_user_id = ? AND claimed_user_id = ? 
                      AND relationship = ? AND revoked_by = ?
                ");
                $stmt->execute([$userId, $claimedUserId, $relationship, $claimedUserId]);
                
                if ($stmt->fetch()) {
                    throw new Exception('Cannot reclaim - this person has revoked this relationship');
                }
                
                // Create the claim
                $stmt = $pdo->prepare("
                    INSERT INTO family_relationships (claimer_user_id, claimed_user_id, relationship)
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE active = TRUE, revoked_at = NULL, revoked_by = NULL
                ");
                $stmt->execute([$userId, $claimedUserId, $relationship]);
                
                // Create notification for claimed person
                $claimerName = $_SESSION['display_name'] ?? 'Someone';
                $stmt = $pdo->prepare("
                    INSERT INTO relationship_notifications (user_id, type, relationship_id, claimer_user_id, message)
                    VALUES (?, 'claim_made', ?, ?, ?)
                ");
                $stmt->execute([
                    $claimedUserId,
                    $pdo->lastInsertId(),
                    $userId,
                    "{$claimerName} has claimed you as their {$relationship}"
                ]);
                
                echo json_encode(['success' => true, 'message' => 'Relationship claimed successfully']);
                
            } elseif ($action === 'revoke_relationship') {
                // Revoke a relationship claim made about you
                $relationshipId = (int)($input['relationship_id'] ?? 0);
                
                $stmt = $pdo->prepare("
                    SELECT * FROM family_relationships 
                    WHERE id = ? AND claimed_user_id = ? AND active = TRUE
                ");
                $stmt->execute([$relationshipId, $userId]);
                $relationship = $stmt->fetch();
                
                if (!$relationship) {
                    throw new Exception('Relationship not found or you cannot revoke it');
                }
                
                // Revoke the relationship
                $stmt = $pdo->prepare("
                    UPDATE family_relationships 
                    SET active = FALSE, revoked_at = NOW(), revoked_by = ?
                    WHERE id = ?
                ");
                $stmt->execute([$userId, $relationshipId]);
                
                // Notify the original claimer
                $stmt = $pdo->prepare("
                    INSERT INTO relationship_notifications (user_id, type, relationship_id, message)
                    VALUES (?, 'claim_revoked', ?, 'Your relationship claim has been revoked')
                ");
                $stmt->execute([$relationship['claimer_user_id'], $relationshipId]);
                
                echo json_encode(['success' => true, 'message' => 'Relationship revoked successfully']);
            }
            break;
            
        default:
            throw new Exception('Method not allowed');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

// Helper functions
function getFamilyTreeData($pdo, $userId) {
    $stmt = $pdo->prepare("
        SELECT fr.*, 
               claimer.display_name as claimer_name,
               claimed.display_name as claimed_name
        FROM family_relationships fr
        JOIN users claimer ON fr.claimer_user_id = claimer.id
        JOIN users claimed ON fr.claimed_user_id = claimed.id
        WHERE (fr.claimer_user_id = ? OR fr.claimed_user_id = ?) 
          AND fr.active = TRUE
    ");
    $stmt->execute([$userId, $userId]);
    return $stmt->fetchAll();
}

function calculateFamilyInferences($pdo, $userId) {
    // This is where the inference engine would run
    // For now, return cached inferences
    $stmt = $pdo->prepare("
        SELECT fi.*, u.display_name as related_person_name
        FROM family_inferences fi
        JOIN users u ON fi.related_user_id = u.id
        WHERE fi.person_user_id = ?
        ORDER BY fi.confidence DESC, fi.relationship ASC
    ");
    $stmt->execute([$userId]);
    return $stmt->fetchAll();
}

function generateConnectionMap($pdo) {
    // Get all active relationships for visualization
    $stmt = $pdo->query("
        SELECT fr.*, 
               claimer.display_name as claimer_name,
               claimed.display_name as claimed_name
        FROM family_relationships fr
        JOIN users claimer ON fr.claimer_user_id = claimer.id
        JOIN users claimed ON fr.claimed_user_id = claimed.id
        WHERE fr.active = TRUE
    ");
    $relationships = $stmt->fetchAll();
    
    // Build nodes and edges for D3.js visualization
    $nodes = [];
    $edges = [];
    $userIds = [];
    
    foreach ($relationships as $rel) {
        if (!in_array($rel['claimer_user_id'], $userIds)) {
            $userIds[] = $rel['claimer_user_id'];
            $nodes[] = [
                'id' => $rel['claimer_user_id'],
                'name' => $rel['claimer_name'],
                'type' => 'person'
            ];
        }
        
        if (!in_array($rel['claimed_user_id'], $userIds)) {
            $userIds[] = $rel['claimed_user_id'];
            $nodes[] = [
                'id' => $rel['claimed_user_id'],
                'name' => $rel['claimed_name'],
                'type' => 'person'
            ];
        }
        
        $edges[] = [
            'source' => $rel['claimer_user_id'],
            'target' => $rel['claimed_user_id'],
            'relationship' => $rel['relationship'],
            'confirmed' => true
        ];
    }
    
    return [
        'success' => true,
        'nodes' => $nodes,
        'edges' => $edges,
        'generated_at' => date('c')
    ];
}
?>