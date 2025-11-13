// Family Message Board - Where conversations come to life
// Premium messaging experience with enterprise-grade features

class FamilyMessageBoard {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.threads = [];
        this.selectedThread = null;
        this.selectedCategory = 'general';
        this.currentUser = this.getCurrentUser();
        this.refreshInterval = null;
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        await this.loadThreads();
        // Auto-refresh disabled for family comfort - family members can manually refresh
        // this.startAutoRefresh();
        
        // Show the board after loading
        setTimeout(() => {
            document.getElementById('boardLoading').style.display = 'none';
            document.getElementById('boardContainer').style.display = 'block';
        }, 1000);
    }
    
    getCurrentUser() {
        // Get user from global window object set by PHP
        try {
            // First check if boardData has currentUser
            if (window.boardData && window.boardData.currentUser) {
                return window.boardData.currentUser;
            }
            
            // Fallback to global currentUser
            if (window.currentUser) {
                return window.currentUser;
            }
            
            // Try sessionStorage as last resort
            const sessionUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
            if (sessionUser) {
                return sessionUser;
            }
            
            console.warn('No user session found');
            return null;
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    }
    
    setupEventListeners() {
        // New thread button
        const newThreadBtn = document.getElementById('newThreadBtn');
        console.log('New thread button found:', !!newThreadBtn);
        if (newThreadBtn) {
            newThreadBtn.addEventListener('click', (e) => {
                console.log('New thread button clicked!', e);
                e.preventDefault();
                e.stopPropagation();
                this.openNewThreadModal();
            });
        }
        
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target.closest('.filter-btn');
                if (target && target.dataset.filter) {
                    this.setFilter(target.dataset.filter);
                }
            });
        });
        
        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.debounceSearch();
        });
        
        // Search icon click
        const searchIcon = document.querySelector('.search-icon');
        if (searchIcon) {
            searchIcon.addEventListener('click', () => this.performSearch());
        }
        
        // New thread form
        document.getElementById('newThreadForm').addEventListener('submit', (e) => this.handleNewThread(e));
        
        // Category selection - now using radio buttons
        document.querySelectorAll('input[name="threadCategory"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                // Update visual state
                document.querySelectorAll('.category-option').forEach(label => label.classList.remove('active'));
                const selectedLabel = document.querySelector(`label[for="${e.target.id}"]`);
                if (selectedLabel) {
                    selectedLabel.classList.add('active');
                }
                this.selectedCategory = e.target.value;
            });
        });
        
        // Character counters
        document.getElementById('threadTitle').addEventListener('input', (e) => {
            document.getElementById('titleCharCount').textContent = `${e.target.value.length}/200`;
        });
        
        document.getElementById('threadContent').addEventListener('input', (e) => {
            document.getElementById('contentCharCount').textContent = `${e.target.value.length}/5000`;
        });
        
        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    if (window.queuedModal) {
                        window.queuedModal.close(modal.id);
                    } else {
                        modal.classList.remove('active');
                        modal.style.display = 'none';
                    }
                }
            });
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
            if (e.key === 'n' && e.ctrlKey) {
                e.preventDefault();
                this.openNewThreadModal();
            }
        });
    }
    
    debounceSearch = this.debounce(() => this.performSearch(), 300);
    
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
    
    async loadThreads() {
        try {
            // Use data passed from PHP if available
            if (window.boardData && window.boardData.threads) {
                this.threads = this.processThreadsData(window.boardData.threads);
                this.renderThreads();
                return;
            }
            
            // Fallback to API if PHP data not available
            const response = await fetch('/api/messages.php?action=threads');
            if (!response.ok) {
                throw new Error('Failed to fetch threads');
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.threads = this.processThreadsData(data.threads || []);
            } else {
                this.threads = [];
                console.warn('No threads returned from API');
            }
            
            this.renderThreads();
        } catch (error) {
            console.error('Error loading threads:', error);
            this.threads = [];
            this.renderThreads();
            this.showNotification('Failed to load conversations', 'error');
        }
    }
    
    processThreadsData(rawThreads) {
        // Convert PHP thread data to expected format
        return rawThreads.map(thread => ({
            id: thread.id,
            title: thread.title,
            content: thread.content,
            author: {
                name: thread.author_name || 'Unknown',
                initials: this.getInitials(thread.author_name)
            },
            category: thread.category || 'general',
            createdAt: thread.created_at,
            lastActivity: thread.last_reply_time || thread.created_at,
            replyCount: parseInt(thread.reply_count) || 0,
            viewCount: parseInt(thread.view_count) || 0,
            isPinned: thread.is_pinned === 1,
            isLocked: thread.is_locked === 1
        }));
    }
    
    getInitials(name) {
        if (!name) return '?';
        return name.split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }
    
    
    renderThreads() {
        const container = document.getElementById('threadsList');
        container.innerHTML = '';
        
        // Filter and search
        let filteredThreads = this.filterThreads();
        
        // Sort: pinned first, then by last activity
        filteredThreads.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return b.lastActivity - a.lastActivity;
        });
        
        // Pagination
        const startIdx = (this.currentPage - 1) * this.itemsPerPage;
        const endIdx = startIdx + this.itemsPerPage;
        const pageThreads = filteredThreads.slice(startIdx, endIdx);
        
        // Render threads
        pageThreads.forEach((thread, index) => {
            const threadEl = this.createThreadElement(thread);
            threadEl.style.animationDelay = `${index * 0.1}s`;
            container.appendChild(threadEl);
        });
        
        // Render pagination
        this.renderPagination(filteredThreads.length);
        
        // Show empty state if no threads
        if (filteredThreads.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💬</div>
                    <h3>No conversations found</h3>
                    <p>Be the first to start a conversation!</p>
                </div>
            `;
        }
    }
    
    filterThreads() {
        let threads = [...this.threads];
        
        // Apply category filter
        if (this.currentFilter !== 'all') {
            threads = threads.filter(t => t.category === this.currentFilter);
        }
        
        // Apply search
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            threads = threads.filter(t => 
                t.title.toLowerCase().includes(query) ||
                t.content.toLowerCase().includes(query) ||
                t.author.name.toLowerCase().includes(query)
            );
        }
        
        return threads;
    }
    
    createThreadElement(thread) {
        const div = document.createElement('div');
        div.className = `thread-card ${thread.isPinned ? 'pinned' : ''}`;
        div.onclick = () => {
            this.openThreadDetail(thread);
        };
        
        const categoryEmoji = {
            announcements: '📢',
            events: '📅',
            memories: '📸',
            questions: '❓',
            general: '💭'
        };
        
        div.innerHTML = `
            <div class="thread-header">
                <div class="thread-title-group">
                    <h3 class="thread-title">
                        ${thread.isLocked ? '🔒' : ''}
                        ${thread.title}
                    </h3>
                    <div class="thread-meta">
                        <div class="thread-author">
                            <div class="author-avatar">${thread.author.initials}</div>
                            <span>${thread.author.name}</span>
                        </div>
                        <span>•</span>
                        <span>${this.formatTime(thread.createdAt)}</span>
                    </div>
                </div>
                <div class="thread-category ${thread.category}">
                    <span>${categoryEmoji[thread.category]}</span>
                    <span>${thread.category}</span>
                </div>
            </div>
            
            <div class="thread-preview">${thread.content}</div>
            
            <div class="thread-stats">
                <div class="thread-stat">
                    <span class="thread-stat-icon">💬</span>
                    <span class="thread-stat-value">${thread.replyCount}</span>
                    <span>replies</span>
                </div>
                <div class="thread-stat">
                    <span class="thread-stat-icon">👁️</span>
                    <span class="thread-stat-value">${thread.viewCount}</span>
                    <span>views</span>
                </div>
                <div class="thread-stat">
                    <span class="thread-stat-icon">🕐</span>
                    <span>Last activity ${this.formatTime(thread.lastActivity)}</span>
                </div>
            </div>
        `;
        
        return div;
    }
    
    formatTime(dateInput) {
        // Convert string to Date object if needed
        const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return 'Unknown time';
        }
        
        const now = new Date();
        const diff = now - date;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);
        
        if (hours < 1) return 'just now';
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    }
    
    renderPagination(totalItems) {
        const container = document.getElementById('boardPagination');
        container.innerHTML = '';
        
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        
        if (totalPages <= 1) return;
        
        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'page-btn';
        prevBtn.innerHTML = '← Previous';
        prevBtn.disabled = this.currentPage === 1;
        prevBtn.onclick = () => this.goToPage(this.currentPage - 1);
        container.appendChild(prevBtn);
        
        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, startPage + 4);
        
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-btn page-number ${i === this.currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.onclick = () => this.goToPage(i);
            container.appendChild(pageBtn);
        }
        
        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'page-btn';
        nextBtn.innerHTML = 'Next →';
        nextBtn.disabled = this.currentPage === totalPages;
        nextBtn.onclick = () => this.goToPage(this.currentPage + 1);
        container.appendChild(nextBtn);
    }
    
    goToPage(page) {
        this.currentPage = page;
        this.renderThreads();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    setFilter(filter) {
        this.currentFilter = filter;
        this.currentPage = 1;
        
        // Update UI
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        this.renderThreads();
    }
    
    performSearch() {
        this.currentPage = 1;
        this.renderThreads();
    }
    
    openNewThreadModal() {
        console.log('Opening new thread modal...');
        
        // Reset form
        document.getElementById('newThreadForm').reset();
        document.getElementById('titleCharCount').textContent = '0/200';
        document.getElementById('contentCharCount').textContent = '0/5000';
        
        // Reset category selection - radio buttons handle this automatically via form.reset()
        // But we need to sync the visual state
        this.selectedCategory = 'general';
        document.querySelectorAll('.category-option').forEach(label => {
            label.classList.remove('active');
            if (label.getAttribute('data-category') === 'general') {
                label.classList.add('active');
            }
        });
        
        // Hide pinned option for non-admins
        if (!this.currentUser.isAdmin) {
            document.getElementById('threadPinned').parentElement.style.display = 'none';
        }
        
        // USE UNIVERSAL QUEUE SYSTEM WITH FALLBACK
        if (window.queuedModal) {
            console.log('Using queued modal system');
            window.queuedModal.open('newThreadModal', {
                focusElement: '#threadTitle'
            });
        } else {
            console.log('Queue system not available, using direct modal');
            // Direct fallback
            const modal = document.getElementById('newThreadModal');
            if (modal) {
                modal.classList.add('active');
                modal.style.display = 'flex';
            }
        }
    }
    
    closeNewThreadModal() {
        console.log('Closing new thread modal...');
        
        // USE UNIVERSAL QUEUE SYSTEM WITH FALLBACK
        if (window.queuedModal) {
            window.queuedModal.close('newThreadModal');
        } else {
            // Direct fallback
            const modal = document.getElementById('newThreadModal');
            if (modal) {
                modal.classList.remove('active');
                modal.style.display = 'none';
            }
        }
    }
    
    async handleNewThread(e) {
        e.preventDefault();
        
        const formData = {
            title: document.getElementById('threadTitle').value,
            category: document.getElementById('threadCategory').value,
            content: document.getElementById('threadContent').value,
            isPinned: document.getElementById('threadPinned').checked && this.currentUser.isAdmin
        };
        
        try {
            // Send to API
            const response = await fetch('/api/messages.php?action=add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: formData.title,
                    content: formData.content
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Reload threads to get the latest data
                await this.loadThreads();
                this.closeNewThreadModal();
                this.showNotification('Conversation posted successfully!', 'success');
            } else {
                throw new Error(result.message || 'Failed to create thread');
            }
            
        } catch (error) {
            console.error('Error creating thread:', error);
            this.showNotification('Failed to post conversation', 'error');
        }
    }
    
    async openThreadDetail(thread) {
        this.selectedThread = thread;
        const modal = document.getElementById('threadDetailModal');
        const content = document.getElementById('threadDetailContent');
        
        // Show loading state immediately
        content.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading conversation...</p>
            </div>
        `;
        
        // USE UNIVERSAL QUEUE SYSTEM - NO MORE RACE CONDITIONS
        window.queuedModal.open('threadDetailModal');
        
        // Mock incrementing view count
        thread.viewCount++;
        
        // Load replies from API
        setTimeout(async () => {
            const replies = await this.loadThreadReplies(thread.id);
            
            content.innerHTML = `
            <div class="thread-detail-header">
                <button class="modal-close">&times;</button>
                <h2 class="thread-detail-title">${thread.title}</h2>
                <div class="thread-meta">
                    <div class="thread-author">
                        <div class="author-avatar">${thread.author.initials}</div>
                        <span>${thread.author.name}</span>
                    </div>
                    <span>•</span>
                    <span>${this.formatTime(thread.createdAt)}</span>
                    <span>•</span>
                    <div class="thread-category ${thread.category}">
                        <span>${thread.category}</span>
                    </div>
                </div>
            </div>
            
            <div class="thread-detail-content">${thread.content}</div>
            
            ${this.currentUser.isAdmin && !thread.isLocked ? `
                <div class="thread-actions">
                    <button class="btn-secondary" onclick="messageBoard.toggleThreadLock(${thread.id})">
                        ${thread.isLocked ? 'Unlock Thread' : 'Lock Thread'}
                    </button>
                    <button class="btn-secondary" onclick="messageBoard.deleteThread(${thread.id})">
                        Delete Thread
                    </button>
                </div>
            ` : ''}
            
            <div class="replies-section">
                <div class="replies-header">
                    <h3 class="replies-title">Replies</h3>
                    <span class="reply-count">${replies.length} replies</span>
                </div>
                
                <div class="replies-list">
                    ${replies.map(reply => this.createReplyHTML(reply)).join('')}
                </div>
                
                ${!thread.isLocked ? `
                    <div class="reply-form-container">
                        <h4 class="reply-form-header">Add Your Reply</h4>
                        <form onsubmit="messageBoard.handleReply(event, ${thread.id})">
                            <textarea id="replyContent" 
                                      name="replyContent"
                                      class="form-textarea reply-textarea" 
                                      placeholder="Share your thoughts..." 
                                      required></textarea>
                            <div class="form-actions">
                                <button type="submit" class="btn-primary">
                                    <span class="btn-icon">💬</span>
                                    Post Reply
                                </button>
                            </div>
                        </form>
                    </div>
                ` : '<p class="thread-locked-message">🔒 This thread is locked</p>'}
            </div>
        `;
            
            // Add event listener for close button since it's dynamically created
            const closeBtn = content.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.onclick = () => this.closeThreadDetail();
            }
        }, 100); // Small delay to show loading spinner briefly
    }
    
    async loadThreadReplies(threadId) {
        try {
            const response = await fetch(`/api/messages/${threadId}/replies`);
            const data = await response.json();
            
            if (data.success) {
                return data.replies || [];
            } else {
                console.warn('No replies returned from API');
                return [];
            }
        } catch (error) {
            console.error('Error loading thread replies:', error);
            return [];
        }
    }
    
    createReplyHTML(reply) {
        return `
            <div class="reply-card">
                <div class="reply-header">
                    <div class="reply-author">
                        <div class="reply-avatar">${reply.author.initials}</div>
                        <span class="reply-author-name">${reply.author.name}</span>
                    </div>
                    <span class="reply-time">
                        ${this.formatTime(reply.createdAt)}
                        ${reply.isEdited ? '<span class="edited-tag">(edited)</span>' : ''}
                    </span>
                </div>
                <div class="reply-content">${reply.content}</div>
            </div>
        `;
    }
    
    closeThreadDetail() {
        if (window.queuedModal) {
            window.queuedModal.close('threadDetailModal');
        } else {
            document.getElementById('threadDetailModal').style.display = 'none';
        }
        this.selectedThread = null;
    }
    
    async handleReply(e, threadId) {
        e.preventDefault();
        const textarea = e.target.querySelector('textarea');
        const content = textarea.value;
        
        try {
            // Send to API
            const response = await fetch('/api/messages.php?action=reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message_id: threadId, content })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Reload threads and refresh detail view
                await this.loadThreads();
                const thread = this.threads.find(t => t.id === threadId);
                if (thread) {
                    this.openThreadDetail(thread);
                }
                this.showNotification('Reply posted successfully!', 'success');
            } else {
                throw new Error(result.message || 'Failed to post reply');
            }
            
        } catch (error) {
            console.error('Error posting reply:', error);
            this.showNotification('Failed to post reply', 'error');
        }
    }
    
    toggleThreadLock(threadId) {
        const thread = this.threads.find(t => t.id === threadId);
        thread.isLocked = !thread.isLocked;
        this.openThreadDetail(thread);
        this.renderThreads();
        this.showNotification(`Thread ${thread.isLocked ? 'locked' : 'unlocked'}`, 'success');
    }
    
    deleteThread(threadId) {
        if (!confirm('Are you sure you want to delete this thread?')) return;
        
        this.threads = this.threads.filter(t => t.id !== threadId);
        this.closeThreadDetail();
        this.renderThreads();
        this.showNotification('Thread deleted', 'success');
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
        if (window.unifiedModal) {
            window.unifiedModal.closeAll();
        } else {
            // Fallback
            document.getElementById('newThreadModal').style.display = 'none';
            document.getElementById('threadDetailModal').style.display = 'none';
        }
    }
    
    
    startAutoRefresh() {
        // Auto-refresh disabled for family comfort - 30 seconds was too aggressive
        // To re-enable, uncomment below and consider longer intervals like 5-10 minutes:
        // this.refreshInterval = setInterval(() => {
        //     this.loadThreads();
        // }, 300000); // 5 minutes = 300000ms, 10 minutes = 600000ms
    }
    
    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
}

