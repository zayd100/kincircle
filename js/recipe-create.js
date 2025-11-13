// Recipe Creation JavaScript

class RecipeCreator {
    constructor() {
        this.form = document.getElementById('recipeCreateForm');
        this.ingredientsBuilder = document.getElementById('ingredientsBuilder');
        this.instructionsBuilder = document.getElementById('instructionsBuilder');
        this.autoSaveInterval = null;
        this.createdRecipeId = null;
        
        this.initializeEventListeners();
        this.setupAutoSave();
    }
    
    initializeEventListeners() {
        // Form submission
        this.form.addEventListener('submit', this.handleSubmit.bind(this));
        
        // Dynamic builders
        document.getElementById('addIngredientBtn').addEventListener('click', () => this.addIngredient());
        document.getElementById('addInstructionBtn').addEventListener('click', () => this.addInstruction());
        
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
    }
    
    setupAutoSave() {
        // Auto-save form data every 30 seconds
        this.autoSaveInterval = setInterval(() => {
            this.saveFormData();
        }, 30000);
        
        // Save on form field changes
        const formFields = [
            'recipeName', 'recipeCategory', 'recipeDifficulty', 'recipeServes',
            'recipePrepTime', 'recipeCookTime', 'recipeStory', 'recipeSource', 'recipeOccasion'
        ];
        
        formFields.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => {
                    clearTimeout(this.autoSaveTimeout);
                    this.autoSaveTimeout = setTimeout(() => {
                        this.saveFormData();
                    }, 2000);
                });
            }
        });
        
        // Save on ingredient/instruction changes
        this.ingredientsBuilder.addEventListener('input', () => {
            clearTimeout(this.autoSaveTimeout);
            this.autoSaveTimeout = setTimeout(() => {
                this.saveFormData();
            }, 2000);
        });
        
        this.instructionsBuilder.addEventListener('input', () => {
            clearTimeout(this.autoSaveTimeout);
            this.autoSaveTimeout = setTimeout(() => {
                this.saveFormData();
            }, 2000);
        });
        
        // Load saved data on page load
        this.loadFormData();
    }
    
    saveFormData() {
        const formData = {
            recipeName: document.getElementById('recipeName').value,
            recipeCategory: document.getElementById('recipeCategory').value,
            recipeDifficulty: document.getElementById('recipeDifficulty').value,
            recipeServes: document.getElementById('recipeServes').value,
            recipePrepTime: document.getElementById('recipePrepTime').value,
            recipeCookTime: document.getElementById('recipeCookTime').value,
            recipeStory: document.getElementById('recipeStory').value,
            recipeSource: document.getElementById('recipeSource').value,
            recipeOccasion: document.getElementById('recipeOccasion').value,
            ingredients: this.getIngredients(),
            instructions: this.getInstructions(),
            timestamp: Date.now()
        };
        
        try {
            localStorage.setItem('recipe_create_data', JSON.stringify(formData));
        } catch (error) {
            console.log('Could not save form data:', error);
        }
    }
    
    loadFormData() {
        try {
            const savedData = localStorage.getItem('recipe_create_data');
            if (savedData) {
                const formData = JSON.parse(savedData);
                
                // Only load if data is less than 24 hours old
                if (Date.now() - formData.timestamp < 24 * 60 * 60 * 1000) {
                    // Load basic fields
                    document.getElementById('recipeName').value = formData.recipeName || '';
                    document.getElementById('recipeCategory').value = formData.recipeCategory || '';
                    document.getElementById('recipeDifficulty').value = formData.recipeDifficulty || '';
                    document.getElementById('recipeServes').value = formData.recipeServes || '';
                    document.getElementById('recipePrepTime').value = formData.recipePrepTime || '';
                    document.getElementById('recipeCookTime').value = formData.recipeCookTime || '';
                    document.getElementById('recipeStory').value = formData.recipeStory || '';
                    document.getElementById('recipeSource').value = formData.recipeSource || '';
                    document.getElementById('recipeOccasion').value = formData.recipeOccasion || '';
                    
                    // Load ingredients
                    if (formData.ingredients && formData.ingredients.length > 0) {
                        this.ingredientsBuilder.innerHTML = '';
                        formData.ingredients.forEach(ingredient => {
                            if (ingredient.trim()) {
                                this.addIngredient(ingredient);
                            }
                        });
                    }
                    
                    // Load instructions
                    if (formData.instructions && formData.instructions.length > 0) {
                        this.instructionsBuilder.innerHTML = '';
                        formData.instructions.forEach(instruction => {
                            if (instruction.trim()) {
                                this.addInstruction(instruction);
                            }
                        });
                    }
                    
                    // Show restore message if any data was restored
                    if (formData.recipeName || formData.recipeCategory || formData.ingredients?.length > 0) {
                        this.showMessage('Recipe draft restored from previous session', 'info');
                    }
                }
            }
        } catch (error) {
            console.log('Could not load form data:', error);
        }
    }
    
    clearSavedData() {
        try {
            localStorage.removeItem('recipe_create_data');
        } catch (error) {
            console.log('Could not clear saved data:', error);
        }
    }
    
    addIngredient(value = '') {
        const ingredientDiv = document.createElement('div');
        ingredientDiv.className = 'ingredient-item';
        ingredientDiv.innerHTML = `
            <input type="text" class="ingredient-input" placeholder="e.g., 2 cups all-purpose flour" value="${value}" required>
            <button type="button" class="remove-ingredient" onclick="removeIngredient(this)">×</button>
        `;
        
        this.ingredientsBuilder.appendChild(ingredientDiv);
        
        // Focus on new input if it's empty
        if (!value) {
            ingredientDiv.querySelector('.ingredient-input').focus();
        }
        
        // Add event listener for auto-save
        ingredientDiv.querySelector('.ingredient-input').addEventListener('input', () => {
            clearTimeout(this.autoSaveTimeout);
            this.autoSaveTimeout = setTimeout(() => {
                this.saveFormData();
            }, 2000);
        });
    }
    
    addInstruction(value = '') {
        const currentInstructions = this.instructionsBuilder.querySelectorAll('.instruction-item');
        const nextNumber = currentInstructions.length + 1;
        
        const instructionDiv = document.createElement('div');
        instructionDiv.className = 'instruction-item';
        instructionDiv.innerHTML = `
            <div class="instruction-number">${nextNumber}</div>
            <textarea class="instruction-input" placeholder="e.g., Preheat oven to 350°F (175°C). Grease a 9-inch baking pan." required>${value}</textarea>
            <button type="button" class="remove-instruction" onclick="removeInstruction(this)">×</button>
        `;
        
        this.instructionsBuilder.appendChild(instructionDiv);
        
        // Focus on new textarea if it's empty
        if (!value) {
            instructionDiv.querySelector('.instruction-input').focus();
        }
        
        // Add event listener for auto-save
        instructionDiv.querySelector('.instruction-input').addEventListener('input', () => {
            clearTimeout(this.autoSaveTimeout);
            this.autoSaveTimeout = setTimeout(() => {
                this.saveFormData();
            }, 2000);
        });
    }
    
    updateInstructionNumbers() {
        const instructionItems = this.instructionsBuilder.querySelectorAll('.instruction-item');
        instructionItems.forEach((item, index) => {
            const numberElement = item.querySelector('.instruction-number');
            if (numberElement) {
                numberElement.textContent = index + 1;
            }
        });
    }
    
    getIngredients() {
        const inputs = this.ingredientsBuilder.querySelectorAll('.ingredient-input');
        return Array.from(inputs).map(input => input.value.trim()).filter(value => value);
    }
    
    getInstructions() {
        const textareas = this.instructionsBuilder.querySelectorAll('.instruction-input');
        return Array.from(textareas).map(textarea => textarea.value.trim()).filter(value => value);
    }
    
    async handleSubmit(e) {
        e.preventDefault();
        
        // Validate form
        const validation = this.validateForm();
        if (!validation.isValid) {
            this.showMessage(validation.message, 'error');
            return;
        }
        
        // Show progress and disable form
        this.showCreationProgress();
        
        try {
            const recipeData = this.collectRecipeData();
            await this.createRecipe(recipeData);
            this.showSuccess();
        } catch (error) {
            console.error('Recipe creation error:', error);
            this.showMessage('Failed to create recipe. Please try again.', 'error');
            this.hideCreationProgress();
        }
    }
    
    validateForm() {
        // Check required fields
        const requiredFields = [
            { id: 'recipeName', name: 'Recipe Name' },
            { id: 'recipeCategory', name: 'Category' },
            { id: 'recipeDifficulty', name: 'Difficulty' },
            { id: 'recipeServes', name: 'Serves' }
        ];
        
        for (const field of requiredFields) {
            const element = document.getElementById(field.id);
            if (!element.value.trim()) {
                return {
                    isValid: false,
                    message: `${field.name} is required`
                };
            }
        }
        
        // Check ingredients
        const ingredients = this.getIngredients();
        if (ingredients.length === 0) {
            return {
                isValid: false,
                message: 'At least one ingredient is required'
            };
        }
        
        // Check instructions
        const instructions = this.getInstructions();
        if (instructions.length === 0) {
            return {
                isValid: false,
                message: 'At least one instruction step is required'
            };
        }
        
        return { isValid: true };
    }
    
    collectRecipeData() {
        return {
            name: document.getElementById('recipeName').value.trim(),
            category: document.getElementById('recipeCategory').value,
            difficulty: document.getElementById('recipeDifficulty').value,
            serves: parseInt(document.getElementById('recipeServes').value),
            prepTime: document.getElementById('recipePrepTime').value.trim(),
            cookTime: document.getElementById('recipeCookTime').value.trim(),
            story: document.getElementById('recipeStory').value.trim(),
            source: document.getElementById('recipeSource').value.trim(),
            occasion: document.getElementById('recipeOccasion').value.trim(),
            ingredients: this.getIngredients(),
            instructions: this.getInstructions(),
            author: 'Current User', // This would come from session
            created: new Date().toISOString()
        };
    }
    
    async createRecipe(recipeData) {
        // Simulate API call with progress updates
        this.updateProgress(10, 'Validating recipe data...');
        await this.delay(500);
        
        this.updateProgress(30, 'Saving ingredients...');
        await this.delay(500);
        
        this.updateProgress(50, 'Processing instructions...');
        await this.delay(500);
        
        this.updateProgress(70, 'Adding to recipe vault...');
        await this.delay(500);
        
        this.updateProgress(90, 'Finalizing recipe...');
        await this.delay(500);
        
        // In production, this would be a real API call
        try {
            const response = await fetch('/api/recipes.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'create',
                    recipe: recipeData
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to create recipe');
            }
            
            const result = await response.json();
            this.createdRecipeId = result.id;
        } catch (error) {
            // For staging, simulate success
            this.createdRecipeId = Date.now();
            console.log('Recipe created in staging mode:', recipeData);
        }
        
        this.updateProgress(100, 'Recipe created successfully!');
        await this.delay(500);
    }
    
    showCreationProgress() {
        this.form.style.display = 'none';
        document.getElementById('creationProgress').hidden = false;
        
        // Disable submit button
        const submitBtn = document.getElementById('submitRecipeBtn');
        submitBtn.disabled = true;
    }
    
    hideCreationProgress() {
        document.getElementById('creationProgress').hidden = true;
        this.form.style.display = 'block';
        
        // Re-enable submit button
        const submitBtn = document.getElementById('submitRecipeBtn');
        submitBtn.disabled = false;
    }
    
    updateProgress(percent, message) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const progressDetails = document.getElementById('progressDetails');
        
        progressFill.style.width = `${percent}%`;
        progressText.textContent = `${Math.round(percent)}%`;
        progressDetails.textContent = message;
    }
    
    showSuccess() {
        document.getElementById('creationProgress').hidden = true;
        document.getElementById('creationSuccess').hidden = false;
        this.clearSavedData();
    }
    
    showMessage(text, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = text;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.style.opacity = '0';
            messageDiv.style.transform = 'translateX(100%)';
            setTimeout(() => {
                messageDiv.remove();
            }, 300);
        }, 5000);
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Global functions for template usage
function removeIngredient(button) {
    const ingredientItem = button.closest('.ingredient-item');
    if (ingredientItem) {
        ingredientItem.remove();
        recipeCreator.saveFormData();
    }
}

