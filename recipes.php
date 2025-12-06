<?php
require_once "config.php";
requireLogin();

$isAdmin = isAdmin();
$userId = $_SESSION['user_id'];

// Fetch recipes from database
try {
    // Get all active recipes with modification counts
    $stmt = $pdo->prepare("
        SELECT r.*, u.display_name as created_by_name,
               COUNT(rm.id) as modification_count,
               MAX(rm.created_at) as last_modified
        FROM recipes r
        LEFT JOIN users u ON r.created_by = u.id
        LEFT JOIN recipe_modifications rm ON r.id = rm.recipe_id
        WHERE r.is_active = 1
        GROUP BY r.id
        ORDER BY r.created_at DESC
    ");
    $stmt->execute();
    $recipesRaw = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Convert text fields to arrays for JS consumption
    $recipes = array_map(function($recipe) {
        // Parse ingredients and instructions from newline-separated text to arrays
        $recipe['ingredients'] = !empty($recipe['ingredients'])
            ? array_filter(array_map('trim', explode("\n", $recipe['ingredients'])))
            : [];
        $recipe['instructions'] = !empty($recipe['instructions'])
            ? array_filter(array_map('trim', explode("\n", $recipe['instructions'])))
            : [];
        // Add author field for JS compatibility
        $recipe['author'] = $recipe['created_by_name'] ?? 'Unknown';
        // Add description from story if not present
        $recipe['description'] = $recipe['story'] ?? '';
        // Rename time fields for JS compatibility
        $recipe['prepTime'] = $recipe['prep_time'] ?? '';
        $recipe['cookTime'] = $recipe['cook_time'] ?? '';
        return $recipe;
    }, $recipesRaw);
    
    // Get recipe categories/stats
    $categoriesStmt = $pdo->prepare("
        SELECT category, COUNT(*) as count
        FROM recipes
        WHERE is_active = 1 AND category IS NOT NULL
        GROUP BY category
    ");
    $categoriesStmt->execute();
    $categories = $categoriesStmt->fetchAll(PDO::FETCH_ASSOC);

    // Get unique recipe creators for family filter
    $creatorsStmt = $pdo->prepare("
        SELECT DISTINCT u.id, u.display_name
        FROM recipes r
        JOIN users u ON r.created_by = u.id
        WHERE r.is_active = 1
        ORDER BY u.display_name ASC
    ");
    $creatorsStmt->execute();
    $recipeCreators = $creatorsStmt->fetchAll(PDO::FETCH_ASSOC);

    // Calculate stats
    $totalRecipes = count($recipes);
    $familyContributors = count(array_unique(array_column($recipes, 'created_by')));
    $totalModifications = array_sum(array_column($recipes, 'modification_count'));
    
} catch (PDOException $e) {
    $recipes = [];
    $categories = [];
    $recipeCreators = [];
    $totalRecipes = 0;
    $familyContributors = 0;
    $totalModifications = 0;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Family Recipe Vault - Reed & Weaver</title>
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/recipes.css">
</head>
<body>
    <!-- Background Universe -->
    <div class="recipe-universe">
        <div class="universe-particles"></div>
        <div class="universe-gradient"></div>
    </div>

    <!-- Loading Experience -->
    <div class="recipe-loading" id="recipeLoading">
        <div class="loading-spinner"></div>
        <div class="loading-text">Preparing your family cookbook...</div>
    </div>

    <!-- Unified header will be inserted here by header.js -->
    
    <!-- Main Recipe Vault -->
    <main class="main-content">
        <div class="recipe-vault hidden" id="recipeVault">
            
            <!-- Recipe Vault Header Modal -->
            <div class="vault-header-modal">
                <div class="vault-header">
                    <div class="header-left">
                        <div class="vault-logo">
                            <span class="logo-icon">🍝</span>
                            <span class="logo-text">Family Recipe Vault</span>
                        </div>
                        <div class="vault-subtitle">Where culinary traditions live forever</div>
                    </div>
                    <div class="header-right">
                        <button class="vault-action-btn" id="addRecipeBtn">
                            <span class="btn-icon">✨</span>
                            <span class="btn-text">Create Recipe</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Search & Filter Modal -->
            <div class="vault-search-modal">
                <div class="vault-controls">
                    <div class="search-container">
                        <input type="text" id="recipeSearch" placeholder="Search recipes, ingredients, or family members..." class="search-input">
                        <button class="search-btn" id="searchBtn">🔍</button>
                    </div>
                    <div class="filter-container">
                        <div class="filter-group">
                            <label class="filter-label">Filter by:</label>
                            <select id="categoryFilter" class="filter-select">
                                <option value="all">All Categories</option>
                                <option value="appetizers">Appetizers</option>
                                <option value="breakfast">Breakfast</option>
                                <option value="main">Main Dishes</option>
                                <option value="desserts">Desserts</option>
                                <option value="drinks">Drinks</option>
                                <option value="sides">Side Dishes</option>
                                <option value="snacks">Snacks</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <select id="familyFilter" class="filter-select">
                                <option value="all">All Family Members</option>
                                <?php foreach ($recipeCreators as $creator): ?>
                                    <option value="<?= htmlspecialchars($creator['id']) ?>">
                                        <?= htmlspecialchars($creator['display_name']) ?>'s Recipes
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="filter-group">
                            <select id="difficultyFilter" class="filter-select">
                                <option value="all">All Difficulties</option>
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Recipe Content Area -->
            <div class="vault-content-area">
                <!-- Recipe Grid -->
                <div class="recipe-grid" id="recipeGrid">
                    <!-- Recipe cards will be populated here -->
                </div>

                <!-- Recipe Stats -->
                <div class="vault-stats">
                    <div class="stat-card">
                        <div class="stat-number" id="totalRecipes"><?= $totalRecipes ?></div>
                        <div class="stat-label">Total Recipes</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" id="familyContributors">0</div>
                        <div class="stat-label">Family Contributors</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" id="recentUpdates">0</div>
                        <div class="stat-label">Recent Updates</div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <!-- Recipe Detail Modal -->
    <div class="modal recipe-modal hidden" id="recipeModal">
        <div class="modal-backdrop"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title" id="modalTitle">Recipe Details</h2>
                <button class="modal-close" id="closeModal">×</button>
            </div>
            <div class="modal-body" id="modalBody">
                <!-- Recipe details will be populated here -->
            </div>
        </div>
    </div>

    <!-- Create Recipe Modal -->
    <div class="modal recipe-modal hidden" id="createRecipeModal">
        <div class="modal-backdrop"></div>
        <div class="modal-content large">
            <div class="modal-header">
                <h2 class="modal-title">Create New Recipe</h2>
                <button class="modal-close" id="closeCreateModal">×</button>
            </div>
            <div class="modal-body">
                <form id="createRecipeForm" class="recipe-form">
                    <div class="form-section">
                        <label class="form-label">Recipe Name</label>
                        <input type="text" id="recipeName" class="form-input" placeholder="Enter recipe name..." required>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-section">
                            <label class="form-label">Category</label>
                            <select id="recipeCategory" class="form-select" required>
                                <option value="">Select category...</option>
                                <option value="appetizers">Appetizers</option>
                                <option value="main">Main Dishes</option>
                                <option value="desserts">Desserts</option>
                                <option value="drinks">Drinks</option>
                                <option value="sides">Side Dishes</option>
                            </select>
                        </div>
                        <div class="form-section">
                            <label class="form-label">Difficulty</label>
                            <select id="recipeDifficulty" class="form-select" required>
                                <option value="">Select difficulty...</option>
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                            </select>
                        </div>
                        <div class="form-section">
                            <label class="form-label">Serves</label>
                            <input type="number" id="recipeServes" class="form-input" placeholder="4" min="1" max="20" required>
                        </div>
                    </div>

                    <div class="form-section">
                        <label class="form-label">Ingredients</label>
                        <div class="ingredients-builder" id="ingredientsBuilder">
                            <div class="ingredient-item">
                                <input type="text" class="ingredient-input" placeholder="Enter ingredient..." required>
                                <button type="button" class="remove-ingredient">×</button>
                            </div>
                        </div>
                        <button type="button" class="add-ingredient" id="addIngredient">+ Add Ingredient</button>
                    </div>

                    <div class="form-section">
                        <label class="form-label">Instructions</label>
                        <div class="instructions-builder" id="instructionsBuilder">
                            <div class="instruction-item">
                                <div class="instruction-number">1</div>
                                <textarea class="instruction-input" placeholder="Enter instruction step..." required></textarea>
                                <button type="button" class="remove-instruction">×</button>
                            </div>
                        </div>
                        <button type="button" class="add-instruction" id="addInstruction">+ Add Step</button>
                    </div>

                    <div class="form-section">
                        <label class="form-label">Family Story</label>
                        <textarea id="recipeStory" class="form-textarea" placeholder="Share the story behind this recipe... Where did it come from? What makes it special to our family?" rows="4"></textarea>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="form-btn secondary" id="cancelCreate">Cancel</button>
                        <button type="submit" class="form-btn primary">Create Recipe</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Kitchen Mode Modal removed - now only opens in new tab -->

    <!-- Timeline Modal -->
    <div class="modal timeline-modal hidden" id="timelineModal">
        <div class="modal-backdrop"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">Recipe Evolution Timeline</h2>
                <button class="modal-close" id="closeTimelineModal">×</button>
            </div>
            <div class="modal-body">
                <div class="timeline-container" id="timelineContainer">
                    <!-- Timeline will be populated here -->
                </div>
            </div>
        </div>
    </main>

    <!-- Pass PHP data to JavaScript -->
    <script>
        window.recipeVaultData = {
            recipes: <?= json_encode($recipes) ?>,
            categories: <?= json_encode($categories) ?>,
            stats: {
                totalRecipes: <?= json_encode($totalRecipes) ?>,
                familyContributors: <?= json_encode($familyContributors) ?>,
                totalModifications: <?= json_encode($totalModifications) ?>
            },
            isAdmin: <?= json_encode($isAdmin) ?>,
            userId: <?= json_encode($userId) ?>
        };
    </script>
    <script>
        window.currentUser = {
            id: <?= json_encode($userId ?? $_SESSION['user_id'] ?? null) ?>,
            displayName: <?= json_encode($_SESSION['display_name'] ?? 'User') ?>,
            isAdmin: <?= json_encode($isAdmin) ?>
        };
    </script>
    <script src="js/header.js"></script>
    <script src="js/recipe-vault.js"></script>
</body>
</html>