<?php
require_once '../config.php';
requireLogin();

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    switch ($method) {
        case 'GET':
            if ($action === 'list') {
                // Get all recipes with author info
                $stmt = $pdo->prepare("
                    SELECT r.*, u.display_name as author_name,
                           COUNT(rm.id) as modification_count
                    FROM recipes r 
                    JOIN users u ON r.created_by = u.id 
                    LEFT JOIN recipe_modifications rm ON r.id = rm.recipe_id
                    WHERE r.is_active = 1 
                    GROUP BY r.id
                    ORDER BY r.created_at DESC
                ");
                $stmt->execute();
                $recipes = $stmt->fetchAll();
                
                echo json_encode(['success' => true, 'recipes' => $recipes]);
                
            } elseif ($action === 'detail' && isset($_GET['id'])) {
                // Get recipe with modifications
                $recipeId = (int)$_GET['id'];
                
                $stmt = $pdo->prepare("
                    SELECT r.*, u.display_name as author_name 
                    FROM recipes r 
                    JOIN users u ON r.created_by = u.id 
                    WHERE r.id = ? AND r.is_active = 1
                ");
                $stmt->execute([$recipeId]);
                $recipe = $stmt->fetch();
                
                if (!$recipe) {
                    throw new Exception('Recipe not found');
                }
                
                // Get modifications
                $stmt = $pdo->prepare("
                    SELECT rm.*, u.display_name as modifier_name 
                    FROM recipe_modifications rm 
                    JOIN users u ON rm.modified_by = u.id 
                    WHERE rm.recipe_id = ? 
                    ORDER BY rm.created_at ASC
                ");
                $stmt->execute([$recipeId]);
                $modifications = $stmt->fetchAll();
                
                $recipe['modifications'] = $modifications;
                echo json_encode(['success' => true, 'recipe' => $recipe]);
                
            } elseif ($action === 'admin_list') {
                // Get all recipes for admin management (including inactive)
                if (!isAdmin()) {
                    throw new Exception('Access denied');
                }
                
                $stmt = $pdo->prepare("
                    SELECT r.*, u.display_name as author_name,
                           COUNT(rm.id) as modification_count
                    FROM recipes r 
                    JOIN users u ON r.created_by = u.id 
                    LEFT JOIN recipe_modifications rm ON r.id = rm.recipe_id
                    GROUP BY r.id
                    ORDER BY r.created_at DESC
                ");
                $stmt->execute();
                $recipes = $stmt->fetchAll();
                
                echo json_encode(['success' => true, 'recipes' => $recipes]);
            }
            break;
            
        case 'DELETE':
            // Delete a recipe (soft delete by setting is_active = 0)
            if (!isAdmin()) {
                throw new Exception('Access denied');
            }

            $recipeId = (int)($_GET['id'] ?? 0);
            if (!$recipeId) {
                throw new Exception('Recipe ID is required');
            }

            $stmt = $pdo->prepare("UPDATE recipes SET is_active = 0 WHERE id = ?");
            $stmt->execute([$recipeId]);

            if ($stmt->rowCount() > 0) {
                echo json_encode(['success' => true, 'message' => 'Recipe deleted successfully']);
            } else {
                throw new Exception('Recipe not found');
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);

            // Handle delete action via POST (for bulk operations)
            if ($action === 'delete') {
                if (!isAdmin()) {
                    throw new Exception('Access denied');
                }

                $recipeId = (int)($input['recipe_id'] ?? 0);
                if (!$recipeId) {
                    throw new Exception('Recipe ID is required');
                }

                $stmt = $pdo->prepare("UPDATE recipes SET is_active = 0 WHERE id = ?");
                $stmt->execute([$recipeId]);

                echo json_encode(['success' => true, 'message' => 'Recipe deleted successfully']);
                break;
            }

            if ($action === 'add') {
                // Add new recipe with all fields
                $name = sanitizeInput($input['name'] ?? '');
                $category = sanitizeInput($input['category'] ?? '');
                $difficulty = sanitizeInput($input['difficulty'] ?? '');
                $serves = isset($input['serves']) ? (int)$input['serves'] : null;
                $prepTime = sanitizeInput($input['prep_time'] ?? '');
                $cookTime = sanitizeInput($input['cook_time'] ?? '');
                $ingredients = sanitizeInput($input['ingredients'] ?? '');
                $instructions = sanitizeInput($input['instructions'] ?? '');
                $story = sanitizeInput($input['story'] ?? '');
                $source = sanitizeInput($input['source'] ?? '');
                $occasion = sanitizeInput($input['occasion'] ?? '');
                $notes = sanitizeInput($input['notes'] ?? '');

                if (!$name || !$ingredients || !$instructions) {
                    throw new Exception('Name, ingredients, and instructions are required');
                }

                $stmt = $pdo->prepare("
                    INSERT INTO recipes (
                        name, category, difficulty, serves, prep_time, cook_time,
                        ingredients, instructions, story, source, occasion, created_by
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([
                    $name, $category, $difficulty, $serves, $prepTime, $cookTime,
                    $ingredients, $instructions, $story, $source, $occasion, $_SESSION['user_id']
                ]);
                $recipeId = $pdo->lastInsertId();

                // Add initial note if provided
                if ($notes) {
                    $stmt = $pdo->prepare("
                        INSERT INTO recipe_modifications (recipe_id, modified_by, modification_text)
                        VALUES (?, ?, ?)
                    ");
                    $stmt->execute([$recipeId, $_SESSION['user_id'], $notes]);
                }

                echo json_encode([
                    'success' => true,
                    'message' => 'Recipe added successfully',
                    'recipe_id' => $recipeId
                ]);
                
            } elseif ($action === 'add_note') {
                // Add modification note
                $recipeId = (int)($input['recipe_id'] ?? 0);
                $noteText = sanitizeInput($input['note'] ?? '');
                
                if (!$recipeId || !$noteText) {
                    throw new Exception('Recipe ID and note text are required');
                }
                
                $stmt = $pdo->prepare("
                    INSERT INTO recipe_modifications (recipe_id, modified_by, modification_text) 
                    VALUES (?, ?, ?)
                ");
                $stmt->execute([$recipeId, $_SESSION['user_id'], $noteText]);
                
                echo json_encode(['success' => true, 'message' => 'Note added successfully']);
            }
            break;
            
        default:
            throw new Exception('Method not allowed');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>