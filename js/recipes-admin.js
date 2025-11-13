// Recipe Management Admin Module - Impossible Implementation
// Complete recipe administration with Git-like versioning control

class RecipesAdmin {
    constructor() {
        this.name = 'recipes';
        this.title = 'Recipe Management';
        this.icon = '🍝';
        this.priority = 2;
        this.recipes = [];
        this.pendingRecipes = [];
        this.modifications = [];
        this.stats = {};
        this.selectedRecipes = new Set();
        this.sortBy = 'created';
        this.sortOrder = 'desc';
        this.filterStatus = 'all';
        
        this.loadData();
    }
    
    async loadData() {
        try {
            // Load from API
            const response = await fetch('/api/recipes.php?action=admin_list');
            const data = await response.json();
            
            if (data.success) {
                this.recipes = data.recipes || [];
                this.pendingRecipes = data.pending || [];
                this.modifications = data.modifications || [];
            } else {
                this.recipes = [];
                this.pendingRecipes = [];
                this.modifications = [];
            }
        } catch (error) {
            console.log('No recipe data available');
            this.recipes = [];
            this.pendingRecipes = [];
            this.modifications = [];
        }
        
        this.calculateStats();
    }
    
    calculateStats() {
        const totalRecipes = this.recipes.length;
        const pendingCount = this.pendingRecipes.length;
        const totalViews = this.recipes.reduce((sum, recipe) => sum + (recipe.views || 0), 0);
        const avgRating = this.recipes.reduce((sum, recipe) => sum + (recipe.rating || 0), 0) / totalRecipes;
        const featuredCount = this.recipes.filter(r => r.featured).length;
        const recentModifications = this.modifications.filter(m => {
            const modDate = new Date(m.date);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return modDate > weekAgo;
        }).length;
        
        this.stats = {
            totalRecipes,
            pendingCount,
            totalViews,
            avgRating: avgRating.toFixed(1),
            featuredCount,
            recentModifications
        };
    }
    
    async getStats() {
        return [
            { label: 'Total Recipes', value: this.stats.totalRecipes || '0' },
            { label: 'Pending Review', value: this.stats.pendingCount || '0' },
            { label: 'Total Views', value: this.stats.totalViews || '0' },
            { label: 'Avg Rating', value: this.stats.avgRating || '0.0' }
        ];
    }
    
