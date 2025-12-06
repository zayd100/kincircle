/**
 * Reed & Weaver Family Hub - Unified Header System
 * Handles login states, mobile menu, and user status
 */

// UNIVERSAL MODAL QUEUE SYSTEM - Fixes all race conditions
window.modalQueue = [];
window.modalSystemReady = false;

window.queuedModal = {
    open: (modalId, options = {}) => {
        if (window.modalSystemReady && window.unifiedModal) {
            window.unifiedModal.open(modalId, options);
        } else {
            window.modalQueue.push({ action: 'open', modalId, options });
        }
    },
    
    close: (modalId) => {
        if (window.modalSystemReady && window.unifiedModal) {
            window.unifiedModal.close(modalId);
        } else {
            window.modalQueue.push({ action: 'close', modalId });
        }
    },
    
    closeAll: () => {
        if (window.modalSystemReady && window.unifiedModal) {
            window.unifiedModal.closeAll();
        } else {
            window.modalQueue.push({ action: 'closeAll' });
        }
    }
};

window.processModalQueue = () => {
    window.modalSystemReady = true;
    
    window.modalQueue.forEach(operation => {
        try {
            if (operation.action === 'open') {
                window.unifiedModal.open(operation.modalId, operation.options);
            } else if (operation.action === 'close') {
                window.unifiedModal.close(operation.modalId);
            } else if (operation.action === 'closeAll') {
                window.unifiedModal.closeAll();
            }
        } catch (error) {
            console.error('Error processing queued modal operation:', error);
        }
    });
    window.modalQueue = []; // Clear the queue
};

class UnifiedHeader {
    constructor() {
        this.currentUser = null;
        this.isLoggedIn = false;
        this.isAdmin = false;
        this.unreadCount = 0;
        this.currentPage = this.getCurrentPage();
        
        this.init();
    }

    init() {
        this.checkUserStatus();
        this.createHeader();
        this.setupEventListeners();
        this.updateActiveLink();
        this.setupScrollEffect();
    }

    getCurrentPage() {
        const path = window.location.pathname;
        if (path === '/' || path === '/index.html') return 'home';
        if (path.includes('photos.php')) return 'photos';
        if (path.includes('calendar.php')) return 'calendar';
        if (path.includes('events.php')) return 'events';
        if (path.includes('board.php')) return 'board';
        if (path.includes('inbox.php')) return 'inbox';
        if (path.includes('directory.php')) return 'directory';
        if (path.includes('recipes.php')) return 'recipes';
        if (path.includes('memorials.php')) return 'memorials';
        if (path.includes('/upload/')) return 'upload';
        if (path.includes('admin.php')) return 'admin';
        return 'home';
    }

    checkUserStatus() {
        // Check if user is logged in (this would normally check session/localStorage)
        // For now, we'll simulate this based on current user data
        if (window.currentUser && window.currentUser.id) {
            this.isLoggedIn = true;
            this.currentUser = window.currentUser;
            this.isAdmin = window.currentUser.isAdmin || false;
        } else {
            // Check localStorage for user session
            const userSession = localStorage.getItem('user_session');
            if (userSession) {
                try {
                    const userData = JSON.parse(userSession);
                    this.isLoggedIn = true;
                    this.currentUser = userData;
                    this.isAdmin = userData.isAdmin || false;
                } catch (e) {
                    console.error('Error parsing user session:', e);
                }
            }
        }

        // Check for unread messages (simulate for now)
        this.checkUnreadMessages();
    }

