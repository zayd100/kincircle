// Reed & Weave Family Hub - Main App

// Family password for validation (change this regularly)
const FAMILY_PASSWORD = 'reunion2024'; // Change this password regularly

// Global state
let currentAction = null;
let pendingData = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    loadRecentMessages();
    loadContacts();
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
    currentAction = null;
    pendingData = null;
}

// Family password validation
function requirePassword(action, data = null) {
    currentAction = action;
    pendingData = data;
    showModal('password-modal');
}

function validateAndSubmit() {
    const password = document.getElementById('family-password').value;
    
    if (password === FAMILY_PASSWORD) {
        closeModal();
        executeAction(currentAction, pendingData);
        document.getElementById('family-password').value = '';
    } else {
        showMessage('Incorrect family password. Ask any family member for help.', 'error');
    }
}

function executeAction(action, data) {
    switch(action) {
        case 'addRecipe':
            submitRecipe(data);
            break;
        case 'addMessage':
            submitMessage(data);
            break;
        case 'addRecipeNote':
            submitRecipeNote(data);
            break;
    }
}

// Recipe functions
function showAddRecipe() {
    document.getElementById('recipe-form-title').textContent = 'Add New Recipe';
    document.getElementById('recipe-form').reset();
    showModal('recipe-modal');
}

function showRecipes() {
    // Load and display all recipes
    const content = document.getElementById('recipe-content');
    content.innerHTML = `
        <div class="recipe-list">
            <div class="recipe-preview">
                <h3>Grandma's Chili</h3>
                <p>Base recipe by Grandma Rose</p>
                <p>3 modifications by family members</p>
                <a href="#" onclick="viewRecipe('chili')">View Recipe & History</a>
            </div>
            <div class="recipe-preview">
                <h3>Uncle Mike's BBQ Sauce</h3>
                <p>Added by Uncle Mike</p>
                <p>1 modification</p>
                <a href="#" onclick="viewRecipe('bbq')">View Recipe & History</a>
            </div>
        </div>
    `;
}

function viewRecipe(recipeId) {
    // Load recipe details with version history
    const recipe = getRecipeData(recipeId);
    
    document.getElementById('recipe-detail-name').textContent = recipe.name;
    document.getElementById('recipe-ingredients-list').innerHTML = 
        '<ul>' + recipe.ingredients.map(ing => `<li>${ing}</li>`).join('') + '</ul>';
    document.getElementById('recipe-instructions-text').textContent = recipe.instructions;
    
    // Load recipe history
    const historyHtml = recipe.history.map(change => `
        <div class="recipe-change">
            <div class="author">${change.author}</div>
            <div class="date">${change.date}</div>
            <div class="change">${change.note}</div>
        </div>
    `).join('');
    
    document.getElementById('recipe-changes').innerHTML = historyHtml;
    showModal('recipe-detail');
}

function addRecipeNote() {
    const recipeId = getCurrentRecipeId(); // Get from context
    const noteData = {
        recipeId: recipeId,
        type: 'note'
    };
    requirePassword('addRecipeNote', noteData);
}

// Message board functions
function showNewMessage() {
    document.getElementById('message-form').reset();
    showModal('message-modal');
}

function loadRecentMessages() {
    const container = document.getElementById('recent-messages');
    container.innerHTML = `
        <div class="message-item">
            <div class="message-header">
                <span class="author">Uncle Mike</span>
                <span class="timestamp">2 hours ago</span>
            </div>
            <div class="message-content">
                <h4>BBQ next weekend</h4>
                <p>Who's bringing what? I'll handle burgers and dogs.</p>
            </div>
        </div>
        <div class="message-item">
            <div class="message-header">
                <span class="author">Aunt Sarah</span>
                <span class="timestamp">1 day ago</span>
            </div>
            <div class="message-content">
                <h4>Recipe update</h4>
                <p>Updated the chili recipe - use half the cayenne, it was too spicy last time!</p>
            </div>
        </div>
    `;
}

function loadContacts() {
    const container = document.getElementById('contact-list');
    const contacts = [
        { name: 'Uncle Mike', phone: '(555) 123-4567', email: 'mike@email.com' },
        { name: 'Aunt Sarah', phone: '(555) 234-5678', email: 'sarah@email.com' },
        { name: 'Cousin Jenny', phone: '(555) 345-6789', email: 'jenny@email.com' }
    ];
    
    container.innerHTML = contacts.map(contact => `
        <div class="contact-item">
            <div>
                <div class="contact-name">${contact.name}</div>
                <div class="contact-info">${contact.phone} • ${contact.email}</div>
            </div>
        </div>
    `).join('');
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
        <p style="margin-top: 1rem;"><small>Want to add photos? Email them to cc@zyzd.cc</small></p>
    `;
}

function suggestContactUpdate() {
    showMessage('Email contact updates to: cc@zyzd.cc', 'success');
}

// Form submissions
document.getElementById('recipe-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const data = {
        name: document.getElementById('recipe-name').value,
        ingredients: document.getElementById('recipe-ingredients').value.split('\n').filter(line => line.trim()),
        instructions: document.getElementById('recipe-instructions').value,
        author: document.getElementById('recipe-author').value,
        notes: document.getElementById('recipe-notes').value
    };
    
    requirePassword('addRecipe', data);
});

document.getElementById('message-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const data = {
        author: document.getElementById('message-author').value,
        subject: document.getElementById('message-subject').value,
        content: document.getElementById('message-content').value
    };
    
    requirePassword('addMessage', data);
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

// Data submission functions
function submitRecipe(data) {
    // In a real app, this would save to a backend
    console.log('Saving recipe:', data);
    showMessage('Recipe added successfully!', 'success');
    closeModal();
    
    // Update recipe display
    showRecipes();
}

function submitMessage(data) {
    // In a real app, this would save to a backend
    console.log('Saving message:', data);
    showMessage('Message posted successfully!', 'success');
    closeModal();
    
    // Reload messages
    loadRecentMessages();
}

function submitRecipeNote(data) {
    // In a real app, this would add to recipe history
    console.log('Adding recipe note:', data);
    showMessage('Recipe note added!', 'success');
    closeModal();
}

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

function getRecipeData(recipeId) {
    // Mock data - replace with actual data loading
    const recipes = {
        'chili': {
            name: 'Grandma\'s Chili',
            ingredients: [
                '2 lbs ground beef',
                '1 onion, diced',
                '2 cans kidney beans',
                '1 can tomato sauce',
                '2 tbsp chili powder',
                '1 tsp cayenne pepper (use 1/2 tsp - Sarah\'s note)',
                'Salt and pepper to taste'
            ],
            instructions: 'Brown the beef with onion. Add remaining ingredients and simmer for 2 hours. Serve with cornbread.',
            history: [
                {
                    author: 'Grandma Rose',
                    date: '1985-01-01',
                    note: 'Original recipe'
                },
                {
                    author: 'Aunt Sarah',
                    date: '2024-01-15',
                    note: 'Reduced cayenne pepper - was too spicy for the kids'
                },
                {
                    author: 'Uncle Mike',
                    date: '2024-02-01',
                    note: 'Added note about serving with cornbread'
                }
            ]
        }
    };
    
    return recipes[recipeId] || {};
}

function getCurrentRecipeId() {
    // In a real app, this would track the currently viewed recipe
    return 'chili';
}

// Initialize calendar
function initCalendar() {
    // This will be handled by calendar.js
    const today = new Date();
    document.getElementById('calendar-month').textContent = 
        today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}