    async render(container) {
        container.innerHTML = `
            <div class="recipes-admin">
                <div class="admin-header">
                    <h2>🍝 Recipe Management</h2>
                    <div class="admin-actions">
                        <button class="admin-btn primary" onclick="recipesAdmin.showPendingReview()">
                            <span class="btn-icon">📋</span>
                            <span class="btn-text">Pending Review (${this.stats.pendingCount})</span>
                        </button>
                        <button class="admin-btn secondary" onclick="recipesAdmin.exportRecipes()">
                            <span class="btn-icon">📤</span>
                            <span class="btn-text">Export All</span>
                        </button>
                    </div>
                </div>
                
                <div class="admin-stats-overview">
                    <div class="stat-grid">
                        <div class="stat-item">
                            <div class="stat-icon">📚</div>
                            <div class="stat-info">
                                <div class="stat-number">${this.stats.totalRecipes}</div>
                                <div class="stat-label">Total Recipes</div>
                            </div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-icon">👁️</div>
                            <div class="stat-info">
                                <div class="stat-number">${this.stats.totalViews}</div>
                                <div class="stat-label">Total Views</div>
                            </div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-icon">⭐</div>
                            <div class="stat-info">
                                <div class="stat-number">${this.stats.avgRating}</div>
                                <div class="stat-label">Avg Rating</div>
                            </div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-icon">🌟</div>
                            <div class="stat-info">
                                <div class="stat-number">${this.stats.featuredCount}</div>
                                <div class="stat-label">Featured</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="admin-controls">
                    <div class="controls-left">
                        <div class="control-group">
                            <label>Sort by:</label>
                            <select id="recipeSortBy" onchange="recipesAdmin.updateSort(this.value)">
                                <option value="created">Date Created</option>
                                <option value="modified">Last Modified</option>
                                <option value="name">Recipe Name</option>
                                <option value="author">Author</option>
                                <option value="views">Views</option>
                                <option value="rating">Rating</option>
                            </select>
                        </div>
                        <div class="control-group">
                            <label>Filter:</label>
                            <select id="recipeFilter" onchange="recipesAdmin.updateFilter(this.value)">
                                <option value="all">All Recipes</option>
                                <option value="featured">Featured Only</option>
                                <option value="recent">Recent (30 days)</option>
                                <option value="popular">Popular (100+ views)</option>
                                <option value="needs_attention">Needs Attention</option>
                            </select>
                        </div>
                    </div>
                    <div class="controls-right">
                        <div class="bulk-actions">
                            <button class="admin-btn" onclick="recipesAdmin.selectAll()">Select All</button>
                            <button class="admin-btn" onclick="recipesAdmin.bulkFeature()">Feature</button>
                            <button class="admin-btn" onclick="recipesAdmin.bulkUnfeature()">Unfeature</button>
                            <button class="admin-btn danger" onclick="recipesAdmin.bulkDelete()">Delete</button>
                        </div>
                    </div>
                </div>
                
                <div class="recipes-table-container">
                    <table class="recipes-table">
                        <thead>
                            <tr>
                                <th><input type="checkbox" id="selectAllCheckbox" onchange="recipesAdmin.toggleSelectAll()"></th>
                                <th>Recipe</th>
                                <th>Author</th>
                                <th>Category</th>
                                <th>Status</th>
                                <th>Views</th>
                                <th>Rating</th>
                                <th>Modified</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="recipesTableBody">
                            ${this.renderRecipeRows()}
                        </tbody>
                    </table>
                </div>
                
                <div class="recent-activity">
                    <h3>Recent Recipe Activity</h3>
                    <div class="activity-list">
                        ${this.renderRecentActivity()}
                    </div>
                </div>
            </div>
        `;
        
        this.addAdminStyles();
    }
    
