<?php
require_once "config.php";
requireLogin();

// Get user admin status  
$isAdmin = isAdmin();
$userId = $_SESSION['user_id'] ?? null;

// Get recipe ID from URL parameters
$recipeId = $_GET['id'] ?? null;
if (!$recipeId) {
    header('Location: recipes.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Recipe - Reed & Weaver</title>
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/recipe-create.css">
</head>
<body>
    <!-- Recipe Edit Universe Background -->
    <div class="recipe-create-universe">
        <div class="universe-particles"></div>
        <div class="universe-gradient"></div>
    </div>

    <!-- Unified header will be inserted here by header.js -->
    
    <main class="main-content">
        <div class="recipe-create-container">
            <header class="recipe-create-header">
                <h1>✏️ Edit Family Recipe</h1>
                <p>Update and refine your culinary masterpiece. Every edit makes it even more perfect for the family.</p>
            </header>

            <form id="recipeEditForm" class="recipe-create-form">
                <input type="hidden" id="recipeId" value="<?= htmlspecialchars($recipeId) ?>">
                
                <!-- Recipe Basics Section -->
                <div class="recipe-basics-section">
                    <h2>Recipe Basics</h2>
                    <p class="section-help">Update the essentials - name, category, and key details about your recipe.</p>

                    <div class="form-group">
                        <label for="recipeName">Recipe Name</label>
                        <input type="text" id="recipeName" name="recipe_name" placeholder="e.g., Grandma's Famous Apple Pie" required>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="recipeCategory">Category</label>
                            <select id="recipeCategory" name="recipe_category" required>
                                <option value="">Select category...</option>
                                <option value="appetizers">🥗 Appetizers</option>
                                <option value="main">🍽️ Main Dishes</option>
                                <option value="desserts">🍰 Desserts</option>
                                <option value="drinks">🥤 Drinks</option>
                                <option value="sides">🥕 Side Dishes</option>
                                <option value="breakfast">🍳 Breakfast</option>
                                <option value="snacks">🍿 Snacks</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="recipeDifficulty">Difficulty Level</label>
                            <select id="recipeDifficulty" name="recipe_difficulty" required>
                                <option value="">Select difficulty...</option>
                                <option value="easy">🟢 Easy</option>
                                <option value="medium">🟡 Medium</option>
                                <option value="hard">🔴 Hard</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="recipeServes">Serves</label>
                            <input type="number" id="recipeServes" name="recipe_serves" placeholder="4" min="1" max="20" required>
                        </div>
                        <div class="form-group">
                            <label for="recipePrepTime">Prep Time</label>
                            <input type="text" id="recipePrepTime" name="recipe_prep_time" placeholder="e.g., 30 minutes, 1 hour">
                        </div>
                        <div class="form-group">
                            <label for="recipeCookTime">Cook Time</label>
                            <input type="text" id="recipeCookTime" name="recipe_cook_time" placeholder="e.g., 45 minutes, 2 hours">
                        </div>
                    </div>
                </div>

                <!-- Ingredients Section -->
                <div class="ingredients-section">
                    <h2>Ingredients</h2>
                    <p class="section-help">Update all ingredients needed for your recipe. Be specific with measurements and descriptions.</p>

                    <div class="ingredients-builder" id="ingredientsBuilder">
                        <!-- Ingredients will be loaded dynamically -->
                    </div>
                    <button type="button" class="add-ingredient" id="addIngredientBtn">+ Add Ingredient</button>
                </div>

                <!-- Instructions Section -->
                <div class="instructions-section">
                    <h2>Instructions</h2>
                    <p class="section-help">Update clear, step-by-step instructions. Each step should be easy to follow.</p>

                    <div class="instructions-builder" id="instructionsBuilder">
                        <!-- Instructions will be loaded dynamically -->
                    </div>
                    <button type="button" class="add-instruction" id="addInstructionBtn">+ Add Step</button>
                </div>

                <!-- Recipe Story Section -->
                <div class="recipe-story-section">
                    <h2>Recipe Story</h2>
                    <p class="section-help">Update the story behind this recipe - where it came from, what makes it special, family memories, or cooking tips.</p>

                    <div class="form-group">
                        <label for="recipeStory">Family Story</label>
                        <textarea id="recipeStory" name="recipe_story" rows="6" placeholder="Tell us about this recipe... Where did it come from? What makes it special to our family? Any special memories or tips to share?"></textarea>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="recipeSource">Recipe Source</label>
                            <input type="text" id="recipeSource" name="recipe_source" placeholder="e.g., Great Grandma Rose, Mom's cookbook, family tradition">
                        </div>
                        <div class="form-group">
                            <label for="recipeOccasion">Perfect For</label>
                            <input type="text" id="recipeOccasion" name="recipe_occasion" placeholder="e.g., Holiday dinners, Sunday brunch, special occasions">
                        </div>
                    </div>
                </div>

                <!-- Form Actions -->
                <div class="recipe-create-actions">
                    <a href="recipes.php" class="btn-secondary">Cancel Changes</a>
                    <button type="submit" class="btn-primary" id="updateRecipeBtn">
                        <span class="btn-text">Update Recipe</span>
                        <span class="btn-loading" hidden>Updating...</span>
                    </button>
                </div>
            </form>

            <!-- Creation Progress -->
            <div class="creation-progress" id="creationProgress" hidden>
                <div class="progress-header">
                    <h3>Updating Your Recipe</h3>
                    <span class="progress-text" id="progressText">Processing...</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill"></div>
                </div>
                <div class="progress-details" id="progressDetails">Saving your updates...</div>
            </div>

            <!-- Success Message -->
            <div class="creation-success" id="creationSuccess" hidden>
                <div class="success-icon">✨</div>
                <h3>Recipe Updated Successfully!</h3>
                <p>Your recipe changes have been saved. The updated recipe is ready for the family to enjoy!</p>
                <div class="success-actions">
                    <button class="btn-primary" onclick="viewRecipe()">View Recipe</button>
                    <a href="recipes.php" class="btn-secondary">Back to Recipes</a>
                </div>
            </div>
        </div>
    </main>

    <!-- Setup currentUser for header -->
    <script>
        window.currentUser = {
            id: <?= json_encode($userId) ?>,
            displayName: <?= json_encode($_SESSION['display_name'] ?? 'User') ?>,
            isAdmin: <?= json_encode($isAdmin) ?>
        };
        
        // Set edit mode flag for the JavaScript
        window.recipeEditMode = true;
        window.editRecipeId = <?= json_encode($recipeId) ?>;
    </script>

    <script src="js/header.js"></script>
    <script src="js/recipe-create.js"></script>
</body>
</html>