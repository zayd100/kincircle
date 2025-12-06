// Family Inbox - Premium Private Messaging System
// Multi-entry point messaging with enterprise-grade features

class FamilyInbox {
    constructor() {
        this.conversations = [];
        this.activeConversation = null;
        this.currentUser = this.getCurrentUser();
        this.familyMembers = [];
        this.selectedRecipients = [];
        this.currentFilter = 'all';
        this.messageRefreshInterval = null;
        this.typingTimeout = null;
        this.messagePollingActive = false;
        
        this.init();
    }
    
    async init() {
        await this.loadFamilyMembers();
        this.setupEventListeners();
        await this.loadConversations();
        this.startMessagePolling();
        this.handleURLParams();
    }
    
    getCurrentUser() {
        // Get user from window.currentUser (set by PHP)
        if (window.currentUser && window.currentUser.id) {
            return {
                id: window.currentUser.id,
                name: window.currentUser.displayName,
                displayName: window.currentUser.displayName,
                isAdmin: window.currentUser.isAdmin
            };
        }
        
        // Fallback - redirect to login if no user session
        console.warn('No user session found');
        return null;
    }
    
    async loadFamilyMembers() {
        try {
            const response = await fetch('/api/family/members.php');
            const data = await response.json();
            
            if (data.success) {
                this.familyMembers = data.members || [];
            } else {
                this.familyMembers = [];
                console.warn('No family members returned from API');
            }
        } catch (error) {
            console.error('Error loading family members:', error);
            this.familyMembers = [];
            this.showNotification('Failed to load family members', 'error');
        }
    }
    
