// Recipes page functionality
let currentRecipeId = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadAllRecipes();
});

// Modal management
function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    currentRecipeId = null;
}

// Recipe functions
async function loadAllRecipes() {
    try {
        const response = await fetch('/api/recipes.php?action=list');
        const data = await response.json();
        
        if (data.success) {
            const container = document.getElementById('recipe-list');
            if (data.recipes.length === 0) {
                container.innerHTML = `
                    <div class="item">
                        <h3>No recipes yet</h3>
                        <p>Be the first to add a family recipe!</p>
                    </div>
                `;
            } else {
                container.innerHTML = data.recipes.map(recipe => `
                    <div class="item">
                        <h3>${escapeHtml(recipe.name)}</h3>
                        <div class="item-meta">
                            Added by ${escapeHtml(recipe.author_name)} • ${formatDate(recipe.created_at)}
                            ${recipe.modification_count > 0 ? `• ${recipe.modification_count} modification(s)` : ''}
                        </div>
                        <div class="item-content">
                            <button onclick="viewRecipe(${recipe.id})" class="btn">View Recipe</button>
                        </div>
                    </div>
                `).join('');
            }
        } else {
            showMessage('Error loading recipes: ' + data.error, 'error');
        }
    } catch (error) {
        showMessage('Error loading recipes', 'error');
        console.error('Error:', error);
    }
}

async function viewRecipe(recipeId) {
    try {
        const response = await fetch(`api/recipes.php?action=detail&id=${recipeId}`);
        const data = await response.json();
        
        if (data.success) {
            const recipe = data.recipe;
            currentRecipeId = recipeId;
            
            document.getElementById('recipe-detail-name').textContent = recipe.name;
            
            // Format ingredients
            const ingredients = recipe.ingredients.split('\n').filter(line => line.trim());
            document.getElementById('recipe-ingredients-list').innerHTML = 
                '<h4>Ingredients:</h4><ul>' + ingredients.map(ing => `<li>${escapeHtml(ing.trim())}</li>`).join('') + '</ul>';
            
            document.getElementById('recipe-instructions-text').innerHTML = 
                '<h4>Instructions:</h4><div style="white-space: pre-line; margin-top: 1rem;">' + escapeHtml(recipe.instructions) + '</div>';
            
            // Load modifications
            const historyHtml = recipe.modifications.map(mod => `
                <div class="recipe-change">
                    <div class="author">${escapeHtml(mod.modifier_name)}</div>
                    <div class="date">${formatDate(mod.created_at)}</div>
                    <div class="change">${escapeHtml(mod.modification_text)}</div>
                </div>
            `).join('');
            
            document.getElementById('recipe-changes').innerHTML = historyHtml || '<p>No modifications yet</p>';
            showModal('recipe-detail');
        } else {
            showMessage('Error loading recipe: ' + data.error, 'error');
        }
    } catch (error) {
        showMessage('Error loading recipe', 'error');
        console.error('Error:', error);
    }
}

function showAddRecipe() {
    document.getElementById('recipe-form-title').textContent = 'Add New Recipe';
    document.getElementById('recipe-form').reset();
    showModal('recipe-modal');
}

function addRecipeNote() {
    if (!currentRecipeId) {
        showMessage('No recipe selected', 'error');
        return;
    }
    document.getElementById('recipe-note-form').reset();
    showModal('recipe-note-modal');
}

// Form submissions
document.getElementById('recipe-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const data = {
        name: document.getElementById('recipe-name').value,
        ingredients: document.getElementById('recipe-ingredients').value,
        instructions: document.getElementById('recipe-instructions').value,
        notes: document.getElementById('recipe-notes').value
    };
    
    try {
        const response = await fetch('/api/recipes.php?action=add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Recipe added successfully!', 'success');
            closeModal();
            loadAllRecipes();
        } else {
            showMessage('Error: ' + result.error, 'error');
        }
    } catch (error) {
        showMessage('Error saving recipe', 'error');
        console.error('Error:', error);
    }
});

document.getElementById('recipe-note-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const data = {
        recipe_id: currentRecipeId,
        note: document.getElementById('recipe-note-text').value
    };
    
    try {
        const response = await fetch('/api/recipes.php?action=add_note', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Note added successfully!', 'success');
            closeModal();
            // Reload the recipe detail
            viewRecipe(currentRecipeId);
        } else {
            showMessage('Error: ' + result.error, 'error');
        }
    } catch (error) {
        showMessage('Error adding note', 'error');
        console.error('Error:', error);
    }
});

// Utility functions
function showMessage(text, type = 'success') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = text;
    
    document.body.insertBefore(messageDiv, document.body.firstChild);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) {
        return 'Just now';
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString();
    }
}