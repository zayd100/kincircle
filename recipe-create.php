<?php
require_once "config.php";
requireLogin();

// Get user admin status  
$isAdmin = isAdmin();
$userId = $_SESSION['user_id'] ?? null;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Create Recipe - Reed & Weaver</title>
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/recipe-create.css">
</head>
<body>
    <!-- Recipe Creation Universe Background -->
    <div class="recipe-create-universe">
        <div class="universe-particles"></div>
        <div class="universe-gradient"></div>
    </div>

    <!-- Unified header will be inserted here by header.js -->
    
    <main class="main-content">
        <div class="recipe-create-container">
            <header class="recipe-create-header">
                <h1>🍝 Create Family Recipe</h1>
                <p>Share your culinary masterpiece with the family. Every recipe tells a story - make yours unforgettable.</p>
            </header>

            <form id="recipeCreateForm" class="recipe-create-form">
                <!-- Recipe Basics Section -->
                <div class="recipe-basics-section">
                    <h2>Recipe Basics</h2>
                    <p class="section-help">Let's start with the essentials - name, category, and key details about your recipe.</p>

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
                    <p class="section-help">List all ingredients needed for your recipe. Be specific with measurements and descriptions.</p>

                    <div class="ingredients-builder" id="ingredientsBuilder">
                        <div class="ingredient-item">
                            <input type="text" class="ingredient-input" placeholder="e.g., 2 cups all-purpose flour" required>
                            <button type="button" class="remove-ingredient" onclick="removeIngredient(this)">×</button>
                        </div>
                        <div class="ingredient-item">
                            <input type="text" class="ingredient-input" placeholder="e.g., 1 tsp vanilla extract" required>
                            <button type="button" class="remove-ingredient" onclick="removeIngredient(this)">×</button>
                        </div>
                        <div class="ingredient-item">
                            <input type="text" class="ingredient-input" placeholder="e.g., 3 large eggs" required>
                            <button type="button" class="remove-ingredient" onclick="removeIngredient(this)">×</button>
                        </div>
                    </div>
                    <button type="button" class="add-ingredient" id="addIngredientBtn">+ Add Ingredient</button>
                </div>

                <!-- Instructions Section -->
                <div class="instructions-section">
                    <h2>Instructions</h2>
                    <p class="section-help">Write clear, step-by-step instructions. Each step should be easy to follow.</p>

                    <div class="instructions-builder" id="instructionsBuilder">
                        <div class="instruction-item">
                            <div class="instruction-number">1</div>
                            <textarea class="instruction-input" placeholder="e.g., Preheat oven to 350°F (175°C). Grease a 9-inch baking pan." required></textarea>
                            <button type="button" class="remove-instruction" onclick="removeInstruction(this)">×</button>
                        </div>
                        <div class="instruction-item">
                            <div class="instruction-number">2</div>
                            <textarea class="instruction-input" placeholder="e.g., In a large bowl, mix flour and sugar until well combined." required></textarea>
                            <button type="button" class="remove-instruction" onclick="removeInstruction(this)">×</button>
                        </div>
                    </div>
                    <button type="button" class="add-instruction" id="addInstructionBtn">+ Add Step</button>
                </div>

                <!-- Recipe Story Section -->
                <div class="recipe-story-section">
                    <h2>Recipe Story</h2>
                    <p class="section-help">Share the story behind this recipe - where it came from, what makes it special, family memories, or cooking tips.</p>

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
                    <button type="button" class="btn-secondary" onclick="clearRecipeForm()">Clear Form</button>
                    <button type="submit" class="btn-primary" id="submitRecipeBtn">
                        <span class="btn-text">Create Recipe</span>
                        <span class="btn-loading" hidden>Creating...</span>
                    </button>
                </div>
            </form>

            <!-- Creation Progress -->
            <div class="creation-progress" id="creationProgress" hidden>
                <div class="progress-header">
                    <h3>Creating Your Recipe</h3>
                    <span class="progress-text" id="progressText">Processing...</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill"></div>
                </div>
                <div class="progress-details" id="progressDetails">Saving your culinary masterpiece...</div>
            </div>

            <!-- Success Message -->
            <div class="creation-success" id="creationSuccess" hidden>
                <div class="success-icon">🎉</div>
                <h3>Recipe Created Successfully!</h3>
                <p>Your recipe has been added to the family vault. It's ready to be shared with the entire family!</p>
                <div class="success-actions">
                    <button class="btn-primary" onclick="viewRecipe()">View Recipe</button>
                    <button class="btn-secondary" onclick="createAnother()">Create Another</button>
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
    </script>

    <script src="js/header.js"></script>
    <script src="js/recipe-create.js"></script>
</body>
</html>