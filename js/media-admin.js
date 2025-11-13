// Media Admin Module

class MediaAdmin {
    constructor() {
        this.pendingSubmissions = [];
        this.mediaCategories = [];
        this.mediaLibrary = [];
        this.selectedSubmissions = new Set();
        this.dataLoaded = false;

        this.init();
    }
    
    async init() {
        // Don't load data until module is rendered
    }
    
    async loadDashboardData() {
        try {
            // Load pending media submissions
            const pendingResponse = await fetch('/api/pending-media.php');
            if (pendingResponse.ok) {
                const data = await pendingResponse.json();
                // Ensure we have an array
                this.pendingSubmissions = Array.isArray(data) ? data :
                                         (data.submissions ? data.submissions : []);
            } else {
                console.log('Pending media API not available, using empty array');
                this.pendingSubmissions = [];
            }
            
            // Load media categories
            const categoriesResponse = await fetch('/api/media.php?action=categories');
            if (categoriesResponse.ok) {
                const data = await categoriesResponse.json();
                // Ensure we have an array
                this.mediaCategories = Array.isArray(data) ? data : 
                                     (data.categories ? data.categories : []);
            } else {
                console.log('Categories API not available, using empty array');
                this.mediaCategories = [];
            }
            
            // Load full media library for management
            const libraryResponse = await fetch('/api/media.php?action=all');
            if (libraryResponse.ok) {
                const data = await libraryResponse.json();
                // Ensure we have an array
                this.mediaLibrary = Array.isArray(data) ? data : 
                                  (data.media ? data.media : []);
            } else {
                console.log('Media library API not available, using empty array');
                this.mediaLibrary = [];
            }
            
        } catch (error) {
            console.error('Error loading media admin data:', error);
            // Initialize with empty arrays to prevent map errors
            this.pendingSubmissions = [];
            this.mediaCategories = [];
            this.mediaLibrary = [];
            this.showMessage('Media data temporarily unavailable', 'warning');
        }
    }
    