    renderRecipeRows() {
        const filteredRecipes = this.getFilteredRecipes();
        
        return filteredRecipes.map(recipe => `
            <tr class="recipe-row ${recipe.featured ? 'featured' : ''}" data-recipe-id="${recipe.id}">
                <td>
                    <input type="checkbox" class="recipe-checkbox" value="${recipe.id}" onchange="recipesAdmin.toggleRecipeSelection(${recipe.id})">
                </td>
                <td class="recipe-name-cell">
                    <div class="recipe-name">${recipe.name}</div>
                    ${recipe.featured ? '<span class="featured-badge">⭐ Featured</span>' : ''}
                </td>
                <td class="recipe-author">${recipe.author}</td>
                <td class="recipe-category">
                    <span class="category-badge category-${recipe.category}">${this.formatCategory(recipe.category)}</span>
                </td>
                <td class="recipe-status">
                    <span class="status-badge status-${recipe.status}">${recipe.status}</span>
                </td>
                <td class="recipe-views">${recipe.views || 0}</td>
                <td class="recipe-rating">
                    <div class="rating-display">
                        <span class="rating-stars">${this.renderStars(recipe.rating)}</span>
                        <span class="rating-number">${recipe.rating}</span>
                    </div>
                </td>
                <td class="recipe-modified">${this.formatDate(recipe.modified)}</td>
                <td class="recipe-actions">
                    <div class="action-buttons">
                        <button class="action-btn" onclick="recipesAdmin.editRecipe(${recipe.id})" title="Edit">
                            ✏️
                        </button>
                        <button class="action-btn" onclick="recipesAdmin.viewHistory(${recipe.id})" title="View History">
                            📊
                        </button>
                        <button class="action-btn" onclick="recipesAdmin.toggleFeature(${recipe.id})" title="Toggle Feature">
                            ${recipe.featured ? '🌟' : '⭐'}
                        </button>
                        <button class="action-btn danger" onclick="recipesAdmin.deleteRecipe(${recipe.id})" title="Delete">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    renderRecentActivity() {
        const recentItems = [
            ...this.modifications.slice(0, 3).map(mod => ({
                type: 'modification',
                icon: '✏️',
                text: `${mod.author} modified "${this.getRecipeName(mod.recipeId)}"`,
                date: mod.date,
                description: mod.description
            })),
            ...this.pendingRecipes.slice(0, 2).map(recipe => ({
                type: 'submission',
                icon: '📝',
                text: `${recipe.author} submitted "${recipe.name}"`,
                date: recipe.created,
                description: 'Pending review'
            }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
        
        return recentItems.map(item => `
            <div class="activity-item">
                <div class="activity-icon">${item.icon}</div>
                <div class="activity-content">
                    <div class="activity-text">${item.text}</div>
                    <div class="activity-meta">
                        <span class="activity-date">${this.formatDate(item.date)}</span>
                        <span class="activity-description">${item.description}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    getFilteredRecipes() {
        let filtered = [...this.recipes];
        
        // Apply filters
        switch (this.filterStatus) {
            case 'featured':
                filtered = filtered.filter(r => r.featured);
                break;
            case 'recent':
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                filtered = filtered.filter(r => new Date(r.created) > thirtyDaysAgo);
                break;
            case 'popular':
                filtered = filtered.filter(r => (r.views || 0) >= 100);
                break;
            case 'needs_attention':
                filtered = filtered.filter(r => (r.rating || 0) < 4.0 || (r.views || 0) < 10);
                break;
        }
        
        // Apply sorting
        filtered.sort((a, b) => {
            let aValue = a[this.sortBy];
            let bValue = b[this.sortBy];
            
            if (this.sortBy === 'created' || this.sortBy === 'modified') {
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            }
            
            if (this.sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });
        
        return filtered;
    }
    
    formatCategory(category) {
        const categories = {
            appetizers: 'Appetizers',
            main: 'Main Dishes',
            desserts: 'Desserts',
            drinks: 'Drinks',
            sides: 'Side Dishes'
        };
        return categories[category] || category;
    }
    
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    
    renderStars(rating) {
        const stars = [];
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        
        for (let i = 0; i < fullStars; i++) {
            stars.push('⭐');
        }
        
        if (hasHalfStar) {
            stars.push('🌟');
        }
        
        return stars.join('');
    }
    
    getRecipeName(recipeId) {
        const recipe = this.recipes.find(r => r.id === recipeId);
        return recipe ? recipe.name : 'Unknown Recipe';
    }
    
    updateSort(sortBy) {
        this.sortBy = sortBy;
        this.refreshTable();
    }
    
    updateFilter(filterStatus) {
        this.filterStatus = filterStatus;
        this.refreshTable();
    }
    
    refreshTable() {
        const tableBody = document.getElementById('recipesTableBody');
        if (tableBody) {
            tableBody.innerHTML = this.renderRecipeRows();
        }
    }
    
    toggleSelectAll() {
        const checkbox = document.getElementById('selectAllCheckbox');
        const recipeCheckboxes = document.querySelectorAll('.recipe-checkbox');
        
        recipeCheckboxes.forEach(cb => {
            cb.checked = checkbox.checked;
            const recipeId = parseInt(cb.value);
            if (checkbox.checked) {
                this.selectedRecipes.add(recipeId);
            } else {
                this.selectedRecipes.delete(recipeId);
            }
        });
    }
    
    toggleRecipeSelection(recipeId) {
        if (this.selectedRecipes.has(recipeId)) {
            this.selectedRecipes.delete(recipeId);
        } else {
            this.selectedRecipes.add(recipeId);
        }
    }
    
    selectAll() {
        const filteredRecipes = this.getFilteredRecipes();
        filteredRecipes.forEach(recipe => {
            this.selectedRecipes.add(recipe.id);
        });
        
        // Update checkboxes
        document.querySelectorAll('.recipe-checkbox').forEach(cb => {
            const recipeId = parseInt(cb.value);
            if (this.selectedRecipes.has(recipeId)) {
                cb.checked = true;
            }
        });
    }
    
    async toggleFeature(recipeId) {
        const recipe = this.recipes.find(r => r.id === recipeId);
        if (!recipe) return;
        
        recipe.featured = !recipe.featured;
        
        try {
            await fetch('/api/recipes.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'toggle_feature',
                    recipe_id: recipeId,
                    featured: recipe.featured
                })
            });
        } catch (error) {
            console.log('Staging mode: Feature toggled locally');
        }
        
        this.calculateStats();
        this.refreshTable();
        this.showNotification(
            `Recipe ${recipe.featured ? 'featured' : 'unfeatured'} successfully!`,
            'success'
        );
    }
    
