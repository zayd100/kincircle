// Messages page functionality

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadAllMessages();
});

// Modal management
function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

// Message functions
async function loadAllMessages() {
    try {
        const response = await fetch('/api/messages.php?action=list');
        const data = await response.json();
        
        if (data.success) {
            const container = document.getElementById('message-list');
            if (data.messages.length === 0) {
                container.innerHTML = `
                    <div class="item">
                        <h3>No messages yet</h3>
                        <p>Start the conversation by posting the first message!</p>
                    </div>
                `;
            } else {
                container.innerHTML = data.messages.map(message => `
                    <div class="item">
                        <h3>${escapeHtml(message.subject)}</h3>
                        <div class="item-meta">
                            Posted by ${escapeHtml(message.author_name)} • ${formatDate(message.created_at)}
                            ${message.reply_count > 0 ? `• ${message.reply_count} replies` : ''}
                        </div>
                        <div class="item-content">
                            <p>${escapeHtml(message.content)}</p>
                        </div>
                    </div>
                `).join('');
            }
        } else {
            showMessage('Error loading messages: ' + data.error, 'error');
        }
    } catch (error) {
        showMessage('Error loading messages', 'error');
        console.error('Error:', error);
    }
}

function showNewMessage() {
    document.getElementById('message-form').reset();
    showModal('message-modal');
}

// Form submission
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
            loadAllMessages();
        } else {
            showMessage('Error: ' + result.error, 'error');
        }
    } catch (error) {
        showMessage('Error posting message', 'error');
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