// Initialize the message board
let messageBoard;
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing message board...');
    try {
        messageBoard = new FamilyMessageBoard();
        console.log('Message board created successfully');
        
        // Make close function available globally
        window.closeThreadDetail = () => {
            if (messageBoard) {
                messageBoard.closeThreadDetail();
            }
        };
        console.log('Global functions set up');
    } catch (error) {
        console.error('Error initializing message board:', error);
    }
});

// Add animations to stylesheet
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .empty-state {
        text-align: center;
        padding: 4rem 2rem;
        color: #6b7280;
    }
    
    .empty-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
        opacity: 0.5;
    }
    
    .thread-actions {
        display: flex;
        gap: 1rem;
        margin: 2rem 0;
        padding-top: 2rem;
        border-top: 1px solid #e5e7eb;
    }
    
    .btn-secondary {
        background: #f3f4f6;
        color: #374151;
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 8px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .btn-secondary:hover {
        background: #e5e7eb;
    }
    
    .thread-locked-message {
        text-align: center;
        color: #6b7280;
        padding: 2rem;
        background: #f9fafb;
        border-radius: 8px;
        margin-top: 2rem;
    }
    
    .edited-tag {
        font-size: 0.75rem;
        color: #9ca3af;
        font-style: italic;
        margin-left: 0.5rem;
    }
`;
document.head.appendChild(style);