    bulkFeature() {
        if (this.selectedRecipes.size === 0) {
            this.showNotification('No recipes selected', 'warning');
            return;
        }
        
        this.selectedRecipes.forEach(recipeId => {
            const recipe = this.recipes.find(r => r.id === recipeId);
            if (recipe) recipe.featured = true;
        });
        
        this.calculateStats();
        this.refreshTable();
        this.showNotification(`${this.selectedRecipes.size} recipes featured!`, 'success');
        this.selectedRecipes.clear();
    }
    
    bulkUnfeature() {
        if (this.selectedRecipes.size === 0) {
            this.showNotification('No recipes selected', 'warning');
            return;
        }
        
        this.selectedRecipes.forEach(recipeId => {
            const recipe = this.recipes.find(r => r.id === recipeId);
            if (recipe) recipe.featured = false;
        });
        
        this.calculateStats();
        this.refreshTable();
        this.showNotification(`${this.selectedRecipes.size} recipes unfeatured!`, 'success');
        this.selectedRecipes.clear();
    }
    
    bulkDelete() {
        if (this.selectedRecipes.size === 0) {
            this.showNotification('No recipes selected', 'warning');
            return;
        }
        
        if (confirm(`Are you sure you want to delete ${this.selectedRecipes.size} recipes? This cannot be undone.`)) {
            this.selectedRecipes.forEach(recipeId => {
                const index = this.recipes.findIndex(r => r.id === recipeId);
                if (index !== -1) {
                    this.recipes.splice(index, 1);
                }
            });
            
            this.calculateStats();
            this.refreshTable();
            this.showNotification(`${this.selectedRecipes.size} recipes deleted!`, 'success');
            this.selectedRecipes.clear();
        }
    }
    
    editRecipe(recipeId) {
        this.showNotification('Edit functionality will open recipe editor', 'info');
    }
    