    renderPendingMedia() {
        // Ensure pendingSubmissions is an array
        if (!Array.isArray(this.pendingSubmissions)) {
            this.pendingSubmissions = [];
        }
        
        if (this.pendingSubmissions.length === 0) {
            return `
                <div class="loading-state">
                    <p>🎉 No pending media! All caught up.</p>
                </div>
            `;
        }
        
        return this.pendingSubmissions.map(submission => `
            <div class="media-submission">
                <div class="submission-header">
                    <div>
                        <h3 class="submission-title">${submission.title || submission.original_name}</h3>
                        <div class="submission-meta">
                            ${this.getMediaTypeIcon(submission.type)} ${submission.type.toUpperCase()} • 
                            Uploaded by ${submission.uploader_name} • 
                            ${this.formatFileSize(submission.file_size)}
                        </div>
                    </div>
                    <div class="submission-actions">
                        <input type="checkbox" class="submission-select" data-id="${submission.id}">
                    </div>
                </div>
                
                <div class="submission-content">
                    <div class="media-preview-container">
                        ${this.renderMediaPreview(submission)}
                    </div>
                    
                    <div class="submission-context">
                        <div class="context-item">
                            <div class="context-label">Original Filename</div>
                            <div class="context-value">${submission.original_name}</div>
                        </div>
                        <div class="context-item">
                            <div class="context-label">Submitted Description</div>
                            <div class="context-value">${submission.description || 'No description provided'}</div>
                        </div>
                        <div class="context-item">
                            <div class="context-label">File Type</div>
                            <div class="context-value">${submission.mime_type}</div>
                        </div>
                        <div class="context-item">
                            <div class="context-label">Duration/Size</div>
                            <div class="context-value">${submission.duration || this.formatFileSize(submission.file_size)}</div>
                        </div>
                    </div>
                    
                    <div class="submission-actions">
                        <button class="btn btn-danger" onclick="quickRejectMedia('${submission.id}')">
                            ❌ Reject
                        </button>
                        <button class="btn btn-secondary" onclick="reviewMedia('${submission.id}')">
                            👁️ Review
                        </button>
                        <button class="btn btn-primary" onclick="quickApproveMedia('${submission.id}')">
                            ✅ Quick Approve
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    renderMediaPreview(submission) {
        switch(submission.type) {
            case 'video':
                return `
                    <video class="media-preview-player" controls preload="metadata">
                        <source src="${submission.file_path}" type="${submission.mime_type}">
                    </video>
                `;
            case 'audio':
                return `
                    <div class="audio-preview-container">
                        <div class="audio-preview-icon">🎵</div>
                        <audio class="media-preview-player" controls preload="metadata">
                            <source src="${submission.file_path}" type="${submission.mime_type}">
                        </audio>
                    </div>
                `;
            case 'document':
                return `
                    <div class="document-preview-container">
                        <div class="document-preview-icon">${this.getDocumentIcon(submission.mime_type)}</div>
                        <div class="document-preview-info">
                            <div class="document-name">${submission.original_name}</div>
                            <div class="document-size">${this.formatFileSize(submission.file_size)}</div>
                            <button class="btn btn-sm btn-secondary" onclick="openDocument('${submission.file_path}')">
                                👁️ Preview
                            </button>
                        </div>
                    </div>
                `;
            default:
                return `<div class="unknown-media-preview">Unknown media type</div>`;
        }
    }
    
    renderCategories() {
        // Ensure mediaCategories is an array
        if (!Array.isArray(this.mediaCategories)) {
            this.mediaCategories = [];
        }
        
        if (this.mediaCategories.length === 0) {
            return `
                <div class="loading-state">
                    <p>No categories yet. Create your first category!</p>
                </div>
            `;
        }
        
        return this.mediaCategories.map(category => `
            <div class="category-card">
                <div class="category-icon">${category.icon || '📁'}</div>
                <div class="category-info">
                    <h3 class="category-title">${category.name}</h3>
                    <div class="category-meta">
                        ${category.item_count} items • ${category.description || 'No description'}
                    </div>
                    <div class="category-actions">
                        <button class="btn btn-sm btn-secondary" onclick="editCategory('${category.id}')">
                            ✏️ Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteCategory('${category.id}')">
                            🗑️ Delete
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    renderLibraryGrid() {
        // Ensure mediaLibrary is an array
        if (!Array.isArray(this.mediaLibrary)) {
            this.mediaLibrary = [];
        }
        
        if (this.mediaLibrary.length === 0) {
            return `<div class="loading-state">No media in library yet.</div>`;
        }
        
        return this.mediaLibrary.map(item => `
            <div class="library-item-card">
                <div class="library-item-preview">
                    ${this.getLibraryItemPreview(item)}
                </div>
                <div class="library-item-info">
                    <h4 class="library-item-title">${item.title}</h4>
                    <div class="library-item-meta">
                        ${this.getMediaTypeIcon(item.type)} ${item.type} • ${item.category}
                    </div>
                    <div class="library-item-actions">
                        <button class="btn btn-sm btn-secondary" onclick="editMedia('${item.id}')">
                            ✏️ Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="archiveMedia('${item.id}')">
                            📦 Archive
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    getLibraryItemPreview(item) {
        switch(item.type) {
            case 'video':
                return `<div class="preview-icon">📹</div>`;
            case 'audio':
                return `<div class="preview-icon">🎵</div>`;
            case 'document':
                return `<div class="preview-icon">${this.getDocumentIcon(item.mime_type)}</div>`;
            default:
                return `<div class="preview-icon">📄</div>`;
        }
    }
    
    getMediaTypeIcon(type) {
        const icons = {
            'video': '📹',
            'audio': '🎵',
            'document': '📄',
            'image': '🖼️'
        };
        return icons[type] || '📄';
    }
    
    getDocumentIcon(mimeType) {
        if (!mimeType) return '📄';
        if (mimeType.includes('pdf')) return '📕';
        if (mimeType.includes('word')) return '📝';
        if (mimeType.includes('excel')) return '📊';
        if (mimeType.includes('powerpoint')) return '📙';
        return '📄';
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    async getStats() {
        return [
            {
                label: 'Pending Media',
                value: this.pendingSubmissions.length
            },
            {
                label: 'Total Media',
                value: this.mediaLibrary.length
            },
            {
                label: 'Categories',
                value: this.mediaCategories.length
            }
        ];
    }

    async getStats() {
        return [
            {
                label: 'Pending Media',
                value: this.pendingSubmissions.length
            },
            {
                label: 'Total Media Files',
                value: this.mediaLibrary.length
            }
        ];
    }

    async render(container) {
        // Load data if not already loaded
        if (!this.dataLoaded) {
            console.log('Media Admin: Loading dashboard data...');
            await this.loadDashboardData();
            this.dataLoaded = true;
        }
        
        container.innerHTML = `
            <div class="media-admin-panel">
                <div class="admin-tabs">
                    <button class="tab-btn active" onclick="mediaAdmin.showTab('pending')">
                        📝 Pending Media (${this.pendingSubmissions.length})
                    </button>
                    <button class="tab-btn" onclick="mediaAdmin.showTab('categories')">
                        📁 Categories (${this.mediaCategories.length})
                    </button>
                    <button class="tab-btn" onclick="mediaAdmin.showTab('library')">
                        🗃️ Full Library (${this.mediaLibrary.length})
                    </button>
                    <button class="tab-btn" onclick="mediaAdmin.showTab('analytics')">
                        📊 Analytics
                    </button>
                </div>
                
                <!-- Pending Media Tab -->
                <div class="tab-content active" id="pendingTab">
                    <div class="section-header">
                        <h3>📋 Media Submissions Pending Review</h3>
                        <div class="header-actions">
                            <button onclick="mediaAdmin.selectAll()" class="btn btn-outline">
                                <input type="checkbox" id="selectAllCheckbox" style="margin-right: 8px;">
                                Select All
                            </button>
                            <button onclick="mediaAdmin.refreshPending()" class="btn btn-secondary">
                                🔄 Refresh
                            </button>
                        </div>
                    </div>
                    
                    <div id="pendingMedia">
                        ${this.renderPendingMedia()}
                    </div>
                    
                    <!-- Batch Actions Bar -->
                    <div class="batch-actions-bar" id="batchActionsBar">
                        <div class="batch-count">
                            <span id="selectedCount">0</span> items selected
                        </div>
                        <div class="batch-buttons">
                            <button onclick="mediaAdmin.batchReject()" class="btn btn-danger">
                                ❌ Reject Selected
                            </button>
                            <button onclick="mediaAdmin.batchApprove()" class="btn btn-primary">
                                ✅ Approve Selected
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Categories Management Tab -->
                <div class="tab-content" id="categoriesTab">
                    <div class="section-header">
                        <h3>📁 Media Categories</h3>
                        <button onclick="mediaAdmin.showCreateCategory()" class="btn btn-primary">
                            ➕ Create Category
                        </button>
                    </div>
                    
                    <div id="categoriesGrid">
                        ${this.renderCategories()}
                    </div>
                </div>
                
                <!-- Full Library Management Tab -->
                <div class="tab-content" id="libraryTab">
                    <div class="section-header">
                        <h3>🗃️ Full Media Library</h3>
                        <div class="header-actions">
                            <input type="text" id="librarySearch" placeholder="Search media..." class="form-input">
                            <select id="libraryFilter" class="form-input">
                                <option value="all">All Types</option>
                                <option value="video">Video</option>
                                <option value="audio">Audio</option>
                                <option value="document">Documents</option>
                            </select>
                        </div>
                    </div>
                    
                    <div id="mediaLibraryGrid">
                        ${this.renderLibraryGrid()}
                    </div>
                </div>
                
                <!-- Analytics Tab -->
                <div class="tab-content" id="analyticsTab">
                    <div class="analytics-overview">
                        <div class="analytics-stats">
                            <div class="stat-card">
                                <div class="stat-number" id="totalUploads">${this.mediaLibrary.length}</div>
                                <div class="stat-label">Total Uploads</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-number" id="pendingCount">${this.pendingSubmissions.length}</div>
                                <div class="stat-label">Pending Review</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-number" id="monthlyUploads">-</div>
                                <div class="stat-label">This Month</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-number" id="storageUsed">-</div>
                                <div class="stat-label">Storage Used</div>
                            </div>
                        </div>
                        
                        <div class="analytics-charts">
                            <div class="chart-container">
                                <h4>📈 Upload Trends</h4>
                                <div id="uploadTrendsChart" class="chart-placeholder">
                                    Chart will be implemented with database data
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Media Review Modal -->
            <div class="modal" id="mediaReviewModal">
                <div class="modal-overlay" onclick="mediaAdmin.closeModal()"></div>
                <div class="modal-content large">
                    <div class="modal-header">
                        <h3>📋 Review Media Submission</h3>
                        <button onclick="mediaAdmin.closeModal()" class="modal-close">×</button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="media-review-layout">
                            <div class="media-preview" id="mediaPreview">
                                <!-- Media preview will be loaded here -->
                            </div>
                            
                            <div class="media-review-form">
                                <div class="form-group">
                                    <label>Final Title</label>
                                    <input type="text" id="finalTitle" class="form-input">
                                </div>
                                
                                <div class="form-group">
                                    <label>Description/Context</label>
                                    <textarea id="finalDescription" class="form-input" rows="4"></textarea>
                                </div>
                                
                                <div class="form-group">
                                    <label>Category</label>
                                    <select id="finalCategory" class="form-input">
                                        <option value="">Select category...</option>
                                        <option value="create_new">Create New Category</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label>Reviewer Notes</label>
                                    <textarea id="reviewerNotes" class="form-input" rows="3" placeholder="Internal notes about your decision..."></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <button onclick="mediaAdmin.rejectMedia()" class="btn btn-danger">
                            ❌ Reject
                        </button>
                        <button onclick="mediaAdmin.requestMoreInfo()" class="btn btn-secondary">
                            📝 Request More Info
                        </button>
                        <button onclick="mediaAdmin.approveMedia()" class="btn btn-primary">
                            ✅ Approve Media
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Category Creation Modal -->
            <div class="modal" id="categoryModal">
                <div class="modal-overlay" onclick="mediaAdmin.closeModal()"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>📁 Create Media Category</h3>
                        <button onclick="mediaAdmin.closeModal()" class="modal-close">×</button>
                    </div>
                    
                    <div class="modal-body">
                        <form id="categoryForm">
                            <div class="form-group">
                                <label for="categoryName">Category Name</label>
                                <input type="text" id="categoryName" placeholder="e.g., Wedding Videos" required class="form-input">
                            </div>
                            
                            <div class="form-group">
                                <label for="categoryIcon">Category Icon</label>
                                <input type="text" id="categoryIcon" placeholder="e.g., 💒" maxlength="2" class="form-input">
                            </div>
                            
                            <div class="form-group">
                                <label for="categoryDescription">Description</label>
                                <textarea id="categoryDescription" rows="3" placeholder="Brief description of this category..." class="form-input"></textarea>
                            </div>
                        </form>
                    </div>
                    
                    <div class="modal-footer">
                        <button onclick="mediaAdmin.closeModal()" class="btn btn-secondary">
                            Cancel
                        </button>
                        <button onclick="mediaAdmin.createCategory()" class="btn btn-primary">
                            ✅ Create Category
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Initialize after render
        this.initBatchSelection();
        this.populateCategorySelects();
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('librarySearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterLibrary(e.target.value);
            });
        }
        
        // Filter functionality
        const filterSelect = document.getElementById('libraryFilter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.filterByType(e.target.value);
            });
        }
    }
    
    initBatchSelection() {
        setTimeout(() => {
            document.querySelectorAll('.submission-select').forEach(checkbox => {
                checkbox.addEventListener('change', () => this.updateBatchBar());
            });
        }, 100);
    }
    
    updateBatchBar() {
        const selectedCount = document.querySelectorAll('.submission-select:checked').length;
        const batchBar = document.getElementById('batchActionsBar');
        const countSpan = document.getElementById('selectedCount');
        
        if (selectedCount > 0) {
            batchBar.classList.add('show');
            countSpan.textContent = selectedCount;
        } else {
            batchBar.classList.remove('show');
        }
        
        // Update select all checkbox
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        const totalCheckboxes = document.querySelectorAll('.submission-select').length;
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = selectedCount === totalCheckboxes && totalCheckboxes > 0;
            selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < totalCheckboxes;
        }
    }
    
    populateCategorySelects() {
        const selects = document.querySelectorAll('#finalCategory');
        
        selects.forEach(select => {
            select.innerHTML = `
                <option value="">Select category...</option>
                <option value="create_new">Create New Category</option>
            `;
            
            this.mediaCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = `${category.icon} ${category.name}`;
                select.appendChild(option);
            });
        });
    }
    
    showTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.getElementById(tabName + 'Tab').classList.add('active');
        event.target.classList.add('active');
    }
    
    selectAll() {
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        const checkboxes = document.querySelectorAll('.submission-select');
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAllCheckbox.checked;
        });
        
        this.updateBatchBar();
    }
    
    refreshPending() {
        this.loadDashboardData();
        this.showMessage('Refreshed pending submissions', 'success');
    }
    
    showCreateCategory() {
        document.getElementById('categoryModal').classList.add('active');
    }
    
    closeModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }
    
    showMessage(text, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = text;
        messageDiv.style.cssText = `
            position: fixed;
            top: 80px;
            right: 2rem;
            background: ${type === 'error' ? '#fee2e2' : type === 'success' ? '#f0fdf4' : '#f0f9ff'};
            color: ${type === 'error' ? '#991b1b' : type === 'success' ? '#166534' : '#1e40af'};
            padding: 1rem 2rem;
            border-radius: 8px;
            box-shadow: var(--shadow);
            z-index: 9999;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
    
    async batchApprove() {
        const selected = document.querySelectorAll('.submission-select:checked');
        if (selected.length === 0) return;
        
        if (!confirm(`Approve ${selected.length} selected media items?`)) return;
        
        this.showMessage(`Batch approval for ${selected.length} items initiated`, 'info');
        
        // Clear selection
        selected.forEach(cb => cb.checked = false);
        this.updateBatchBar();
    }
    
    async batchReject() {
        const selected = document.querySelectorAll('.submission-select:checked');
        if (selected.length === 0) return;
        
        if (!confirm(`Reject ${selected.length} selected media items? This cannot be undone.`)) return;
        
        this.showMessage(`Batch rejection for ${selected.length} items initiated`, 'info');
        
        // Clear selection
        selected.forEach(cb => cb.checked = false);
        this.updateBatchBar();
    }
    
    filterLibrary(searchTerm) {
        // TODO: Implement library search
        console.log('Searching for:', searchTerm);
    }
    
    filterByType(type) {
        // TODO: Implement type filtering
        console.log('Filtering by type:', type);
    }
}

// Global functions for onclick handlers
function quickRejectMedia(mediaId) {
    if (!confirm('Are you sure you want to reject this media?')) return;
    mediaAdmin.showMessage('Media rejected', 'success');
}

function reviewMedia(mediaId) {
    const submission = mediaAdmin.pendingSubmissions.find(s => s.id == mediaId);
    if (!submission) return;
    
    mediaAdmin.currentMedia = submission;
    
    // Populate modal
    document.getElementById('finalTitle').value = submission.title || submission.original_name;
    document.getElementById('finalDescription').value = submission.description || '';
    document.getElementById('mediaPreview').innerHTML = mediaAdmin.renderMediaPreview(submission);
    
    // Show modal
    document.getElementById('mediaReviewModal').classList.add('active');
}

function quickApproveMedia(mediaId) {
    const submission = mediaAdmin.pendingSubmissions.find(s => s.id == mediaId);
    if (!submission) return;
    
    mediaAdmin.showMessage(`Approved: ${submission.title || submission.original_name}`, 'success');
}

function openDocument(filepath) {
    window.open(filepath, '_blank');
}

function editCategory(categoryId) {
    mediaAdmin.showMessage(`Edit category: ${categoryId}`, 'info');
}

function deleteCategory(categoryId) {
    if (!confirm('Delete this category? Media items will need to be recategorized.')) return;
    mediaAdmin.showMessage('Category deletion not implemented', 'info');
}

function editMedia(mediaId) {
    mediaAdmin.showMessage(`Edit media: ${mediaId}`, 'info');
}

function archiveMedia(mediaId) {
    if (!confirm('Archive this media item?')) return;
    mediaAdmin.showMessage('Media archiving not implemented', 'info');
}

// Register module with admin core
const mediaAdmin = new MediaAdmin();

// Register with admin core when it's ready
if (window.adminCore) {
    adminCore.registerModule({
        name: 'media',
        title: 'Media Management',
        icon: '🎬',
        priority: 4,
        getStats: () => mediaAdmin.getStats(),
        render: (container) => mediaAdmin.render(container)
    });
} else {
    // Wait for admin core to load
    document.addEventListener('DOMContentLoaded', () => {
        if (window.adminCore) {
            adminCore.registerModule({
                name: 'media',
                title: 'Media Management',
                icon: '🎬',
                priority: 4,
                getStats: () => mediaAdmin.getStats(),
                render: (container) => mediaAdmin.render(container)
            });
        }
    });
}

// Add CSS for animations
const mediaAdminStyle = document.createElement('style');
mediaAdminStyle.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .media-preview-player {
        width: 100%;
        max-height: 300px;
        border-radius: var(--radius-md);
    }
    
    .audio-preview-container {
        text-align: center;
        padding: var(--spacing-xl);
    }
    
    .audio-preview-icon {
        font-size: 4rem;
        margin-bottom: var(--spacing-lg);
    }
    
    .document-preview-container {
        text-align: center;
        padding: var(--spacing-xl);
    }
    
    .document-preview-icon {
        font-size: 4rem;
        margin-bottom: var(--spacing-lg);
    }
    
    .document-preview-info {
        margin-top: var(--spacing-md);
    }
    
    .document-name {
        font-weight: 600;
        margin-bottom: var(--spacing-sm);
    }
    
    .document-size {
        color: var(--text-secondary);
        margin-bottom: var(--spacing-md);
    }
    
    .media-review-layout {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-xl);
    }
    
    @media (max-width: 768px) {
        .media-review-layout {
            grid-template-columns: 1fr;
        }
    }
    
    .batch-actions-bar.show {
        transform: translateY(0);
        opacity: 1;
    }
`;
document.head.appendChild(mediaAdminStyle);