    async checkUnreadMessages() {
        if (!this.isLoggedIn) {
            this.unreadCount = 0;
            return;
        }
        
        try {
            const response = await fetch('/api/inbox/conversations.php');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.conversations) {
                    // Calculate total unread count across all conversations
                    this.unreadCount = data.conversations.reduce((total, conv) => {
                        return total + (conv.unreadCount || 0);
                    }, 0);
                } else {
                    this.unreadCount = 0;
                }
            } else {
                this.unreadCount = 0;
            }
        } catch (error) {
            console.error('Error checking unread messages:', error);
            this.unreadCount = 0;
        }
        
        // Update the header display if it's already rendered
        this.updateUnreadDisplay();
    }
    
    updateUnreadDisplay() {
        const inboxIndicator = document.querySelector('.inbox-indicator');
        if (inboxIndicator) {
            inboxIndicator.className = `inbox-indicator ${this.unreadCount > 0 ? 'has-unread' : ''}`;
            inboxIndicator.title = this.unreadCount > 0 ? 
                `${this.unreadCount} unread messages` : 
                'No unread messages';
        }
        
        // Update mobile inbox link
        const mobileInboxLink = document.querySelector('a[href="/inbox.php"] span');
        if (mobileInboxLink && mobileInboxLink.textContent.includes('Inbox')) {
            mobileInboxLink.textContent = `📬 Inbox ${this.unreadCount > 0 ? `(${this.unreadCount})` : ''}`;
        }
    }

    createHeader() {
        const header = document.createElement('header');
        header.className = 'unified-header';
        
        header.innerHTML = `
            <!-- Universe Background -->
            <div class="universe-background">
                <div class="universe-stars"></div>
                <div class="universe-particles"></div>
            </div>

            <div class="header-container">
                <!-- Logo -->
                <a href="/index.php" class="header-logo">
                    <span class="logo-icon">🏠</span>
                    <span class="logo-text">Reed & Weaver</span>
                </a>

                <!-- Navigation -->
                <nav class="header-nav">
                    <a href="/photos.php" class="nav-link" data-page="photos">
                        <span>📸</span> Photos
                    </a>
                    <a href="/media.php" class="nav-link" data-page="media">
                        <span>🎬</span> Media
                    </a>
                    <a href="/calendar.php" class="nav-link" data-page="calendar">
                        <span>📅</span> Calendar
                    </a>
                    <a href="/events.php" class="nav-link" data-page="events">
                        <span>🎉</span> Events
                    </a>
                    <a href="/board.php" class="nav-link" data-page="board">
                        <span>📋</span> Board
                    </a>
                    <a href="/directory.php" class="nav-link" data-page="directory">
                        <span>📖</span> Directory
                    </a>
                    <a href="/recipes.php" class="nav-link" data-page="recipes">
                        <span>🍝</span> Recipes
                    </a>
                    <a href="/memorials.php" class="nav-link" data-page="memorials">
                        <span>🕊️</span> Memorials
                    </a>
                </nav>

                <!-- Actions -->
                <div class="header-actions">
                    ${this.renderUserSection()}
                </div>
            </div>
        `;

        // Create mobile bottom nav
        const mobileNav = document.createElement('nav');
        mobileNav.className = 'mobile-bottom-nav';
        mobileNav.innerHTML = `
            <a href="/index.php" class="bottom-nav-item" data-page="home">
                <span class="bottom-nav-icon">🏠</span>
                <span class="bottom-nav-label">Home</span>
            </a>
            <a href="/photos.php" class="bottom-nav-item" data-page="photos">
                <span class="bottom-nav-icon">📸</span>
                <span class="bottom-nav-label">Photos</span>
            </a>
            <a href="/calendar.php" class="bottom-nav-item" data-page="calendar">
                <span class="bottom-nav-icon">📅</span>
                <span class="bottom-nav-label">Calendar</span>
            </a>
            <a href="/board.php" class="bottom-nav-item" data-page="board">
                <span class="bottom-nav-icon">📋</span>
                <span class="bottom-nav-label">Board</span>
            </a>
            <a href="/directory.php" class="bottom-nav-item" data-page="directory">
                <span class="bottom-nav-icon">📖</span>
                <span class="bottom-nav-label">More</span>
            </a>
        `;
        document.body.appendChild(mobileNav);

        // Insert header at the beginning of body
        document.body.insertBefore(header, document.body.firstChild);
    }

    renderUserSection() {
        if (this.isLoggedIn) {
            return `
                <div class="user-status">
                    <div class="user-avatar" title="${this.currentUser.displayName || this.currentUser.username}">
                        ${this.getInitials(this.currentUser.displayName || this.currentUser.username)}
                    </div>
                    <div class="inbox-indicator ${this.unreadCount > 0 ? 'has-unread' : ''}" 
                         title="${this.unreadCount > 0 ? this.unreadCount + ' unread messages' : 'No unread messages'}">
                        📬
                    </div>
                    ${this.isAdmin ? '<a href="/admin.php" class="admin-button"><span>⚙️</span> Admin</a>' : ''}
                </div>
            `;
        } else {
            return `<a href="/login.php" class="login-button"><span>🔐</span> Login</a>`;
        }
    }

    renderMobileUserSection() {
        if (this.isLoggedIn) {
            return `
                <div class="user-status">
                    <div class="user-info">
                        <div class="user-avatar">
                            ${this.getInitials(this.currentUser.displayName || this.currentUser.username)}
                        </div>
                        <span>${this.currentUser.displayName || this.currentUser.username}</span>
                    </div>
                    <a href="/inbox.php" class="nav-link">
                        <span>📬</span> Inbox ${this.unreadCount > 0 ? `(${this.unreadCount})` : ''}
                    </a>
                    ${this.isAdmin ? '<a href="/admin.php" class="nav-link"><span>⚙️</span> Admin</a>' : ''}
                    <a href="/logout.php" class="nav-link">
                        <span>🚪</span> Logout
                    </a>
                </div>
            `;
        } else {
            return `<a href="/login.php" class="login-button"><span>🔐</span> Login</a>`;
        }
    }

    getInitials(name) {
        if (!name) return '?';
        const nameParts = name.split(' ');
        if (nameParts.length === 1) {
            return nameParts[0].charAt(0).toUpperCase();
        }
        return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
    }

    setupEventListeners() {
        // User avatar click (could show user menu)
        const userAvatar = document.querySelector('.user-avatar');
        if (userAvatar) {
            userAvatar.addEventListener('click', (e) => {
                e.preventDefault();
                this.showUserMenu();
            });
        }

        // Inbox indicator click
        const inboxIndicator = document.querySelector('.inbox-indicator');
        if (inboxIndicator) {
            inboxIndicator.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = 'inbox.php';
            });
        }

        // Update bottom nav active state
        this.updateBottomNavActive();
    }

    updateBottomNavActive() {
        const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
        bottomNavItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === this.currentPage) {
                item.classList.add('active');
            }
        });
    }

    showUserMenu() {
        // This could show a dropdown menu with user options
        console.log('User menu clicked - could show dropdown with profile options');
    }

    updateActiveLink() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === this.currentPage) {
                link.classList.add('active');
            }
        });
    }

    setupScrollEffect() {
        let lastScrollY = window.scrollY;
        
        const handleScroll = () => {
            const header = document.querySelector('.unified-header');
            if (header) {
                if (window.scrollY > 50) {
                    header.classList.add('scrolled');
                } else {
                    header.classList.remove('scrolled');
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Initial call
    }

    // Public methods for updating header state
    updateUserStatus(userData) {
        this.currentUser = userData;
        this.isLoggedIn = true;
        this.isAdmin = userData.isAdmin || false;
        
        // Update user section
        const userSection = document.querySelector('.header-actions');
        if (userSection) {
            userSection.innerHTML = this.renderUserSection() + 
                `<button class="mobile-menu-toggle" id="mobileMenuToggle">
                    <span>☰</span>
                </button>`;
        }
        
        // Update mobile user section
        const mobileActions = document.querySelector('.mobile-actions');
        if (mobileActions) {
            mobileActions.innerHTML = this.renderMobileUserSection();
        }
        
        this.setupEventListeners();
    }

    updateUnreadCount(count) {
        this.unreadCount = count;
        const inboxIndicator = document.querySelector('.inbox-indicator');
        if (inboxIndicator) {
            inboxIndicator.className = `inbox-indicator ${count > 0 ? 'has-unread' : ''}`;
            inboxIndicator.title = count > 0 ? `${count} unread messages` : 'No unread messages';
        }
    }

    logout() {
        this.isLoggedIn = false;
        this.currentUser = null;
        this.isAdmin = false;
        this.unreadCount = 0;
        
        // Clear session storage
        localStorage.removeItem('user_session');
        
        // Redirect to login
        window.location.href = 'login.php';
    }
}

// Initialize the unified header when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.unifiedHeader = new UnifiedHeader();
    
    // Load unified modal system with queue processing
    const modalScript = document.createElement('script');
    modalScript.src = '/js/unified-modal.js';
    modalScript.onload = () => {
        // Process any queued modal operations
        window.processModalQueue?.();
    };
    document.head.appendChild(modalScript);
});

// Make it available globally for other scripts
window.UnifiedHeader = UnifiedHeader;

// Global modal functions are now provided by unified-modal.js
// No need for queue-based overrides since unified system is working