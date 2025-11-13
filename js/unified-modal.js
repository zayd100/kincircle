/**
 * Reed & Weaver Family Hub - Unified Modal System
 * The ultimate modal utility that ends all phantom conflicts
 * 
 * This utility provides a consistent modal interface across all pages
 * and handles all edge cases that caused the phantom bugs.
 */

class UnifiedModal {
    constructor() {
        this.openModals = new Set();
        this.setupGlobalEventListeners();
        this.setupKeyboardShortcuts();
    }

    /**
     * Open a modal with the unified system
     * @param {string} modalId - The ID of the modal to open
     * @param {Object} options - Optional configuration
     */
    open(modalId, options = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`Modal with ID "${modalId}" not found`);
            return false;
        }

        // Prevent body scroll
        document.body.classList.add('modal-open');
        
        // Add to open modals set
        this.openModals.add(modalId);
        
        // Show modal with unified approach
        modal.classList.add('active');
        modal.classList.remove('hidden');
        // Let CSS handle display - don't force it with JavaScript!
        
        // Focus management
        if (options.focusElement) {
            setTimeout(() => {
                const focusTarget = modal.querySelector(options.focusElement);
                if (focusTarget) focusTarget.focus();
            }, 300);
        }
        
        // Set up click-outside-to-close
        if (options.closeOnOutsideClick !== false) {
            this.setupOutsideClickHandler(modal);
        }
        
        // Trigger custom event
        modal.dispatchEvent(new CustomEvent('modal:opened', { detail: { modalId, options } }));
        
        return true;
    }

    /**
     * Close a modal with the unified system
     * @param {string} modalId - The ID of the modal to close
     */
    close(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            // Modal doesn't exist on this page - silently ignore
            return false;
        }

        // Hide modal with unified approach
        modal.classList.remove('active');
        modal.classList.add('hidden');
        
        // Remove from open modals set
        this.openModals.delete(modalId);
        
        // If no more modals are open, restore body scroll
        if (this.openModals.size === 0) {
            document.body.classList.remove('modal-open');
        }
        
        // CSS handles display through opacity/visibility
        // No need to manipulate display property with JavaScript
        
        // Trigger custom event
        modal.dispatchEvent(new CustomEvent('modal:closed', { detail: { modalId } }));
        
        return true;
    }

    /**
     * Close all open modals
     */
    closeAll() {
        const modalIds = Array.from(this.openModals);
        modalIds.forEach(modalId => this.close(modalId));
    }

    /**
     * Toggle a modal's visibility
     * @param {string} modalId - The ID of the modal to toggle
     * @param {Object} options - Optional configuration
     */
    toggle(modalId, options = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`Modal with ID "${modalId}" not found`);
            return false;
        }

        if (this.isOpen(modalId)) {
            return this.close(modalId);
        } else {
            return this.open(modalId, options);
        }
    }

    /**
     * Check if a modal is open
     * @param {string} modalId - The ID of the modal to check
     */
    isOpen(modalId) {
        return this.openModals.has(modalId);
    }

    /**
     * Set up global event listeners for the unified system
     */
    setupGlobalEventListeners() {
        // Handle click events on modal close buttons
        document.addEventListener('click', (e) => {
            // Universal close button handler
            if (e.target.matches('.modal-close, .close-modal')) {
                e.preventDefault();
                e.stopPropagation();
                
                const modal = e.target.closest('.modal, .day-modal, .modal-backdrop, .recipe-modal, .kitchen-modal, .timeline-modal');
                if (modal && modal.id) {
                    this.close(modal.id);
                }
            }
        });

        // Handle ESC key globally
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.openModals.size > 0) {
                e.preventDefault();
                this.closeAll();
            }
        });
    }

    /**
     * Set up click-outside-to-close for a specific modal
     * @param {Element} modal - The modal element
     */
    setupOutsideClickHandler(modal) {
        const handler = (e) => {
            // Only close if clicked directly on the modal backdrop
            if (e.target === modal) {
                this.close(modal.id);
            }
        };

        modal.addEventListener('click', handler);
        
        // Store handler for cleanup
        modal._unifiedModalHandler = handler;
    }

    /**
     * Set up keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        // Ctrl+M to close all modals (useful for debugging)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'm' && this.openModals.size > 0) {
                e.preventDefault();
                this.closeAll();
            }
        });
    }

    /**
     * Create a modal programmatically
     * @param {string} modalId - The ID for the new modal
     * @param {Object} config - Modal configuration
     */
    create(modalId, config = {}) {
        const {
            title = 'Modal',
            content = '',
            size = 'medium',
            type = 'default',
            buttons = []
        } = config;

        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = `modal ${type === 'calendar' ? 'day-modal' : ''}`;
        
        const contentClass = type === 'calendar' ? 'day-modal-content' : 'modal-content';
        const sizeClass = size === 'large' ? ' large' : size === 'small' ? ' small' : '';
        
        modal.innerHTML = `
            <div class="${contentClass}${sizeClass}">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" type="button">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                ${buttons.length > 0 ? `
                    <div class="modal-footer">
                        ${buttons.map(btn => `
                            <button class="btn ${btn.class || 'btn-secondary'}" 
                                    onclick="${btn.onclick || ''}">${btn.text}</button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        document.body.appendChild(modal);
        return modal;
    }

    /**
     * Destroy a modal completely
     * @param {string} modalId - The ID of the modal to destroy
     */
    destroy(modalId) {
        this.close(modalId);
        const modal = document.getElementById(modalId);
        if (modal) {
            // Clean up event handlers
            if (modal._unifiedModalHandler) {
                modal.removeEventListener('click', modal._unifiedModalHandler);
            }
            modal.remove();
        }
    }
}

// Create global instance
const unifiedModal = new UnifiedModal();

// CRITICAL: Assign to window for queue system compatibility
window.unifiedModal = unifiedModal;

// Global functions for backward compatibility with existing code
window.openModal = (modalId, options) => unifiedModal.open(modalId, options);
window.closeModal = (modalId) => unifiedModal.close(modalId);
window.toggleModal = (modalId, options) => unifiedModal.toggle(modalId, options);
window.closeAllModals = () => unifiedModal.closeAll();

// Calendar-specific global functions
window.closeDayModal = () => unifiedModal.close('dayModal');
window.openDayModal = (options) => unifiedModal.open('dayModal', options);

// Board-specific global functions
window.closeNewThreadModal = () => unifiedModal.close('newThreadModal');
window.openNewThreadModal = (options) => unifiedModal.open('newThreadModal', options);
window.closeThreadDetail = () => unifiedModal.close('threadDetailModal');

// Photo-specific global functions
window.closePhotoModal = () => unifiedModal.close('photoModal');
window.openPhotoModal = (options) => unifiedModal.open('photoModal', options);

// Inbox-specific global functions
window.closeComposeModal = () => unifiedModal.close('composeModal');
window.openComposeModal = (options) => unifiedModal.open('composeModal', options);
window.closeQuickContactModal = () => unifiedModal.close('quickContactModal');

// Recipe-specific global functions
window.closeRecipeModal = () => unifiedModal.close('recipeModal');
window.closeCreateRecipeModal = () => unifiedModal.close('createRecipeModal');
window.closeTimelineModal = () => unifiedModal.close('timelineModal');
window.closeKitchenModal = () => unifiedModal.close('kitchenModal');

// Admin-specific global functions
window.closeAdminModal = () => unifiedModal.close('photoModal') || unifiedModal.close('albumModal');

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedModal;
}

// Debug helpers (only in development)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.debugModal = {
        listOpen: () => Array.from(unifiedModal.openModals),
        closeAll: () => unifiedModal.closeAll(),
        instance: unifiedModal
    };
}