// Family Recipe Vault - Impossible Implementation
// Where culinary traditions meet cutting-edge interface design

class RecipeVault {
    constructor() {
        this.recipes = [];
        this.filteredRecipes = [];
        this.currentUser = this.getCurrentUser();
        this.activeRecipe = null;
        this.searchTimeout = null;
        this.animationQueue = [];
        this.isKitchenMode = false;
        this.recipeScale = 1;
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        await this.loadRecipes();
        this.showVault();
        this.updateStats();
        
        // Staggered recipe card reveals
        setTimeout(() => {
            this.animateRecipeCards();
        }, 1000);
    }
    
    getCurrentUser() {
        // Get user from session/localStorage or API
        const sessionUser = sessionStorage.getItem('currentUser');
        if (sessionUser) {
            return JSON.parse(sessionUser);
        }
        
        // Default fallback for unauthenticated users
        return {
            id: null,
            name: 'Guest',
            isAdmin: false
        };
    }
    
    setupEventListeners() {
        // Main action buttons
        document.getElementById('addRecipeBtn').addEventListener('click', () => this.openCreateModal());
        // Kitchen mode button removed - now recipe-specific
        
        // Search and filters
        document.getElementById('recipeSearch').addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.performSearch(e.target.value);
            }, 300);
        });
        
        document.getElementById('searchBtn').addEventListener('click', () => {
            this.performSearch(document.getElementById('recipeSearch').value);
        });
        
        // Filter selectors
        document.getElementById('categoryFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('familyFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('difficultyFilter').addEventListener('change', () => this.applyFilters());
        
        // Modal controls
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('closeCreateModal').addEventListener('click', () => this.closeCreateModal());
        document.getElementById('closeTimelineModal').addEventListener('click', () => this.closeTimelineModal());
        
        // Create recipe form
        document.getElementById('createRecipeForm').addEventListener('submit', (e) => this.handleCreateRecipe(e));
        document.getElementById('cancelCreate').addEventListener('click', () => this.closeCreateModal());
        
        // Dynamic form builders
        document.getElementById('addIngredient').addEventListener('click', () => this.addIngredientRow());
        document.getElementById('addInstruction').addEventListener('click', () => this.addInstructionRow());
        
        // Kitchen mode controls
        // Kitchen mode controls removed - now only opens in new tab
        // printRecipe button removed with kitchen modal
        
        // Check if elements exist before adding event listeners
        const printBtn = document.getElementById('printRecipe');
        if (printBtn) {
            printBtn.addEventListener('click', () => this.printRecipe());
        }
        
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
            if (e.key === 'n' && e.ctrlKey) {
                e.preventDefault();
                this.openCreateModal();
            }
            if (e.key === 'k' && e.ctrlKey) {
                e.preventDefault();
                this.toggleKitchenMode();
            }
        });
        
        // Close modals on backdrop click
        document.querySelectorAll('.modal-backdrop, .kitchen-backdrop').forEach(backdrop => {
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) {
                    this.closeAllModals();
                }
            });
        });
    }
    
    async loadRecipes() {
        // Try to use PHP data first
        if (window.recipeVaultData && window.recipeVaultData.recipes) {
            this.recipes = window.recipeVaultData.recipes;
            this.filteredRecipes = [...this.recipes];
            return;
        }
        
        // Fallback to API call
        try {
            const response = await fetch('/api/recipes.php?action=list');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && Array.isArray(data.recipes)) {
                // Validate and sanitize recipe data
                this.recipes = data.recipes.filter(recipe => {
                    return recipe && 
                           recipe.id && 
                           recipe.name && 
                           Array.isArray(recipe.ingredients) && 
                           Array.isArray(recipe.instructions);
                }).map(recipe => ({
                    ...recipe,
                    // Ensure required fields have defaults
                    category: recipe.category || 'main',
                    difficulty: recipe.difficulty || 'medium',
                    serves: parseInt(recipe.serves) || 1,
                    author: recipe.author || 'Unknown',
                    created: recipe.created || new Date().toISOString().split('T')[0],
                    description: recipe.description || '',
                    story: recipe.story || '',
                    prepTime: recipe.prepTime || '30 min',
                    cookTime: recipe.cookTime || '1 hour',
                    modifications: Array.isArray(recipe.modifications) ? recipe.modifications : []
                }));
            } else {
                console.warn('Invalid recipe data received from API:', data);
                this.recipes = [];
            }
        } catch (error) {
            console.error('Failed to load recipes from database:', error);
            
            // Check if it's a network error vs server error
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                this.showNotification('Unable to connect to the recipe database. Please check your internet connection.', 'error');
            } else if (error.message.includes('HTTP error')) {
                this.showNotification('Recipe service is temporarily unavailable. Please try again later.', 'error');
            } else {
                this.showNotification('Unable to load recipes. Please refresh the page or contact support.', 'error');
            }
            
            this.recipes = [];
        }
        
        this.filteredRecipes = [...this.recipes];
        this.renderRecipeGrid();
    }
    
    async refreshRecipes() {
        this.showNotification('Refreshing recipes...', 'info');
        await this.loadRecipes();
        this.updateStats();
        this.showNotification('Recipes refreshed successfully!', 'success');
    }
    
    
    showVault() {
        const loading = document.getElementById('recipeLoading');
        const vault = document.getElementById('recipeVault');
        
        loading.style.opacity = '0';
        loading.style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
            loading.style.display = 'none';
            vault.classList.remove('hidden');
            vault.style.opacity = '1';
            vault.style.transform = 'translateY(0)';
        }, 500);
    }
    
    renderRecipeGrid() {
        const grid = document.getElementById('recipeGrid');
        
        if (this.filteredRecipes.length === 0) {
            const hasSearchOrFilters = document.getElementById('recipeSearch').value.trim() || 
                                     document.getElementById('categoryFilter').value !== 'all' ||
                                     document.getElementById('familyFilter').value !== 'all' ||
                                     document.getElementById('difficultyFilter').value !== 'all';
            
            const emptyMessage = hasSearchOrFilters 
                ? "No recipes match your search criteria" 
                : this.recipes.length === 0 
                    ? "Welcome to your Family Recipe Vault!" 
                    : "No recipes found";
                    
            const emptyDescription = hasSearchOrFilters
                ? "Try adjusting your search terms or filters to find what you're looking for."
                : this.recipes.length === 0
                    ? "Start building your family's recipe collection by adding your first recipe."
                    : "Try adjusting your search or filters, or create a new recipe!";
            
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🍽️</div>
                    <h3>${emptyMessage}</h3>
                    <p>${emptyDescription}</p>
                    ${this.currentUser.id ? `
                        <button class="vault-action-btn" onclick="recipeVault.openCreateModal()">
                            <span class="btn-icon">✨</span>
                            <span class="btn-text">Create Recipe</span>
                        </button>
                    ` : `
                        <p style="margin-top: 1rem; font-size: 0.9rem; opacity: 0.7;">
                            Please log in to create and manage recipes.
                        </p>
                    `}
                </div>
            `;
            return;
        }
        
        grid.innerHTML = this.filteredRecipes.map(recipe => `
            <div class="recipe-card" onclick="recipeVault.openRecipeModal(${recipe.id})" data-recipe-id="${recipe.id}">
                <div class="recipe-card-header">
                    <h3 class="recipe-card-title">${recipe.name}</h3>
                    <div class="recipe-card-meta">
                        <span class="recipe-card-category">${this.formatCategory(recipe.category)}</span>
                        <span class="recipe-difficulty">${this.getDifficultyEmoji(recipe.difficulty)} ${recipe.difficulty}</span>
                    </div>
                </div>
                <div class="recipe-card-body">
                    <p class="recipe-card-description">${recipe.description}</p>
                    <div class="recipe-card-stats">
                        <div class="recipe-card-stat">
                            <span>👥</span>
                            <span>Serves ${recipe.serves}</span>
                        </div>
                        <div class="recipe-card-stat">
                            <span>⏱️</span>
                            <span>${recipe.prepTime}</span>
                        </div>
                        <div class="recipe-card-stat">
                            <span>🔥</span>
                            <span>${recipe.cookTime}</span>
                        </div>
                    </div>
                </div>
                <div class="recipe-card-footer">
                    <div class="recipe-card-author">By ${recipe.author}</div>
                    <div class="recipe-card-actions">
                        <button class="recipe-action-btn" onclick="recipeVault.openTimelineModal(${recipe.id}); event.stopPropagation();" title="View History">
                            📊
                        </button>
                        <button class="recipe-action-btn" onclick="recipeVault.openKitchenModeNewTab(${recipe.id}); event.stopPropagation();" title="Kitchen Mode">
                            🍳
                        </button>
                        <button class="recipe-action-btn" onclick="recipeVault.shareRecipe(${recipe.id}); event.stopPropagation();" title="Share">
                            🔗
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    animateRecipeCards() {
        const cards = document.querySelectorAll('.recipe-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }
    
    formatCategory(category) {
        const categories = {
            appetizers: '🥗 Appetizers',
            main: '🍖 Main Dishes',
            desserts: '🍰 Desserts',
            drinks: '🍹 Drinks',
            sides: '🥬 Side Dishes'
        };
        return categories[category] || category;
    }
    
    getDifficultyEmoji(difficulty) {
        const emojis = {
            easy: '🟢',
            medium: '🟡',
            hard: '🔴'
        };
        return emojis[difficulty] || '⚪';
    }
    
    performSearch(query) {
        if (!query.trim()) {
            this.filteredRecipes = [...this.recipes];
        } else {
            const searchTerms = query.toLowerCase().split(' ');
            this.filteredRecipes = this.recipes.filter(recipe => {
                const searchableText = [
                    recipe.name,
                    recipe.description,
                    recipe.author,
                    recipe.category,
                    recipe.story,
                    ...recipe.ingredients,
                    ...recipe.instructions
                ].join(' ').toLowerCase();
                
                return searchTerms.every(term => searchableText.includes(term));
            });
        }
        
        this.applyFilters();
    }
    
    applyFilters() {
        const categoryFilter = document.getElementById('categoryFilter').value;
        const familyFilter = document.getElementById('familyFilter').value;
        const difficultyFilter = document.getElementById('difficultyFilter').value;
        
        // Start with all recipes if no search has been performed
        const searchQuery = document.getElementById('recipeSearch').value.trim();
        if (!searchQuery) {
            this.filteredRecipes = [...this.recipes];
        }
        
        let filtered = [...this.filteredRecipes];
        
        // Apply category filter
        if (categoryFilter && categoryFilter !== 'all') {
            filtered = filtered.filter(recipe => recipe.category === categoryFilter);
        }
        
        // Apply family filter
        if (familyFilter && familyFilter !== 'all') {
            filtered = filtered.filter(recipe => 
                recipe.author.toLowerCase().includes(familyFilter.toLowerCase())
            );
        }
        
        // Apply difficulty filter
        if (difficultyFilter && difficultyFilter !== 'all') {
            filtered = filtered.filter(recipe => recipe.difficulty === difficultyFilter);
        }
        
        this.filteredRecipes = filtered;
        this.renderRecipeGrid();
        this.animateRecipeCards();
    }
    
    openRecipeModal(recipeId) {
        const recipe = this.recipes.find(r => r.id == recipeId);
        if (!recipe) {
            this.showNotification('Recipe not found.', 'error');
            return;
        }
        
        this.activeRecipe = recipe;
        
        const modal = document.getElementById('recipeModal');
        const modalBody = document.getElementById('modalBody');
        const modalTitle = document.getElementById('modalTitle');
        
        modalTitle.textContent = recipe.name;
        
        modalBody.innerHTML = `
            <div class="recipe-detail">
                <div class="recipe-detail-header">
                    <div class="recipe-meta-grid">
                        <div class="recipe-meta-item">
                            <span class="meta-label">Category:</span>
                            <span class="meta-value">${this.formatCategory(recipe.category)}</span>
                        </div>
                        <div class="recipe-meta-item">
                            <span class="meta-label">Difficulty:</span>
                            <span class="meta-value">${this.getDifficultyEmoji(recipe.difficulty)} ${recipe.difficulty}</span>
                        </div>
                        <div class="recipe-meta-item">
                            <span class="meta-label">Serves:</span>
                            <span class="meta-value">👥 ${recipe.serves} people</span>
                        </div>
                        <div class="recipe-meta-item">
                            <span class="meta-label">Prep Time:</span>
                            <span class="meta-value">⏱️ ${recipe.prepTime}</span>
                        </div>
                        <div class="recipe-meta-item">
                            <span class="meta-label">Cook Time:</span>
                            <span class="meta-value">🔥 ${recipe.cookTime}</span>
                        </div>
                        <div class="recipe-meta-item">
                            <span class="meta-label">Author:</span>
                            <span class="meta-value">👤 ${recipe.author}</span>
                        </div>
                    </div>
                </div>
                
                <div class="recipe-story">
                    <h4>Family Story</h4>
                    <p>${recipe.story}</p>
                </div>
                
                <div class="recipe-ingredients">
                    <h4>Ingredients</h4>
                    <ul>
                        ${recipe.ingredients.map(ingredient => `
                            <li>${ingredient}</li>
                        `).join('')}
                    </ul>
                </div>
                
                <div class="recipe-instructions">
                    <h4>Instructions</h4>
                    <ol>
                        ${recipe.instructions.map(instruction => `
                            <li>${instruction}</li>
                        `).join('')}
                    </ol>
                </div>
                
                ${recipe.modifications && recipe.modifications.length > 0 ? `
                    <div class="recipe-modifications">
                        <h4>Family Modifications</h4>
                        <div class="modifications-list">
                            ${recipe.modifications.map(mod => `
                                <div class="modification-item">
                                    <div class="modification-header">
                                        <span class="modification-author">${mod.author}</span>
                                        <span class="modification-date">${mod.date}</span>
                                    </div>
                                    <div class="modification-note">${mod.note}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="recipe-actions">
                    <button class="form-btn primary" onclick="recipeVault.openKitchenModeNewTab(${recipe.id})" title="Opens in new tab - perfect for cooking!">
                        🍳 Kitchen Mode
                    </button>
                    <button class="form-btn secondary" onclick="recipeVault.openTimelineModal(${recipe.id})">
                        📊 View Timeline
                    </button>
                    <button class="form-btn secondary" onclick="recipeVault.editRecipe(${recipe.id})">
                        ✏️ Edit Recipe
                    </button>
                </div>
            </div>
        `;
        
        // Use unified modal system to open
        if (window.unifiedModal) {
            window.unifiedModal.open('recipeModal');
        } else if (window.queuedModal) {
            window.queuedModal.open('recipeModal');
        } else {
            modal.classList.remove('hidden');
        }
        
        // Add custom styles for recipe detail
        if (!document.getElementById('recipeDetailStyles')) {
            const style = document.createElement('style');
            style.id = 'recipeDetailStyles';
            style.textContent = `
                .recipe-detail {
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                }
                
                .recipe-meta-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1rem;
                    margin-bottom: 2rem;
                }
                
                .recipe-meta-item {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                
                .meta-label {
                    font-size: 0.875rem;
                    color: rgba(251, 191, 36, 0.8);
                    font-weight: 600;
                }
                
                .meta-value {
                    font-size: 1rem;
                    color: white;
                    font-weight: 500;
                }
                
                .recipe-story {
                    background: rgba(255, 255, 255, 0.05);
                    padding: 1.5rem;
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                .recipe-story h4 {
                    color: #fbbf24;
                    font-size: 1.25rem;
                    margin-bottom: 1rem;
                }
                
                .recipe-story p {
                    color: rgba(255, 255, 255, 0.9);
                    line-height: 1.6;
                    font-style: italic;
                }
                
                .recipe-ingredients h4,
                .recipe-instructions h4,
                .recipe-modifications h4 {
                    color: #fbbf24;
                    font-size: 1.25rem;
                    margin-bottom: 1rem;
                }
                
                .recipe-ingredients ul,
                .recipe-instructions ol {
                    padding-left: 1.5rem;
                }
                
                .recipe-ingredients li,
                .recipe-instructions li {
                    color: rgba(255, 255, 255, 0.9);
                    line-height: 1.6;
                    margin-bottom: 0.5rem;
                }
                
                .recipe-instructions li {
                    margin-bottom: 1rem;
                }
                
                .modifications-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                
                .modification-item {
                    background: rgba(255, 255, 255, 0.05);
                    padding: 1rem;
                    border-radius: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                .modification-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.5rem;
                }
                
                .modification-author {
                    font-weight: 600;
                    color: #fbbf24;
                }
                
                .modification-date {
                    font-size: 0.875rem;
                    color: rgba(255, 255, 255, 0.6);
                }
                
                .modification-note {
                    color: rgba(255, 255, 255, 0.9);
                    line-height: 1.5;
                }
                
                .recipe-actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                    flex-wrap: wrap;
                    margin-top: 2rem;
                    padding-top: 2rem;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                @media (max-width: 768px) {
                    .recipe-meta-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .recipe-actions {
                        flex-direction: column;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    openCreateModal() {
        // Open the dedicated create recipe page in a new tab
        window.open('recipe-create.php', '_blank');
    }
    
    resetFormBuilders() {
        // Reset ingredients
        const ingredientsBuilder = document.getElementById('ingredientsBuilder');
        ingredientsBuilder.innerHTML = `
            <div class="ingredient-item">
                <input type="text" class="ingredient-input" placeholder="Enter ingredient..." required>
                <button type="button" class="remove-ingredient" onclick="this.parentElement.remove()">×</button>
            </div>
        `;
        
        // Reset instructions
        const instructionsBuilder = document.getElementById('instructionsBuilder');
        instructionsBuilder.innerHTML = `
            <div class="instruction-item">
                <div class="instruction-number">1</div>
                <textarea class="instruction-input" placeholder="Enter instruction step..." required></textarea>
                <button type="button" class="remove-instruction" onclick="this.parentElement.remove(); recipeVault.updateInstructionNumbers()">×</button>
            </div>
        `;
    }
    
    addIngredientRow() {
        const ingredientsBuilder = document.getElementById('ingredientsBuilder');
        const newRow = document.createElement('div');
        newRow.className = 'ingredient-item';
        newRow.innerHTML = `
            <input type="text" class="ingredient-input" placeholder="Enter ingredient..." required>
            <button type="button" class="remove-ingredient" onclick="this.parentElement.remove()">×</button>
        `;
        ingredientsBuilder.appendChild(newRow);
        
        // Focus on new input
        newRow.querySelector('.ingredient-input').focus();
    }
    
    addInstructionRow() {
        const instructionsBuilder = document.getElementById('instructionsBuilder');
        const currentRows = instructionsBuilder.querySelectorAll('.instruction-item');
        const newNumber = currentRows.length + 1;
        
        const newRow = document.createElement('div');
        newRow.className = 'instruction-item';
        newRow.innerHTML = `
            <div class="instruction-number">${newNumber}</div>
            <textarea class="instruction-input" placeholder="Enter instruction step..." required></textarea>
            <button type="button" class="remove-instruction" onclick="this.parentElement.remove(); recipeVault.updateInstructionNumbers()">×</button>
        `;
        instructionsBuilder.appendChild(newRow);
        
        // Focus on new textarea
        newRow.querySelector('.instruction-input').focus();
    }
    
    updateInstructionNumbers() {
        const instructionItems = document.querySelectorAll('.instruction-item');
        instructionItems.forEach((item, index) => {
            const numberElement = item.querySelector('.instruction-number');
            numberElement.textContent = index + 1;
        });
    }
    
    async handleCreateRecipe(event) {
        event.preventDefault();
        
        // Check if user is logged in
        if (!this.currentUser.id) {
            this.showNotification('Please log in to create recipes.', 'error');
            return;
        }
        
        const formData = new FormData(event.target);
        const ingredients = Array.from(document.querySelectorAll('.ingredient-input'))
            .map(input => input.value.trim())
            .filter(value => value);
        
        const instructions = Array.from(document.querySelectorAll('.instruction-input'))
            .map(input => input.value.trim())
            .filter(value => value);
        
        // Validate required fields
        const recipeName = formData.get('recipeName');
        if (!recipeName || !ingredients.length || !instructions.length) {
            this.showNotification('Please fill in all required fields.', 'error');
            return;
        }
        
        const recipeData = {
            name: recipeName,
            category: formData.get('recipeCategory'),
            difficulty: formData.get('recipeDifficulty'),
            serves: parseInt(formData.get('recipeServes')) || 1,
            prepTime: formData.get('prepTime') || "30 min",
            cookTime: formData.get('cookTime') || "1 hour",
            story: formData.get('recipeStory') || '',
            description: formData.get('recipeDescription') || `A delicious ${formData.get('recipeCategory')} recipe`,
            ingredients: ingredients,
            instructions: instructions,
            author: this.currentUser.name,
            authorId: this.currentUser.id,
            created: new Date().toISOString().split('T')[0],
            modifications: []
        };
        
        try {
            const response = await fetch('/api/recipes.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'add',
                    ...recipeData
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.recipe_id) {
                // Add to local recipes array with server-assigned ID
                const newRecipe = {
                    id: result.recipe_id,
                    ...recipeData
                };
                
                this.recipes.unshift(newRecipe);
                this.filteredRecipes = [...this.recipes];
                this.renderRecipeGrid();
                this.animateRecipeCards();
                this.updateStats();
                this.closeCreateModal();
                
                this.showNotification('Recipe created successfully!', 'success');
            } else {
                const errorMessage = result.message || 'Unknown error occurred';
                this.showNotification('Error creating recipe: ' + errorMessage, 'error');
            }
        } catch (error) {
            console.error('Error creating recipe:', error);
            this.showNotification('Failed to create recipe. Please check your connection and try again.', 'error');
        }
    }
    
    // Modal kitchen mode removed - now only opens in new tab
    
    // renderKitchenMode removed - now only opens in new tab
    
    scaleIngredient(ingredient) {
        if (this.recipeScale === 1) return ingredient;
        
        // Simple scaling logic - in a real app, this would be more sophisticated
        const numberPattern = /(\d+(?:\.\d+)?)/g;
        return ingredient.replace(numberPattern, (match) => {
            const number = parseFloat(match);
            return (number * this.recipeScale).toString();
        });
    }
    
    openScaleModal() {
        const currentScale = this.recipeScale;
        const newScale = prompt(`Enter recipe scale (current: ${currentScale}x):`, currentScale);
        
        if (newScale && !isNaN(newScale) && newScale > 0) {
            this.recipeScale = parseFloat(newScale);
            // renderKitchenMode removed - now only opens in new tab
        }
    }
    
    printRecipe() {
        // Basic print functionality for any modal that might need it
        window.print();
    }
    
    // openKitchenModeNewTab - working function is defined later in the file
        /* BROKEN CODE COMMENTED OUT TO PREVENT SYNTAX ERROR
                <div class="kitchen-header-info">
                    <h1>${recipe.name}</h1>
                    <div class="kitchen-meta">
                        <span>Serves: ${Math.round(recipe.serves * this.recipeScale)}</span>
                        <span>•</span>
                        <span>Prep: ${recipe.prepTime}</span>
                        <span>•</span>
                        <span>Cook: ${recipe.cookTime}</span>
                        <span>•</span>
                        <span>Scale: ${this.recipeScale}x</span>
                    </div>
                </div>
                
                <div class="kitchen-ingredients">
                    <h2>Ingredients</h2>
                    <ul>
                        ${recipe.ingredients.map(ingredient => `
                            <li>${this.scaleIngredient(ingredient)}</li>
                        `).join('')}
                    </ul>
                </div>
                
                <div class="kitchen-instructions">
                    <h2>Instructions</h2>
                    <ol>
                        ${recipe.instructions.map((instruction, index) => `
                            <li>
                                <div class="instruction-step">
                                    <span class="step-number">${index + 1}</span>
                                    <span class="step-text">${instruction}</span>
                                </div>
                            </li>
                        `).join('')}
                    </ol>
                </div>
                
                <div class="kitchen-story">
                    <h3>Family Story</h3>
                    <p>${recipe.story}</p>
                </div>
            </div>
        `;
        
        // Add kitchen-specific styles
        if (!document.getElementById('kitchenStyles')) {
            const style = document.createElement('style');
            style.id = 'kitchenStyles';
            style.textContent = `
                .kitchen-recipe {
                    max-width: 800px;
                    margin: 0 auto;
                    font-family: 'Georgia', serif;
                    line-height: 1.6;
                }
                
                .kitchen-header-info h1 {
                    font-size: 2.5rem;
                    color: #d97706;
                    margin-bottom: 1rem;
                    text-align: center;
                }
                
                .kitchen-meta {
                    text-align: center;
                    color: #666;
                    font-size: 1.125rem;
                    margin-bottom: 2rem;
                }
                
                .kitchen-ingredients,
                .kitchen-instructions {
                    margin-bottom: 3rem;
                }
                
                .kitchen-ingredients h2,
                .kitchen-instructions h2 {
                    font-size: 1.75rem;
                    color: #d97706;
                    border-bottom: 2px solid #d97706;
                    padding-bottom: 0.5rem;
                    margin-bottom: 1.5rem;
                }
                
                .kitchen-ingredients ul {
                    list-style: none;
                    padding: 0;
                }
                
                .kitchen-ingredients li {
                    padding: 0.75rem;
                    margin-bottom: 0.5rem;
                    background: #f9fafb;
                    border-left: 4px solid #d97706;
                    font-size: 1.125rem;
                }
                
                .kitchen-instructions ol {
                    list-style: none;
                    padding: 0;
                    counter-reset: step-counter;
                }
                
                .kitchen-instructions li {
                    counter-increment: step-counter;
                    margin-bottom: 1.5rem;
                    padding: 1rem;
                    background: #f9fafb;
                    border-radius: 8px;
                    border-left: 4px solid #d97706;
                }
                
                .instruction-step {
                    display: flex;
                    align-items: flex-start;
                    gap: 1rem;
                }
                
                .step-number {
                    background: #d97706;
                    color: white;
                    width: 2rem;
                    height: 2rem;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    flex-shrink: 0;
                }
                
                .step-text {
                    flex: 1;
                    font-size: 1.125rem;
                    line-height: 1.6;
                }
                
                .kitchen-story {
                    background: #fef3c7;
                    padding: 2rem;
                    border-radius: 12px;
                    border: 2px solid #d97706;
                }
                
                .kitchen-story h3 {
                    color: #d97706;
                    font-size: 1.5rem;
                    margin-bottom: 1rem;
                }
                
                .kitchen-story p {
                    color: #92400e;
                    font-size: 1.125rem;
                    font-style: italic;
                    line-height: 1.6;
                }
                
                @media print {
                    .kitchen-recipe {
                        max-width: none;
                    }
                    
                    .kitchen-header-info h1 {
                        font-size: 2rem;
                    }
                    
                    .kitchen-ingredients li,
                    .step-text {
                        font-size: 1rem;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    scaleIngredient(ingredient) {
        if (this.recipeScale === 1) return ingredient;
        
        // Simple scaling logic - in a real app, this would be more sophisticated
        const numberPattern = /(\d+(?:\.\d+)?)/g;
        return ingredient.replace(numberPattern, (match) => {
            const number = parseFloat(match);
            const scaled = (number * this.recipeScale);
            return scaled % 1 === 0 ? scaled.toString() : scaled.toFixed(1);
        });
    }
    
    openScaleModal() {
        const currentScale = this.recipeScale;
        const newScale = prompt(`Enter recipe scale (current: ${currentScale}x):`, currentScale);
        
        if (newScale && !isNaN(newScale) && newScale > 0) {
            this.recipeScale = parseFloat(newScale);
            // renderKitchenMode removed - now only opens in new tab
        }
    }
        END OF BROKEN CODE COMMENT */
    
    printRecipe() {
        // Basic print functionality for any modal that might need it
        window.print();
    }
    
    openKitchenModeNewTab(recipeId) {
        const recipe = this.recipes.find(r => r.id == recipeId);
        if (!recipe) {
            this.showNotification('Recipe not found.', 'error');
            return;
        }
        
        // Create a standalone kitchen mode page
        const kitchenPageContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🍳 Kitchen Mode - ${recipe.name}</title>
    <style>
        :root {
            --recipe-primary: #d97706;
            --recipe-secondary: #f59e0b;
            --recipe-accent: #fbbf24;
            --text-primary: #1f2937;
            --text-secondary: #6b7280;
            --bg-primary: #ffffff;
            --bg-secondary: #f9fafb;
            --border-color: #e5e7eb;
            --success: #10b981;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
            padding: 2rem;
        }
        
        .kitchen-header {
            background: var(--recipe-primary);
            color: white;
            padding: 2rem;
            border-radius: 16px;
            margin-bottom: 2rem;
            box-shadow: 0 4px 20px rgba(217, 119, 6, 0.3);
        }
        
        .kitchen-title {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }
        
        .kitchen-subtitle {
            font-size: 1.2rem;
            opacity: 0.9;
        }
        
        .kitchen-controls {
            display: flex;
            gap: 1rem;
            margin-bottom: 2rem;
            flex-wrap: wrap;
        }
        
        .kitchen-btn {
            padding: 1rem 2rem;
            background: var(--recipe-secondary);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .kitchen-btn:hover {
            background: var(--recipe-primary);
            transform: translateY(-2px);
        }
        
        .kitchen-content {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: 3rem;
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .ingredients-section {
            background: var(--bg-secondary);
            padding: 2rem;
            border-radius: 16px;
            border: 2px solid var(--border-color);
        }
        
        .instructions-section {
            background: var(--bg-secondary);
            padding: 2rem;
            border-radius: 16px;
            border: 2px solid var(--border-color);
        }
        
        .section-title {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 1.5rem;
            color: var(--recipe-primary);
        }
        
        .ingredient-item {
            padding: 1rem;
            margin-bottom: 0.5rem;
            background: white;
            border-radius: 8px;
            border: 1px solid var(--border-color);
            font-size: 1.1rem;
        }
        
        .instruction-step {
            padding: 1.5rem;
            margin-bottom: 1rem;
            background: white;
            border-radius: 8px;
            border: 1px solid var(--border-color);
            border-left: 4px solid var(--recipe-primary);
        }
        
        .step-number {
            font-weight: 700;
            color: var(--recipe-primary);
            margin-bottom: 0.5rem;
        }
        
        @media (max-width: 768px) {
            .kitchen-content {
                grid-template-columns: 1fr;
                gap: 2rem;
            }
        }
        
        @media print {
            .kitchen-controls {
                display: none;
            }
            body {
                padding: 0;
            }
        }
    </style>
</head>
<body>
    <div class="kitchen-header">
        <h1 class="kitchen-title">🍳 ${recipe.name}</h1>
        <p class="kitchen-subtitle">Kitchen Mode - Ready for cooking!</p>
    </div>
    
    <div class="kitchen-controls">
        <button class="kitchen-btn" onclick="scaleRecipe(0.5)">📏 Half Recipe</button>
        <button class="kitchen-btn" onclick="scaleRecipe(1)">📏 Original</button>
        <button class="kitchen-btn" onclick="scaleRecipe(2)">📏 Double Recipe</button>
        <button class="kitchen-btn" onclick="window.print()">🖨️ Print</button>
    </div>
    
    <div class="kitchen-content">
        <div class="ingredients-section">
            <h2 class="section-title">📋 Ingredients</h2>
            <div id="ingredientsList">
                ${recipe.ingredients.map(ingredient => `
                    <div class="ingredient-item" data-original="${ingredient}">
                        ${ingredient}
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="instructions-section">
            <h2 class="section-title">👨‍🍳 Instructions</h2>
            <div id="instructionsList">
                ${recipe.instructions.map((instruction, index) => `
                    <div class="instruction-step">
                        <div class="step-number">Step ${index + 1}</div>
                        <div class="step-text">${instruction}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>
    
    <script>
        let currentScale = 1;
        const originalIngredients = ${JSON.stringify(recipe.ingredients)};
        
        function scaleRecipe(scale) {
            currentScale = scale;
            const ingredientsList = document.getElementById('ingredientsList');
            
            ingredientsList.innerHTML = originalIngredients.map(ingredient => {
                const scaledIngredient = scaleIngredient(ingredient, scale);
                return \`<div class="ingredient-item">\${scaledIngredient}</div>\`;
            }).join('');
        }
        
        function scaleIngredient(ingredient, scale) {
            // Simple scaling for common measurements
            const scaledIngredient = ingredient.replace(/(\d+(?:\.\d+)?)\s*(cups?|tbsp|tsp|oz|lbs?|pounds?|grams?|kg|ml|liters?)/gi, (match, amount, unit) => {
                const scaledAmount = (parseFloat(amount) * scale).toString();
                return scaledAmount + ' ' + unit;
            });
            return scaledIngredient;
        }
    </script>
</body>
</html>
        `;
        
        // Open in new tab
        const newWindow = window.open('', '_blank');
        newWindow.document.write(kitchenPageContent);
        newWindow.document.close();
    }

    // exitKitchenMode removed - now only opens in new tab
    
    openTimelineModal(recipeId) {
        const recipe = this.recipes.find(r => r.id == recipeId);
        if (!recipe) {
            this.showNotification('Recipe not found.', 'error');
            return;
        }
        
        const modal = document.getElementById('timelineModal');
        const container = document.getElementById('timelineContainer');
        
        // Create timeline data
        const timelineData = [
            {
                date: recipe.created,
                title: 'Original Recipe',
                description: `${recipe.author} created this recipe`,
                type: 'creation'
            },
            ...(recipe.modifications || []).map(mod => ({
                date: mod.date,
                title: 'Recipe Modified',
                description: `${mod.author}: ${mod.note}`,
                type: 'modification'
            }))
        ].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        container.innerHTML = `
            <div class="timeline-line"></div>
            ${timelineData.map((item, index) => `
                <div class="timeline-item">
                    <div class="timeline-content">
                        <div class="timeline-date">${new Date(item.date).toLocaleDateString()}</div>
                        <h4 class="timeline-title">${item.title}</h4>
                        <p class="timeline-description">${item.description}</p>
                    </div>
                    <div class="timeline-dot"></div>
                </div>
            `).join('')}
        `;
        
        // Use unified modal system to open
        if (window.unifiedModal) {
            window.unifiedModal.open('timelineModal');
        } else if (window.queuedModal) {
            window.queuedModal.open('timelineModal');
        } else {
            modal.classList.remove('hidden');
        }
    }
    
    updateStats() {
        const totalRecipes = this.recipes.length;
        const contributors = new Set(this.recipes.map(r => r.author)).size;
        const recentUpdates = this.recipes.filter(r => {
            const recipeDate = new Date(r.created);
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return recipeDate > monthAgo;
        }).length;
        
        document.getElementById('totalRecipes').textContent = totalRecipes;
        document.getElementById('familyContributors').textContent = contributors;
        document.getElementById('recentUpdates').textContent = recentUpdates;
    }
    
    shareRecipe(recipeId) {
        const recipe = this.recipes.find(r => r.id == recipeId);
        if (!recipe) {
            this.showNotification('Recipe not found.', 'error');
            return;
        }
        
        const shareData = {
            title: recipe.name,
            text: `Check out this family recipe: ${recipe.name}`,
            url: `${window.location.origin}/recipes/?recipe=${recipeId}`
        };
        
        if (navigator.share) {
            navigator.share(shareData);
        } else {
            // Fallback to clipboard
            navigator.clipboard.writeText(shareData.url).then(() => {
                this.showNotification('Recipe link copied to clipboard!', 'success');
            });
        }
    }
    
    editRecipe(recipeId) {
        // Open edit recipe page in new tab/window for full editing capabilities
        window.open(`recipe-edit.php?id=${recipeId}`, '_blank');
    }
    
    toggleKitchenMode() {
        if (this.isKitchenMode) {
            // exitKitchenMode removed - now only opens in new tab
        } else {
            this.showNotification('Select a recipe to enter Kitchen Mode', 'info');
        }
    }
    
    closeModal() {
        if (window.unifiedModal) {
            window.unifiedModal.close('recipeModal');
        } else {
            document.getElementById('recipeModal').classList.add('hidden');
        }
        this.activeRecipe = null;
    }
    
    closeCreateModal() {
        if (window.unifiedModal) {
            window.unifiedModal.close('createRecipeModal');
        } else {
            document.getElementById('createRecipeModal').classList.add('hidden');
        }
    }
    
    closeTimelineModal() {
        if (window.unifiedModal) {
            window.unifiedModal.close('timelineModal');
        } else {
            document.getElementById('timelineModal').classList.add('hidden');
        }
    }
    
    closeAllModals() {
        document.querySelectorAll('.recipe-modal, .kitchen-modal, .timeline-modal').forEach(modal => {
            modal.classList.add('hidden');
        });
        this.activeRecipe = null;
        this.isKitchenMode = false;
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 2rem;
            right: 2rem;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
        `;
        
        // Type-specific styling
        const colors = {
            success: '#059669',
            error: '#dc2626',
            info: '#0891b2',
            warning: '#d97706'
        };
        
        notification.style.backgroundColor = colors[type] || colors.info;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 5000);
    }
}

// Initialize the Recipe Vault
let recipeVault;

document.addEventListener('DOMContentLoaded', () => {
    recipeVault = new RecipeVault();
});

// Add global styles for notifications and empty state
const globalStyles = document.createElement('style');
globalStyles.textContent = `
    .empty-state {
        text-align: center;
        padding: 4rem 2rem;
        grid-column: 1 / -1;
        color: rgba(255, 255, 255, 0.8);
    }
    
    .empty-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
    }
    
    .empty-state h3 {
        font-size: 1.5rem;
        margin-bottom: 1rem;
        color: #fbbf24;
    }
    
    .empty-state p {
        margin-bottom: 2rem;
        font-size: 1.125rem;
    }
    
    .notification {
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(10px);
    }
`;
document.head.appendChild(globalStyles);