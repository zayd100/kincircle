// Reed & Weaver Family Hub - PHP Backend Version

// Global variables
let currentRecipeId = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    loadRecentMessages();
    loadContacts();
    loadRecentRecipes();
    loadRecentPhotos();
    initCalendar();
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
async function showRecipes() {
    try {
        const response = await fetch('/api/recipes.php?action=list');
        const data = await response.json();
        
        if (data.success) {
            const content = document.getElementById('recipe-content');
            content.innerHTML = `
                <div class="recipe-list">
                    ${data.recipes.map(recipe => `
                        <div class="recipe-preview">
                            <h3>${escapeHtml(recipe.name)}</h3>
                            <p>Added by ${escapeHtml(recipe.author_name)}</p>
                            <p>${recipe.modification_count} modification(s)</p>
                            <a href="#" onclick="viewRecipe(${recipe.id})">View Recipe & History</a>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            showMessage('Error loading recipes: ' + data.error, 'error');
        }
    } catch (error) {
        showMessage('Error loading recipes', 'error');
    }
}

async function loadRecentRecipes() {
    try {
        const response = await fetch('/api/recipes.php?action=list');
        const data = await response.json();
        
        if (data.success && data.recipes.length > 0) {
            const latest = data.recipes[0];
            document.getElementById('recipe-content').innerHTML = `
                <div class="recipe-preview">
                    <h3>Latest: ${escapeHtml(latest.name)}</h3>
                    <p>Added by ${escapeHtml(latest.author_name)}</p>
                    <a href="#" onclick="viewRecipe(${latest.id})">View Recipe & History</a>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading recent recipes:', error);
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
                '<ul>' + ingredients.map(ing => `<li>${escapeHtml(ing.trim())}</li>`).join('') + '</ul>';
            
            document.getElementById('recipe-instructions-text').textContent = recipe.instructions;
            
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
    showModal('recipe-note-modal');
}

// Message board functions
async function loadRecentMessages() {
    try {
        const response = await fetch('/api/messages.php?action=list');
        const data = await response.json();
        
        if (data.success) {
            const container = document.getElementById('recent-messages');
            container.innerHTML = data.messages.map(message => `
                <div class="message-item">
                    <div class="message-header">
                        <span class="author">${escapeHtml(message.author_name)}</span>
                        <span class="timestamp">${formatDate(message.created_at)}</span>
                    </div>
                    <div class="message-content">
                        <h4>${escapeHtml(message.subject)}</h4>
                        <p>${escapeHtml(message.content)}</p>
                        ${message.reply_count > 0 ? `<small>${message.reply_count} replies</small>` : ''}
                    </div>
                </div>
            `).join('');
        } else {
            showMessage('Error loading messages: ' + data.error, 'error');
        }
    } catch (error) {
        showMessage('Error loading messages', 'error');
    }
}

function showNewMessage() {
    document.getElementById('message-form').reset();
    showModal('message-modal');
}

// Contact functions
async function loadContacts() {
    try {
        // For now, load from PHP session or static data
        const contacts = [
            { display_name: 'Uncle Mike', email: 'mike@email.com' },
            { display_name: 'Aunt Sarah', email: 'sarah@email.com' },
            { display_name: 'Cousin Jenny', email: 'jenny@email.com' }
        ];
        
        const container = document.getElementById('contact-list');
        container.innerHTML = contacts.map(contact => `
            <div class="contact-item">
                <div>
                    <div class="contact-name">${escapeHtml(contact.display_name)}</div>
                    <div class="contact-info">${escapeHtml(contact.email)}</div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading contacts:', error);
    }
}

function loadRecentPhotos() {
    const container = document.getElementById('recent-photos');
    container.innerHTML = `
        <p>Recent uploads:</p>
        <ul>
            <li>BBQ Summer 2024 (12 photos)</li>
            <li>Sarah's Birthday (8 photos)</li>
            <li>Family Game Night (5 photos)</li>
        </ul>
        <p style="margin-top: 1rem;"><small>Want to add photos? Email them to photos@reedweave.family</small></p>
    `;
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
            loadRecentRecipes();
        } else {
            showMessage('Error: ' + result.error, 'error');
        }
    } catch (error) {
        showMessage('Error saving recipe', 'error');
    }
});

document.getElementById('message-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const data = {
        subject: document.getElementById('message-subject').value,
        content: document.getElementById('message-content').value
    };
    
    try {
        const response = await fetch('/api/messages.php?action=add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Message posted successfully!', 'success');
            closeModal();
            loadRecentMessages();
        } else {
            showMessage('Error: ' + result.error, 'error');
        }
    } catch (error) {
        showMessage('Error posting message', 'error');
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
    }
});

// Contact search
document.getElementById('contact-search').addEventListener('input', function(e) {
    const query = e.target.value.toLowerCase();
    const contacts = document.querySelectorAll('.contact-item');
    
    contacts.forEach(contact => {
        const name = contact.querySelector('.contact-name').textContent.toLowerCase();
        if (name.includes(query)) {
            contact.style.display = 'flex';
        } else {
            contact.style.display = 'none';
        }
    });
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