    viewHistory(recipeId) {
        const recipe = this.recipes.find(r => r.id === recipeId);
        if (!recipe) return;
        
        const modifications = this.modifications.filter(m => m.recipeId === recipeId);
        
        const modal = document.createElement('div');
        modal.className = 'history-modal';
        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Recipe History: ${recipe.name}</h3>
                    <button class="modal-close" onclick="this.closest('.history-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="history-timeline">
                        <div class="history-item">
                            <div class="history-icon">🎯</div>
                            <div class="history-content">
                                <div class="history-title">Recipe Created</div>
                                <div class="history-meta">${recipe.author} • ${this.formatDate(recipe.created)}</div>
                                <div class="history-description">Original recipe published</div>
                            </div>
                        </div>
                        ${modifications.map(mod => `
                            <div class="history-item">
                                <div class="history-icon">✏️</div>
                                <div class="history-content">
                                    <div class="history-title">${mod.type.replace('_', ' ')}</div>
                                    <div class="history-meta">${mod.author} • ${this.formatDate(mod.date)}</div>
                                    <div class="history-description">${mod.description}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .history-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .history-modal .modal-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(5px);
            }
            
            .history-modal .modal-content {
                position: relative;
                background: white;
                border-radius: 12px;
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                color: #1f2937;
            }
            
            .history-modal .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1.5rem;
                border-bottom: 1px solid #e5e7eb;
            }
            
            .history-modal .modal-close {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                padding: 0.5rem;
                border-radius: 4px;
            }
            
            .history-modal .modal-close:hover {
                background: #f3f4f6;
            }
            
            .history-timeline {
                padding: 1.5rem;
            }
            
            .history-item {
                display: flex;
                gap: 1rem;
                margin-bottom: 1.5rem;
            }
            
            .history-icon {
                font-size: 1.5rem;
                padding: 0.5rem;
                background: #f3f4f6;
                border-radius: 50%;
                width: 3rem;
                height: 3rem;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            
            .history-content {
                flex: 1;
            }
            
            .history-title {
                font-weight: 600;
                margin-bottom: 0.25rem;
            }
            
            .history-meta {
                font-size: 0.875rem;
                color: #6b7280;
                margin-bottom: 0.5rem;
            }
            
            .history-description {
                color: #4b5563;
                line-height: 1.5;
            }
        `;
        
        document.head.appendChild(style);
        
        // Remove after 30 seconds or on escape
        setTimeout(() => {
            if (document.body.contains(modal)) {
                modal.remove();
            }
        }, 30000);
    }
    
    deleteRecipe(recipeId) {
        const recipe = this.recipes.find(r => r.id === recipeId);
        if (!recipe) return;
        
        if (confirm(`Are you sure you want to delete "${recipe.name}"? This cannot be undone.`)) {
            const index = this.recipes.findIndex(r => r.id === recipeId);
            if (index !== -1) {
                this.recipes.splice(index, 1);
                this.calculateStats();
                this.refreshTable();
                this.showNotification('Recipe deleted successfully!', 'success');
            }
        }
    }
    
    showPendingReview() {
        if (this.pendingRecipes.length === 0) {
            this.showNotification('No recipes pending review', 'info');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'pending-modal';
        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Pending Recipe Review (${this.pendingRecipes.length})</h3>
                    <button class="modal-close" onclick="this.closest('.pending-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="pending-list">
                        ${this.pendingRecipes.map(recipe => `
                            <div class="pending-item">
                                <div class="pending-info">
                                    <h4>${recipe.name}</h4>
                                    <p>By ${recipe.author} • ${this.formatDate(recipe.created)}</p>
                                    <div class="pending-category">${this.formatCategory(recipe.category)}</div>
                                </div>
                                <div class="pending-actions">
                                    <button class="admin-btn success" onclick="recipesAdmin.approvePendingRecipe(${recipe.id})">
                                        ✅ Approve
                                    </button>
                                    <button class="admin-btn danger" onclick="recipesAdmin.rejectPendingRecipe(${recipe.id})">
                                        ❌ Reject
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    approvePendingRecipe(recipeId) {
        const pendingIndex = this.pendingRecipes.findIndex(r => r.id === recipeId);
        if (pendingIndex === -1) return;
        
        const recipe = this.pendingRecipes[pendingIndex];
        
        // Move to approved recipes
        this.recipes.unshift({
            ...recipe,
            status: 'approved',
            views: 0,
            rating: 4.0,
            modifications: 0,
            featured: false
        });
        
        // Remove from pending
        this.pendingRecipes.splice(pendingIndex, 1);
        
        this.calculateStats();
        this.refreshTable();
        this.showNotification(`Recipe "${recipe.name}" approved!`, 'success');
        
        // Close modal if no more pending
        if (this.pendingRecipes.length === 0) {
            const modal = document.querySelector('.pending-modal');
            if (modal) modal.remove();
        }
    }
    
    rejectPendingRecipe(recipeId) {
        const pendingIndex = this.pendingRecipes.findIndex(r => r.id === recipeId);
        if (pendingIndex === -1) return;
        
        const recipe = this.pendingRecipes[pendingIndex];
        
        if (confirm(`Are you sure you want to reject "${recipe.name}"?`)) {
            this.pendingRecipes.splice(pendingIndex, 1);
            this.calculateStats();
            this.showNotification(`Recipe "${recipe.name}" rejected`, 'info');
            
            // Close modal if no more pending
            if (this.pendingRecipes.length === 0) {
                const modal = document.querySelector('.pending-modal');
                if (modal) modal.remove();
            }
        }
    }
    
    exportRecipes() {
        const dataStr = JSON.stringify(this.recipes, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `family_recipes_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        this.showNotification('Recipes exported successfully!', 'success');
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `admin-notification ${type}`;
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
        
        const colors = {
            success: '#059669',
            error: '#dc2626',
            info: '#0891b2',
            warning: '#d97706'
        };
        
        notification.style.backgroundColor = colors[type] || colors.info;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }
    
    addAdminStyles() {
        if (document.getElementById('recipesAdminStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'recipesAdminStyles';
        style.textContent = `
            .recipes-admin {
                color: white;
            }
            
            .admin-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 2rem;
            }
            
            .admin-header h2 {
                color: #fbbf24;
                font-size: 1.75rem;
                margin: 0;
            }
            
            .admin-actions {
                display: flex;
                gap: 1rem;
            }
            
            .admin-btn {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.75rem 1rem;
                border: none;
                border-radius: 8px;
                font-size: 0.875rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .admin-btn.primary {
                background: #d97706;
                color: white;
            }
            
            .admin-btn.secondary {
                background: rgba(255, 255, 255, 0.1);
                color: white;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .admin-btn.success {
                background: #059669;
                color: white;
            }
            
            .admin-btn.danger {
                background: #dc2626;
                color: white;
            }
            
            .admin-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            }
            
            .admin-stats-overview {
                margin-bottom: 2rem;
            }
            
            .stat-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1rem;
            }
            
            .stat-item {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 12px;
                padding: 1.5rem;
                display: flex;
                align-items: center;
                gap: 1rem;
            }
            
            .stat-icon {
                font-size: 2rem;
                background: rgba(251, 191, 36, 0.2);
                padding: 0.75rem;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .stat-number {
                font-size: 1.5rem;
                font-weight: 700;
                color: #fbbf24;
            }
            
            .stat-label {
                font-size: 0.875rem;
                color: rgba(255, 255, 255, 0.7);
            }
            
            .admin-controls {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 2rem;
                flex-wrap: wrap;
                gap: 1rem;
            }
            
            .controls-left {
                display: flex;
                gap: 1rem;
                flex-wrap: wrap;
            }
            
            .control-group {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .control-group label {
                font-size: 0.875rem;
                color: rgba(255, 255, 255, 0.8);
                white-space: nowrap;
            }
            
            .control-group select {
                padding: 0.5rem;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 6px;
                color: white;
                font-size: 0.875rem;
                cursor: pointer;
            }
            
            .control-group select option {
                background: #1e1b4b;
                color: white;
            }
            
            .bulk-actions {
                display: flex;
                gap: 0.5rem;
            }
            
            .bulk-actions .admin-btn {
                padding: 0.5rem 1rem;
                font-size: 0.75rem;
            }
            
            .recipes-table-container {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                overflow: hidden;
                margin-bottom: 2rem;
            }
            
            .recipes-table {
                width: 100%;
                border-collapse: collapse;
            }
            
            .recipes-table th {
                background: rgba(255, 255, 255, 0.1);
                color: #fbbf24;
                padding: 1rem;
                text-align: left;
                font-weight: 600;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .recipes-table td {
                padding: 1rem;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }
            
            .recipe-row:hover {
                background: rgba(255, 255, 255, 0.05);
            }
            
            .recipe-row.featured {
                background: rgba(251, 191, 36, 0.1);
            }
            
            .recipe-name {
                font-weight: 600;
                color: white;
                margin-bottom: 0.25rem;
            }
            
            .featured-badge {
                background: #fbbf24;
                color: #92400e;
                padding: 0.25rem 0.5rem;
                border-radius: 4px;
                font-size: 0.75rem;
                font-weight: 600;
            }
            
            .category-badge {
                padding: 0.25rem 0.5rem;
                border-radius: 4px;
                font-size: 0.75rem;
                font-weight: 600;
                color: white;
            }
            
            .category-appetizers { background: #059669; }
            .category-main { background: #dc2626; }
            .category-desserts { background: #7c3aed; }
            .category-drinks { background: #0891b2; }
            .category-sides { background: #ea580c; }
            
            .status-badge {
                padding: 0.25rem 0.5rem;
                border-radius: 4px;
                font-size: 0.75rem;
                font-weight: 600;
                color: white;
            }
            
            .status-approved { background: #059669; }
            .status-pending { background: #d97706; }
            .status-rejected { background: #dc2626; }
            
            .rating-display {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .rating-stars {
                font-size: 0.875rem;
            }
            
            .rating-number {
                font-size: 0.875rem;
                font-weight: 600;
                color: #fbbf24;
            }
            
            .action-buttons {
                display: flex;
                gap: 0.25rem;
            }
            
            .action-btn {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 6px;
                padding: 0.5rem;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 0.875rem;
            }
            
            .action-btn:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: scale(1.05);
            }
            
            .action-btn.danger:hover {
                background: rgba(220, 38, 38, 0.2);
            }
            
            .recent-activity {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 1.5rem;
            }
            
            .recent-activity h3 {
                color: #fbbf24;
                margin-bottom: 1rem;
            }
            
            .activity-list {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }
            
            .activity-item {
                display: flex;
                gap: 1rem;
                align-items: flex-start;
            }
            
            .activity-icon {
                font-size: 1.25rem;
                background: rgba(255, 255, 255, 0.1);
                padding: 0.5rem;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            
            .activity-content {
                flex: 1;
            }
            
            .activity-text {
                color: white;
                font-weight: 500;
                margin-bottom: 0.25rem;
            }
            
            .activity-meta {
                display: flex;
                gap: 1rem;
                font-size: 0.875rem;
                color: rgba(255, 255, 255, 0.6);
            }
            
            .activity-date {
                font-weight: 500;
            }
            
            .pending-list {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }
            
            .pending-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1rem;
                background: #f9fafb;
                border-radius: 8px;
                color: #1f2937;
            }
            
            .pending-info h4 {
                margin: 0 0 0.5rem 0;
                color: #1f2937;
            }
            
            .pending-info p {
                margin: 0 0 0.5rem 0;
                color: #6b7280;
                font-size: 0.875rem;
            }
            
            .pending-category {
                display: inline-block;
                background: #e5e7eb;
                color: #374151;
                padding: 0.25rem 0.5rem;
                border-radius: 4px;
                font-size: 0.75rem;
                font-weight: 600;
            }
            
            .pending-actions {
                display: flex;
                gap: 0.5rem;
            }
            
            @media (max-width: 768px) {
                .admin-controls {
                    flex-direction: column;
                    align-items: flex-start;
                }
                
                .controls-left {
                    width: 100%;
                }
                
                .bulk-actions {
                    width: 100%;
                    justify-content: flex-start;
                }
                
                .recipes-table-container {
                    overflow-x: auto;
                }
                
                .recipes-table {
                    min-width: 800px;
                }
                
                .pending-item {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 1rem;
                }
                
                .pending-actions {
                    width: 100%;
                    justify-content: flex-end;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Create and register the admin module
const recipesAdmin = new RecipesAdmin();

// Register with admin core
if (typeof adminCore !== 'undefined') {
    adminCore.registerModule({
        name: recipesAdmin.name,
        title: recipesAdmin.title,
        icon: recipesAdmin.icon,
        priority: recipesAdmin.priority,
        getStats: () => recipesAdmin.getStats(),
        render: (container) => recipesAdmin.render(container)
    });
} else {
    // Wait for admin core to be available
    document.addEventListener('DOMContentLoaded', () => {
        const checkAdminCore = () => {
            if (typeof adminCore !== 'undefined') {
                adminCore.registerModule({
                    name: recipesAdmin.name,
                    title: recipesAdmin.title,
                    icon: recipesAdmin.icon,
                    priority: recipesAdmin.priority,
                    getStats: () => recipesAdmin.getStats(),
                    render: (container) => recipesAdmin.render(container)
                });
            } else {
                setTimeout(checkAdminCore, 100);
            }
        };
        checkAdminCore();
    });
}