// Recipe Management Admin Module
// Unified with other admin modules pattern

class RecipesAdmin {
    constructor() {
        this.recipes = [];
        this.selectedRecipes = new Set();
        this.dataLoaded = false;
        this.sortBy = 'created_at';
        this.sortOrder = 'desc';
        this.filterCategory = 'all';
    }

    async loadData() {
        try {
            const response = await fetch('/api/recipes.php?action=admin_list');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.recipes = Array.isArray(data.recipes) ? data.recipes : [];
                } else {
                    console.error('Recipe API error:', data.error);
                    this.recipes = [];
                }
            } else {
                console.log('Recipes API returned status:', response.status);
                this.recipes = [];
            }
        } catch (error) {
            console.error('Error loading recipes:', error);
            this.recipes = [];
        }
    }

    async getStats() {
        return [
            { label: 'Total Recipes', value: this.recipes.length }
        ];
    }

    async render(container) {
        if (!this.dataLoaded) {
            await this.loadData();
            this.dataLoaded = true;
        }

        const categories = this.getUniqueCategories();

        container.innerHTML = `
            <div class="recipes-admin-panel">
                <div class="section-header">
                    <h3>🍝 Recipe Management</h3>
                    <div class="header-actions">
                        <button onclick="recipesAdmin.refresh()" class="btn btn-secondary">
                            🔄 Refresh
                        </button>
                        <a href="/recipe-create.php" class="btn btn-primary" target="_blank">
                            ➕ Add Recipe
                        </a>
                    </div>
                </div>

                <div class="admin-controls" style="display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
                    <div class="control-group">
                        <label style="margin-right: 0.5rem;">Category:</label>
                        <select id="recipeCategoryFilter" onchange="recipesAdmin.updateFilter(this.value)">
                            <option value="all">All Categories</option>
                            ${categories.map(cat => `<option value="${cat}">${this.formatCategory(cat)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="control-group">
                        <label style="margin-right: 0.5rem;">Sort:</label>
                        <select id="recipeSortBy" onchange="recipesAdmin.updateSort(this.value)">
                            <option value="created_at">Date Added</option>
                            <option value="name">Name</option>
                            <option value="category">Category</option>
                            <option value="author_name">Author</option>
                        </select>
                    </div>
                </div>

                <div class="recipes-stats" style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
                    <div class="stat-card" style="background: var(--glass-bg); padding: 1rem; border-radius: 8px; text-align: center; min-width: 120px;">
                        <div class="stat-number" style="font-size: 1.5rem; font-weight: bold; color: var(--primary);">${this.recipes.length}</div>
                        <div class="stat-label" style="font-size: 0.875rem; color: var(--light-gray);">Total Recipes</div>
                    </div>
                    <div class="stat-card" style="background: var(--glass-bg); padding: 1rem; border-radius: 8px; text-align: center; min-width: 120px;">
                        <div class="stat-number" style="font-size: 1.5rem; font-weight: bold; color: var(--primary);">${categories.length}</div>
                        <div class="stat-label" style="font-size: 0.875rem; color: var(--light-gray);">Categories</div>
                    </div>
                    <div class="stat-card" style="background: var(--glass-bg); padding: 1rem; border-radius: 8px; text-align: center; min-width: 120px;">
                        <div class="stat-number" style="font-size: 1.5rem; font-weight: bold; color: var(--primary);">${this.recipes.reduce((sum, r) => sum + (parseInt(r.modification_count) || 0), 0)}</div>
                        <div class="stat-label" style="font-size: 0.875rem; color: var(--light-gray);">Total Notes</div>
                    </div>
                </div>

                <div class="recipes-list" id="recipesList">
                    ${this.renderRecipesList()}
                </div>
            </div>
        `;
    }

    renderRecipesList() {
        const filtered = this.getFilteredRecipes();

        if (filtered.length === 0) {
            return `
                <div class="empty-state" style="text-align: center; padding: 3rem; color: var(--light-gray);">
                    <p>🍝 No recipes found</p>
                    <p style="font-size: 0.875rem;">Try adjusting your filters or add a new recipe.</p>
                </div>
            `;
        }

        return filtered.map(recipe => this.renderRecipeCard(recipe)).join('');
    }

    renderRecipeCard(recipe) {
        const createdDate = recipe.created_at ? new Date(recipe.created_at).toLocaleDateString() : 'Unknown';
        const modCount = parseInt(recipe.modification_count) || 0;

        return `
            <div class="recipe-card" data-id="${recipe.id}" style="background: var(--glass-bg); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <div class="recipe-info" style="flex: 1; min-width: 200px;">
                    <h4 style="margin: 0 0 0.5rem 0; color: var(--black);">${this.escapeHtml(recipe.name)}</h4>
                    <div class="recipe-meta" style="display: flex; flex-wrap: wrap; gap: 0.75rem; font-size: 0.875rem; color: var(--light-gray);">
                        ${recipe.category ? `<span class="category-badge" style="background: var(--primary); color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">${this.formatCategory(recipe.category)}</span>` : ''}
                        ${recipe.difficulty ? `<span>📊 ${recipe.difficulty}</span>` : ''}
                        ${recipe.prep_time ? `<span>⏱️ ${recipe.prep_time}</span>` : ''}
                        ${recipe.serves ? `<span>👥 Serves ${recipe.serves}</span>` : ''}
                    </div>
                    <div class="recipe-author" style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--light-gray);">
                        By ${this.escapeHtml(recipe.author_name || 'Unknown')} • ${createdDate}
                        ${modCount > 0 ? `• 📝 ${modCount} note${modCount > 1 ? 's' : ''}` : ''}
                    </div>
                </div>
                <div class="recipe-actions" style="display: flex; gap: 0.5rem;">
                    <a href="/recipe-edit.php?id=${recipe.id}" class="btn btn-secondary btn-sm" target="_blank" title="Edit">
                        ✏️ Edit
                    </a>
                    <button onclick="recipesAdmin.viewRecipe(${recipe.id})" class="btn btn-secondary btn-sm" title="View Details">
                        👁️ View
                    </button>
                    <button onclick="recipesAdmin.deleteRecipe(${recipe.id}, '${this.escapeHtml(recipe.name).replace(/'/g, "\\'")}')" class="btn btn-danger btn-sm" title="Delete">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }

    getFilteredRecipes() {
        let filtered = [...this.recipes];

        // Apply category filter
        if (this.filterCategory !== 'all') {
            filtered = filtered.filter(r => r.category === this.filterCategory);
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let aVal = a[this.sortBy] || '';
            let bVal = b[this.sortBy] || '';

            if (this.sortBy === 'created_at') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            } else {
                aVal = String(aVal).toLowerCase();
                bVal = String(bVal).toLowerCase();
            }

            if (this.sortOrder === 'asc') {
                return aVal > bVal ? 1 : -1;
            }
            return aVal < bVal ? 1 : -1;
        });

        return filtered;
    }

    getUniqueCategories() {
        const categories = new Set();
        this.recipes.forEach(r => {
            if (r.category) categories.add(r.category);
        });
        return Array.from(categories).sort();
    }

    formatCategory(category) {
        if (!category) return 'Uncategorized';
        const formats = {
            'appetizers': 'Appetizers',
            'main': 'Main Dishes',
            'desserts': 'Desserts',
            'drinks': 'Drinks',
            'sides': 'Side Dishes',
            'breakfast': 'Breakfast',
            'soup': 'Soups',
            'salad': 'Salads'
        };
        return formats[category] || category.charAt(0).toUpperCase() + category.slice(1);
    }

    updateFilter(category) {
        this.filterCategory = category;
        this.refreshList();
    }

    updateSort(sortBy) {
        this.sortBy = sortBy;
        this.refreshList();
    }

    refreshList() {
        const listContainer = document.getElementById('recipesList');
        if (listContainer) {
            listContainer.innerHTML = this.renderRecipesList();
        }
    }

    async refresh() {
        this.dataLoaded = false;
        await this.loadData();
        this.dataLoaded = true;
        const container = document.getElementById('moduleContent');
        if (container) {
            await this.render(container);
        }
        this.showMessage('Recipes refreshed', 'success');
    }

    async viewRecipe(recipeId) {
        try {
            const response = await fetch(`/api/recipes.php?action=detail&id=${recipeId}`);
            const data = await response.json();

            if (data.success && data.recipe) {
                this.showRecipeModal(data.recipe);
            } else {
                this.showMessage('Recipe not found', 'error');
            }
        } catch (error) {
            console.error('Error loading recipe:', error);
            this.showMessage('Error loading recipe details', 'error');
        }
    }

    showRecipeModal(recipe) {
        // Remove existing modal if any
        const existing = document.getElementById('recipeViewModal');
        if (existing) existing.remove();

        const modifications = recipe.modifications || [];

        const modal = document.createElement('div');
        modal.id = 'recipeViewModal';
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="recipesAdmin.closeModal()"></div>
            <div class="modal-content" style="max-width: 700px; max-height: 80vh; overflow-y: auto;">
                <div class="modal-header">
                    <h3>🍝 ${this.escapeHtml(recipe.name)}</h3>
                    <button onclick="recipesAdmin.closeModal()" class="modal-close">×</button>
                </div>
                <div class="modal-body">
                    <div class="recipe-details" style="display: grid; gap: 1rem;">
                        <div class="detail-row" style="display: flex; flex-wrap: wrap; gap: 1rem;">
                            ${recipe.category ? `<span><strong>Category:</strong> ${this.formatCategory(recipe.category)}</span>` : ''}
                            ${recipe.difficulty ? `<span><strong>Difficulty:</strong> ${recipe.difficulty}</span>` : ''}
                            ${recipe.serves ? `<span><strong>Serves:</strong> ${recipe.serves}</span>` : ''}
                        </div>
                        <div class="detail-row" style="display: flex; flex-wrap: wrap; gap: 1rem;">
                            ${recipe.prep_time ? `<span><strong>Prep:</strong> ${recipe.prep_time}</span>` : ''}
                            ${recipe.cook_time ? `<span><strong>Cook:</strong> ${recipe.cook_time}</span>` : ''}
                        </div>

                        ${recipe.story ? `
                            <div class="detail-section">
                                <strong>Story:</strong>
                                <p style="margin: 0.5rem 0; color: var(--light-gray); font-style: italic;">${this.escapeHtml(recipe.story)}</p>
                            </div>
                        ` : ''}

                        <div class="detail-section">
                            <strong>Ingredients:</strong>
                            <pre style="white-space: pre-wrap; font-family: inherit; margin: 0.5rem 0; padding: 1rem; background: var(--eggshell); border-radius: 6px;">${this.escapeHtml(recipe.ingredients || 'No ingredients listed')}</pre>
                        </div>

                        <div class="detail-section">
                            <strong>Instructions:</strong>
                            <pre style="white-space: pre-wrap; font-family: inherit; margin: 0.5rem 0; padding: 1rem; background: var(--eggshell); border-radius: 6px;">${this.escapeHtml(recipe.instructions || 'No instructions listed')}</pre>
                        </div>

                        ${recipe.source ? `
                            <div class="detail-section">
                                <strong>Source:</strong> ${this.escapeHtml(recipe.source)}
                            </div>
                        ` : ''}

                        ${modifications.length > 0 ? `
                            <div class="detail-section">
                                <strong>Notes & Modifications (${modifications.length}):</strong>
                                <div style="margin-top: 0.5rem;">
                                    ${modifications.map(mod => `
                                        <div style="padding: 0.75rem; background: var(--eggshell); border-radius: 6px; margin-bottom: 0.5rem;">
                                            <div style="font-size: 0.875rem; color: var(--light-gray);">
                                                ${mod.modifier_name || 'Unknown'} • ${new Date(mod.created_at).toLocaleDateString()}
                                            </div>
                                            <div style="margin-top: 0.25rem;">${this.escapeHtml(mod.modification_text)}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <div class="detail-section" style="font-size: 0.875rem; color: var(--light-gray); border-top: 1px solid var(--border); padding-top: 1rem; margin-top: 0.5rem;">
                            Added by ${this.escapeHtml(recipe.author_name || 'Unknown')} on ${new Date(recipe.created_at).toLocaleDateString()}
                        </div>
                    </div>
                </div>
                <div class="modal-footer" style="display: flex; gap: 1rem; justify-content: flex-end;">
                    <a href="/recipe-edit.php?id=${recipe.id}" class="btn btn-primary" target="_blank">
                        ✏️ Edit Recipe
                    </a>
                    <button onclick="recipesAdmin.closeModal()" class="btn btn-secondary">
                        Close
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    closeModal() {
        const modal = document.getElementById('recipeViewModal');
        if (modal) modal.remove();
    }

    async deleteRecipe(recipeId, recipeName) {
        if (!confirm(`Are you sure you want to delete "${recipeName}"?\n\nThis cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch('/api/recipes.php?action=delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipe_id: recipeId })
            });

            const result = await response.json();

            if (result.success) {
                // Remove from local array
                this.recipes = this.recipes.filter(r => r.id != recipeId);
                this.refreshList();
                this.showMessage('Recipe deleted successfully', 'success');
            } else {
                throw new Error(result.error || 'Delete failed');
            }
        } catch (error) {
            console.error('Delete error:', error);
            this.showMessage('Failed to delete recipe: ' + error.message, 'error');
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showMessage(text, type = 'info') {
        const colors = {
            success: { bg: '#f0fdf4', text: '#166534' },
            error: { bg: '#fef2f2', text: '#991b1b' },
            info: { bg: '#f0f9ff', text: '#1e40af' },
            warning: { bg: '#fffbeb', text: '#92400e' }
        };
        const color = colors[type] || colors.info;

        const msg = document.createElement('div');
        msg.style.cssText = `
            position: fixed;
            top: 2rem;
            right: 2rem;
            background: ${color.bg};
            color: ${color.text};
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            font-weight: 500;
        `;
        msg.textContent = text;
        document.body.appendChild(msg);

        setTimeout(() => msg.remove(), 4000);
    }
}

// Create instance
const recipesAdmin = new RecipesAdmin();

// Register with admin core
function registerRecipesModule() {
    if (window.adminCore) {
        adminCore.registerModule({
            name: 'recipes',
            title: 'Recipe Management',
            icon: '🍝',
            priority: 6,
            getStats: () => recipesAdmin.getStats(),
            render: (container) => recipesAdmin.render(container)
        });
    }
}

if (window.adminCore) {
    registerRecipesModule();
} else {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(registerRecipesModule, 200);
    });
}