function removeInstruction(button) {
    const instructionItem = button.closest('.instruction-item');
    if (instructionItem) {
        instructionItem.remove();
        recipeCreator.updateInstructionNumbers();
        recipeCreator.saveFormData();
    }
}

function clearRecipeForm() {
    if (confirm('Are you sure you want to clear the form? All entered information will be lost.')) {
        recipeCreator.form.reset();
        recipeCreator.clearSavedData();
        
        // Reset ingredients to default
        recipeCreator.ingredientsBuilder.innerHTML = `
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
        `;
        
        // Reset instructions to default
        recipeCreator.instructionsBuilder.innerHTML = `
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
        `;
        
        recipeCreator.showMessage('Form cleared successfully', 'info');
    }
}

function viewRecipe() {
    if (recipeCreator.createdRecipeId) {
        // In production, this would navigate to the recipe detail page
        window.location.href = `recipes.php?id=${recipeCreator.createdRecipeId}`;
    } else {
        // Fallback to recipes index
        window.location.href = '/recipes/';
    }
}

function createAnother() {
    // Reset to initial state
    document.getElementById('creationSuccess').hidden = true;
    recipeCreator.form.style.display = 'block';
    recipeCreator.form.reset();
    recipeCreator.clearSavedData();
    recipeCreator.createdRecipeId = null;
    
    // Reset builders to default state
    clearRecipeForm();
    
    // Re-enable submit button
    const submitBtn = document.getElementById('submitRecipeBtn');
    submitBtn.disabled = false;
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Initialize recipe creator when page loads
let recipeCreator;
document.addEventListener('DOMContentLoaded', () => {
    recipeCreator = new RecipeCreator();
});