    setupEventListeners() {
        // Compose button
        document.getElementById('composeBtn').addEventListener('click', () => this.openComposeModal());
        
        // Filter tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.setFilter(e.target.closest('.filter-tab').dataset.filter));
        });
        
        // Search
        document.getElementById('messageSearch').addEventListener('input', (e) => {
            this.debounceSearch(e.target.value);
        });
        
        // Compose form
        document.getElementById('composeForm').addEventListener('submit', (e) => this.handleSendMessage(e));
        
        // Recipient input
        const recipientInput = document.getElementById('recipientInput');
        recipientInput.addEventListener('input', (e) => this.handleRecipientSearch(e.target.value));
        recipientInput.addEventListener('focus', () => this.showRecipientSuggestions());
        
        // Quick contact form
        document.getElementById('quickContactForm').addEventListener('submit', (e) => this.handleQuickMessage(e));
        
        // Chat input form
        document.addEventListener('submit', (e) => {
            if (e.target.classList.contains('chat-input-form')) {
                this.handleChatMessage(e);
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
            if (e.key === 'n' && e.ctrlKey) {
                e.preventDefault();
                this.openComposeModal();
            }
        });
        
        // URL parameters for direct messaging
        this.handleURLParams();
    }
    
    handleURLParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('user');
        const composeName = urlParams.get('compose');
        const message = urlParams.get('message');
        
        // Handle user ID parameter
        if (userId) {
            const user = this.familyMembers.find(u => u.id == userId);
            if (user) {
                if (message) {
                    this.openQuickContactModal(user, decodeURIComponent(message));
                } else {
                    this.startConversationWith(user);
                }
            }
        }
        
        // Handle compose parameter from directory
        if (composeName) {
            const user = this.familyMembers.find(u => 
                u.display_name === composeName || 
                u.name === composeName
            );
            if (user) {
                this.startConversationWith(user);
            } else {
                // If user not found, open compose modal with the name pre-filled
                this.openComposeModal();
                setTimeout(() => {
                    document.getElementById('recipientInput').value = composeName;
                    this.handleRecipientSearch(composeName);
                }, 100);
            }
        }
    }
    
    debounceSearch = this.debounce((query) => this.performSearch(query), 300);
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    async loadConversations() {
        try {
            const response = await fetch('/api/inbox/conversations.php');
            const data = await response.json();
            
            if (data.success) {
                this.conversations = data.conversations || [];
            } else {
                this.conversations = [];
                console.warn('No conversations returned from API');
            }
            
            this.renderConversations();
            this.updateCounts();
            
        } catch (error) {
            console.error('Error loading conversations:', error);
            this.conversations = [];
            this.renderConversations();
            this.updateCounts();
            this.showNotification('Failed to load conversations', 'error');
        }
    }
    
    
    renderConversations() {
        const container = document.getElementById('conversationsList');
        container.innerHTML = '';
        
        // Filter conversations
        let filteredConversations = this.filterConversations();
        
        // Sort by last message time (handle string dates)
        filteredConversations.sort((a, b) => {
            const timeA = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
            const timeB = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
            return timeB - timeA;
        });
        
        // Render conversations
        filteredConversations.forEach((conversation, index) => {
            const conversationEl = this.createConversationElement(conversation);
            conversationEl.style.animationDelay = `${index * 0.1}s`;
            container.appendChild(conversationEl);
        });
        
        // Show empty state if no conversations
        if (filteredConversations.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💬</div>
                    <h3>No conversations</h3>
                    <p>Start a new message!</p>
                </div>
            `;
        }
    }
    
    filterConversations() {
        let conversations = [...this.conversations];
        
        switch (this.currentFilter) {
            case 'unread':
                conversations = conversations.filter(c => c.unreadCount > 0);
                break;
            case 'starred':
                conversations = conversations.filter(c => c.isStarred);
                break;
            case 'all':
            default:
                conversations = conversations.filter(c => !c.isArchived);
                break;
        }
        
        return conversations;
    }
    
    createConversationElement(conversation) {
        const div = document.createElement('div');
        div.className = `conversation-item ${conversation.unreadCount > 0 ? 'unread' : ''} ${this.activeConversation?.id === conversation.id ? 'active' : ''}`;
        div.onclick = () => this.openConversation(conversation);

        const currentUserId = this.currentUser?.id;
        const otherParticipants = (conversation.participants || []).filter(p => p.id !== currentUserId);
        const isGroup = conversation.type === 'group';
        const displayName = isGroup ? conversation.name : (otherParticipants[0]?.name || conversation.name || 'Unknown');
        const avatar = isGroup ? '👥' : (otherParticipants[0]?.initials || displayName?.charAt(0)?.toUpperCase() || '?');
        const status = isGroup ? null : otherParticipants[0]?.status;

        const participantsList = isGroup
            ? otherParticipants.slice(0, 3).map(p => p.name).join(', ') + (otherParticipants.length > 3 ? '...' : '')
            : otherParticipants[0]?.name || '';

        const lastMessage = conversation.lastMessage || {};
        const isFromMe = currentUserId && lastMessage.senderId == currentUserId;

        div.innerHTML = `
            <div class="conversation-header">
                <div class="conversation-avatar ${isGroup ? 'group' : 'single'}">
                    ${avatar}
                    ${status && !isGroup ? `<div class="status-indicator ${status}"></div>` : ''}
                </div>
                <div class="conversation-info">
                    <div class="conversation-name">${displayName}</div>
                    ${isGroup ? `<div class="conversation-participants">${participantsList}</div>` : ''}
                </div>
                <div class="conversation-time">${this.formatTime(lastMessage.timestamp)}</div>
            </div>
            <div class="conversation-preview ${conversation.unreadCount > 0 ? 'unread' : ''}">
                ${isFromMe ? 'You: ' : ''}${lastMessage.content || ''}
            </div>
        `;

        return div;
    }
    
    formatTime(dateInput) {
        if (!dateInput) return '';

        // Convert string to Date if needed
        const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

        // Check if date is valid
        if (isNaN(date.getTime())) return '';

        const now = new Date();
        const diff = now - date;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);

        if (diff < 1000 * 60) return 'just now';
        if (hours < 1) return `${Math.floor(diff / (1000 * 60))}m`;
        if (hours < 24) return `${hours}h`;
        if (days < 7) return `${days}d`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    }
    
    updateCounts() {
        const allCount = this.conversations.filter(c => !c.isArchived).length;
        const unreadCount = this.conversations.filter(c => c.unreadCount > 0).length;
        const starredCount = this.conversations.filter(c => c.isStarred).length;
        
        // Safely update counts, checking if elements exist first
        const allCountEl = document.getElementById('allCount');
        const unreadCountEl = document.getElementById('unreadCount');
        const starredCountEl = document.getElementById('starredCount');
        const unreadBadgeEl = document.getElementById('unreadBadge');
        
        if (allCountEl) allCountEl.textContent = allCount;
        if (unreadCountEl) unreadCountEl.textContent = unreadCount;
        if (starredCountEl) starredCountEl.textContent = starredCount;
        
        // unreadBadge is optional (might be in header for global unread count)
        if (unreadBadgeEl) {
            unreadBadgeEl.textContent = unreadCount;
            unreadBadgeEl.style.display = unreadCount > 0 ? 'block' : 'none';
        }
    }
    
    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update UI
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.filter === filter);
        });
        
        this.renderConversations();
    }
    
    performSearch(query) {
        // Implementation for search functionality
        console.log('Searching for:', query);
    }
    
    closeConversation() {
        this.activeConversation = null;

        // Remove active class from inbox container (for mobile slide behavior)
        document.querySelector('.inbox-container').classList.remove('conversation-open');

        // Reset chat area to welcome state
        const chatArea = document.getElementById('chatArea');
        chatArea.innerHTML = `
            <div class="chat-welcome">
                <div class="welcome-content">
                    <div class="welcome-icon">💝</div>
                    <h2>Welcome to Your Family Inbox</h2>
                    <p>Stay connected with private conversations</p>
                    <p class="welcome-subtitle">Select a conversation or start a new message</p>
                </div>
            </div>
        `;

        // Update conversation list UI
        this.renderConversations();
    }

    openConversation(conversation) {
        this.activeConversation = conversation;

        // Add class for mobile slide behavior
        document.querySelector('.inbox-container').classList.add('conversation-open');
        
        // Mark as read
        if (conversation.unreadCount > 0) {
            conversation.unreadCount = 0;
            this.updateCounts();
        }
        
        // Update conversation list UI
        this.renderConversations();
        
        // Render chat area
        this.renderChatArea(conversation);
    }
    
    async renderChatArea(conversation) {
        const chatArea = document.getElementById('chatArea');
        const currentUserId = this.currentUser?.id;
        const otherParticipants = (conversation.participants || []).filter(p => p.id !== currentUserId);
        const isGroup = conversation.type === 'group';
        const displayName = isGroup ? conversation.name : (otherParticipants[0]?.name || conversation.name || 'Unknown');
        const status = isGroup ? `${otherParticipants.length} members` : otherParticipants[0]?.status || 'offline';
        
        // Show loading state first
        chatArea.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading conversation...</p>
            </div>
        `;
        
        // Load messages from API
        const messages = await this.loadConversationMessages(conversation.id);
        
        chatArea.innerHTML = `
            <div class="chat-header">
                <div class="chat-participant-info">
                    <div class="chat-avatar">
                        ${isGroup ? '👥' : otherParticipants[0]?.initials || '?'}
                        ${!isGroup && otherParticipants[0]?.status === 'online' ? '<div class="status-indicator online"></div>' : ''}
                    </div>
                    <div class="chat-participant-details">
                        <h3>${displayName}</h3>
                        <div class="chat-status">
                            ${!isGroup && otherParticipants[0]?.status === 'online' ? '<div class="chat-status-dot"></div>' : ''}
                            <span>${status}</span>
                        </div>
                    </div>
                </div>
                <div class="chat-actions">
                    <button class="chat-action-btn back-to-list" title="Back to messages" onclick="inbox.closeConversation()">←</button>
                </div>
            </div>
            
            <div class="chat-messages" id="chatMessages">
                ${messages.map(msg => this.createMessageHTML(msg)).join('')}
            </div>
            
            <div class="chat-input-container">
                <form class="chat-input-form" onsubmit="inbox.handleChatMessage(event)">
                    <textarea class="chat-input" 
                              placeholder="Type your message..." 
                              rows="1"
                              id="chatInput"
                              onkeydown="inbox.handleChatInputKeydown(event)"></textarea>
                    <button type="submit" class="send-btn" id="sendBtn">
                        <span>📤</span>
                    </button>
                </form>
            </div>
        `;
        
        // Auto-resize chat input
        const chatInput = document.getElementById('chatInput');
        chatInput.addEventListener('input', this.autoResizeTextarea.bind(this));
        
        // Scroll to bottom
        setTimeout(() => {
            const messagesContainer = document.getElementById('chatMessages');
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
    }
    
    async loadConversationMessages(conversationId) {
        try {
            const response = await fetch(`/api/inbox/messages.php?conversation_id=${conversationId}`);
            const data = await response.json();
            
            if (data.success) {
                return data.messages || [];
            } else {
                console.warn('No messages returned from API');
                return [];
            }
        } catch (error) {
            console.error('Error loading conversation messages:', error);
            return [];
        }
    }
    
    
    createMessageHTML(message) {
        const currentUserId = this.currentUser?.id;
        const isFromCurrentUser = currentUserId && message.senderId == currentUserId;
        const messageClass = isFromCurrentUser ? 'sent' : 'received';

        return `
            <div class="message ${messageClass}">
                <div class="message-content">${message.content || ''}</div>
                <div class="message-time">${this.formatTime(message.timestamp)}</div>
            </div>
        `;
    }
    
    autoResizeTextarea(event) {
        const textarea = event.target;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
    
    handleChatInputKeydown(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.handleChatMessage(event);
        }
    }
    
    async handleChatMessage(event) {
        event.preventDefault();
        
        const form = event.target.closest('.chat-input-form');
        const input = form.querySelector('.chat-input');
        const content = input.value.trim();
        
        if (!content || !this.activeConversation) return;
        
        try {
            // Add message to UI immediately
            const message = {
                id: Date.now(),
                content: content,
                senderId: this.currentUser.id,
                senderName: this.currentUser.name,
                timestamp: new Date(),
                isRead: false
            };
            
            this.addMessageToChat(message);
            
            // Update conversation last message
            this.activeConversation.lastMessage = {
                id: message.id,
                content: content,
                senderId: this.currentUser.id,
                timestamp: message.timestamp,
                isRead: false
            };
            
            this.renderConversations();
            
            // Clear input
            input.value = '';
            input.style.height = 'auto';
            
            // Send to API
            const response = await fetch('/api/inbox/send.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversationId: this.activeConversation.id,
                    content: content
                })
            });
            
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message || 'Failed to send message');
            }
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.showNotification('Failed to send message', 'error');
        }
    }
    
    addMessageToChat(message) {
        const messagesContainer = document.getElementById('chatMessages');
        const messageHTML = this.createMessageHTML(message);
        messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    openComposeModal() {
        const modal = document.getElementById('composeModal');
        modal.classList.add('active');
        modal.style.display = 'flex';
        document.getElementById('recipientInput').focus();
        this.selectedRecipients = [];
        this.renderSelectedRecipients();
    }

    closeComposeModal() {
        const modal = document.getElementById('composeModal');
        modal.classList.remove('active');
        modal.style.display = 'none';
        document.getElementById('composeForm').reset();
        this.selectedRecipients = [];
        this.hideRecipientSuggestions();
    }
    
    handleRecipientSearch(query) {
        if (!query.trim()) {
            this.hideRecipientSuggestions();
            return;
        }
        
        const suggestions = this.familyMembers.filter(member => 
            member.name.toLowerCase().includes(query.toLowerCase()) &&
            !this.selectedRecipients.find(r => r.id === member.id)
        );
        
        this.showRecipientSuggestions(suggestions);
    }
    
    showRecipientSuggestions(suggestions = this.familyMembers) {
        const container = document.getElementById('recipientSuggestions');
        container.innerHTML = '';
        
        const availableMembers = suggestions.filter(member => 
            !this.selectedRecipients.find(r => r.id === member.id)
        );
        
        availableMembers.forEach(member => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.onclick = () => this.selectRecipient(member);
            
            div.innerHTML = `
                <div class="suggestion-avatar">${member.initials}</div>
                <div class="suggestion-info">
                    <div class="suggestion-name">${member.name}</div>
                    <div class="suggestion-relationship">${member.relationship}</div>
                </div>
            `;
            
            container.appendChild(div);
        });
        
        container.style.display = availableMembers.length > 0 ? 'block' : 'none';
    }
    
    hideRecipientSuggestions() {
        document.getElementById('recipientSuggestions').style.display = 'none';
    }
    
    selectRecipient(member) {
        this.selectedRecipients.push(member);
        document.getElementById('recipientInput').value = '';
        this.renderSelectedRecipients();
        this.hideRecipientSuggestions();
    }
    
    renderSelectedRecipients() {
        const container = document.getElementById('selectedRecipients');
        container.innerHTML = '';
        
        this.selectedRecipients.forEach(recipient => {
            const div = document.createElement('div');
            div.className = 'recipient-tag';
            div.innerHTML = `
                <span>${recipient.name}</span>
                <button type="button" class="remove-recipient" onclick="inbox.removeRecipient(${recipient.id})">&times;</button>
            `;
            container.appendChild(div);
        });
    }
    
    removeRecipient(recipientId) {
        this.selectedRecipients = this.selectedRecipients.filter(r => r.id !== recipientId);
        this.renderSelectedRecipients();
    }
    
    async handleSendMessage(event) {
        event.preventDefault();
        
        const formData = {
            recipients: this.selectedRecipients.map(r => r.id),
            subject: document.getElementById('messageSubject').value,
            content: document.getElementById('messageContent').value,
            isImportant: document.getElementById('markImportant').checked,
            requestReadReceipt: document.getElementById('requestReadReceipt').checked
        };
        
        if (formData.recipients.length === 0 || !formData.content.trim()) {
            this.showNotification('Please select recipients and enter a message', 'error');
            return;
        }
        
        try {
            // Send to API
            const response = await fetch('/api/inbox/compose.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Reload conversations to get the latest data
                await this.loadConversations();
                this.closeComposeModal();
                
                // Open the new conversation if returned by API
                if (result.conversation) {
                    const newConversation = this.conversations.find(c => c.id === result.conversation.id);
                    if (newConversation) {
                        this.openConversation(newConversation);
                    }
                }
                
                this.showNotification('Message sent successfully!', 'success');
            } else {
                throw new Error(result.message || 'Failed to send message');
            }
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.showNotification('Failed to send message', 'error');
        }
    }
    
    openQuickContactModal(user, prefilledMessage = '') {
        const modal = document.getElementById('quickContactModal');
        modal.classList.add('active');
        modal.style.display = 'flex';
        
        // Populate user info
        document.getElementById('quickContactInfo').innerHTML = `
            <div class="quick-contact-avatar">${user.initials}</div>
            <div class="quick-contact-details">
                <h3>${user.name}</h3>
                <p>${user.relationship}</p>
            </div>
        `;
        
        // Prefill message if provided
        document.getElementById('quickMessage').value = prefilledMessage;
        document.getElementById('quickMessage').focus();
        
        // Store user for form submission
        this.quickContactUser = user;
    }
    
    closeQuickContactModal() {
        const modal = document.getElementById('quickContactModal');
        modal.classList.remove('active');
        modal.style.display = 'none';
        document.getElementById('quickContactForm').reset();
        this.quickContactUser = null;
    }
    
    async handleQuickMessage(event) {
        event.preventDefault();
        
        const content = document.getElementById('quickMessage').value.trim();
        if (!content || !this.quickContactUser) return;
        
        try {
            // Send quick message to API
            const response = await fetch('/api/inbox/quick-message.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipientId: this.quickContactUser.id,
                    content: content
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Reload conversations to get the latest data
                await this.loadConversations();
                this.closeQuickContactModal();
                
                // Open the conversation if returned by API
                if (result.conversation) {
                    const conversation = this.conversations.find(c => c.id === result.conversation.id);
                    if (conversation) {
                        this.openConversation(conversation);
                    }
                }
                
                this.showNotification('Message sent!', 'success');
            } else {
                throw new Error(result.message || 'Failed to send message');
            }
            
        } catch (error) {
            console.error('Error sending quick message:', error);
            this.showNotification('Failed to send message', 'error');
        }
    }
    
    startConversationWith(user) {
        // Find existing conversation
        let conversation = this.conversations.find(c => 
            c.type === 'individual' && 
            c.participants.some(p => p.id === user.id)
        );
        
        if (conversation) {
            this.openConversation(conversation);
        } else {
            // Create new conversation
            this.selectedRecipients = [user];
            this.openComposeModal();
        }
    }
    
    startMessagePolling() {
        // Poll for new messages every 10 seconds
        this.messageRefreshInterval = setInterval(() => {
            if (!this.messagePollingActive) {
                this.loadConversations();
            }
        }, 10000);
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 2rem;
            right: 2rem;
            background: ${type === 'error' ? '#fee2e2' : type === 'success' ? '#d1fae5' : '#dbeafe'};
            color: ${type === 'error' ? '#991b1b' : type === 'success' ? '#065f46' : '#1e40af'};
            padding: 1rem 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 9999;
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    closeAllModals() {
        this.closeComposeModal();
        this.closeQuickContactModal();
    }
    
    destroy() {
        if (this.messageRefreshInterval) {
            clearInterval(this.messageRefreshInterval);
        }
    }
}

// Global functions for inline event handlers
window.openQuickContact = function(userId, message = '') {
    const user = inbox.familyMembers.find(u => u.id == userId);
    if (user) {
        inbox.openQuickContactModal(user, message);
    }
};

window.startConversation = function(userId) {
    const user = inbox.familyMembers.find(u => u.id == userId);
    if (user) {
        inbox.startConversationWith(user);
    }
};

// Modal functions now provided by unified-modal.js

// Initialize the inbox
let inbox;
document.addEventListener('DOMContentLoaded', () => {
    inbox = new FamilyInbox();
});

// Add animations to stylesheet
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .empty-state {
        text-align: center;
        padding: 3rem 1rem;
        color: #6b7280;
    }
    
    .empty-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
        opacity: 0.5;
    }
`;
document.head.appendChild(style);