// Media Library JavaScript
// Clean library card catalog functionality with moderation workflow

let mediaLibrary = [];
let filteredMedia = [];
let currentFilter = 'all';
let currentSort = 'recent';
let isAdmin = false;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    checkAdminStatus();
    loadMediaLibrary();
    loadCategories();
    setupFilterControls();
    setupSearch();
    setupUploadForm();
    updateStats();
});

// Admin authentication detection
function checkAdminStatus() {
    // Use data passed from PHP instead of API call
    if (window.currentUser && window.currentUser.isAdmin) {
        isAdmin = true;
        enableAdminMode();
    } else {
        isAdmin = false;
    }
}

// Load categories from API
async function loadCategories() {
    try {
        const response = await fetch('/api/media.php?action=categories');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success && data.categories) {
            displayCategories(data.categories);
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        displayDefaultCategories();
    }
}

// Display categories in the grid
function displayCategories(categories) {
    const categoriesGrid = document.getElementById('categoriesGrid');
    categoriesGrid.innerHTML = '';
    
    // Convert categories object to array and display
    Object.entries(categories).forEach(([key, name]) => {
        const categoryCard = document.createElement('div');
        categoryCard.className = 'category-card';
        categoryCard.innerHTML = `
            <span class="category-icon">${getCategoryIcon(key)}</span>
            <h3 class="category-title">${name}</h3>
            <p class="category-count">0 items</p>
        `;
        categoryCard.addEventListener('click', () => {
            currentFilter = key;
            displayMedia();
            // Update active filter button
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
        });
        categoriesGrid.appendChild(categoryCard);
    });
}

// Default categories if API fails
function displayDefaultCategories() {
    const defaultCategories = {
        'general': 'General',
        'family': 'Family Photos',
        'events': 'Events',
        'documents': 'Documents'
    };
    displayCategories(defaultCategories);
}

// Get icon for category
function getCategoryIcon(category) {
    const icons = {
        'general': '📋',
        'family': '👨‍👩‍👧‍👦',
        'events': '🎉',
        'holidays': '🎄',
        'birthdays': '🎂',
        'anniversaries': '💍',
        'documents': '📄',
        'videos': '📹'
    };
    return icons[category] || '📋';
}

function enableAdminMode() {
    document.body.classList.add('admin-mode');
    showMessage('Admin mode enabled - use the admin panel for media management', 'success');
}


// Load media from API (approved items only)
async function loadMediaLibrary() {
    try {
        const response = await fetch('/api/media.php?action=approved');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Handle API response format
        if (!data.success || !Array.isArray(data.media)) {
            console.warn('Invalid media response format');
            mediaLibrary = [];
            displayEmptyState();
            return;
        }
        
        const media = data.media;
        
        mediaLibrary = media.map(item => ({
            id: item.id,
            title: item.title,
            subtitle: item.subtitle || item.description,
            type: item.type, // 'video', 'document', 'music'
            duration: item.duration, // for videos
            pages: item.pages, // for documents
            fileSize: item.file_size,
            uploadedBy: item.uploaded_by,
            moderatedBy: item.moderated_by,
            dateAdded: new Date(item.date_added),
            dateModerated: new Date(item.date_moderated),
            category: item.category,
            filePath: item.file_path,
            metadata: item.metadata || {}
        }));
        
        if (mediaLibrary.length === 0) {
            displayEmptyState();
        } else {
            displayMedia();
        }
    } catch (error) {
        console.error('Error loading media library:', error);
        displayErrorState('Failed to load media library. Please try again later.');
    }
}

// Display empty state when no media is available
function displayEmptyState() {
    const libraryContainer = document.getElementById('mediaLibrary');
    libraryContainer.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-content">
                <div class="empty-state-icon">📚</div>
                <h2>No Media Available</h2>
                <p>Your media library is empty. Upload some photos, videos, documents, or audio files to get started.</p>
                <a href="/upload/media.php" class="btn btn-primary">
                    <span class="btn-icon">📤</span>
                    Upload Media
                </a>
            </div>
        </div>
    `;
    
    // Reset stats to zero
    updateStatsForEmpty();
}

// Display error state when loading fails
function displayErrorState(message) {
    const libraryContainer = document.getElementById('mediaLibrary');
    libraryContainer.innerHTML = `
        <div class="error-state">
            <div class="error-state-content">
                <div class="error-state-icon">⚠️</div>
                <h2>Error Loading Media</h2>
                <p>${message}</p>
                <button onclick="loadMediaLibrary()" class="btn btn-secondary">
                    <span class="btn-icon">🔄</span>
                    Try Again
                </button>
            </div>
        </div>
    `;
    
    // Reset stats to zero
    updateStatsForEmpty();
}

// Display media in library format
function displayMedia() {
    // Apply current filter and sort
    filteredMedia = filterMedia(mediaLibrary, currentFilter);
    filteredMedia = sortMedia(filteredMedia, currentSort);
    
    const libraryContainer = document.getElementById('mediaLibrary');
    libraryContainer.innerHTML = '';
    
    filteredMedia.forEach(item => {
        const entryElement = createLibraryEntry(item);
        libraryContainer.appendChild(entryElement);
    });
    
    updateStats();
}

// Create clean library entry (no thumbnails)
function createLibraryEntry(item) {
    const entry = document.createElement('div');
    entry.className = 'library-entry';
    
    // Get appropriate icon and metadata
    const { icon, metaText } = getMediaIcon(item);
    
    // Format date
    const dateText = formatDate(item.dateAdded);
    
    entry.innerHTML = `
        <div class="entry-icon">${icon}</div>
        <div class="entry-content">
            <h3 class="entry-title">${item.title}</h3>
            <p class="entry-subtitle">${item.subtitle}</p>
            <div class="entry-meta">
                <span class="meta-item">
                    <span class="meta-icon">${icon}</span>
                    ${metaText}
                </span>
                <span class="meta-item">
                    <span class="meta-icon">👤</span>
                    Added by ${item.uploadedBy}
                </span>
                <span class="meta-item">
                    <span class="meta-icon">📅</span>
                    ${dateText}
                </span>
            </div>
        </div>
        <div class="entry-actions">
            <button class="download-btn" onclick='downloadMedia(${JSON.stringify(item).replace(/'/g, "\\'")}); event.stopPropagation();'>
                <span class="btn-icon">⬇</span>
                Download
            </button>
        </div>
    `;

    // Set click handler to download media
    entry.addEventListener('click', function(e) {
        // Don't trigger if clicking the download button
        if (!e.target.closest('.download-btn')) {
            downloadMedia(item);
        }
    });
    
    return entry;
}

// Get appropriate icon and metadata text
function getMediaIcon(item) {
    switch(item.type) {
        case 'video':
            return {
                icon: '📹',
                metaText: `Video • ${item.duration}`
            };
        case 'audio':
            return {
                icon: '🎵',
                metaText: `Audio • ${item.duration}`
            };
        case 'document':
            if (item.subtype === 'sheet_music') {
                return {
                    icon: '🎵',
                    metaText: `PDF • Sheet Music`
                };
            }
            return {
                icon: '📄',
                metaText: `PDF • ${item.pages}`
            };
        default:
            return {
                icon: '📎',
                metaText: 'Media File'
            };
    }
}

// Download media file directly
function openMedia(item) {
    downloadMedia(item);
}

// Download media file
function downloadMedia(item) {
    // Create temporary download link
    const link = document.createElement('a');
    link.href = item.filePath;
    link.download = item.title || 'media-file';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showMessage(`Downloading ${item.title}...`, 'success');
}

// Filter functionality
function setupFilterControls() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active from all buttons
            filterButtons.forEach(b => b.classList.remove('active'));
            // Add active to clicked button
            this.classList.add('active');
            
            currentFilter = this.dataset.filter;
            displayMedia();
        });
    });
    
    // Sort control
    const sortSelect = document.getElementById('mediaSort');
    sortSelect.addEventListener('change', function() {
        currentSort = this.value;
        displayMedia();
    });
}

// Filter media by type
function filterMedia(media, filter) {
    if (filter === 'all') {
        return media;
    }
    
    return media.filter(item => {
        switch(filter) {
            case 'video':
                return item.type === 'video';
            case 'audio':
                return item.type === 'audio';
            case 'document':
                return item.type === 'document';
            default:
                return true;
        }
    });
}

// Sort media
function sortMedia(media, sortBy) {
    return [...media].sort((a, b) => {
        switch(sortBy) {
            case 'recent':
                return b.dateAdded - a.dateAdded;
            case 'title':
                return a.title.localeCompare(b.title);
            case 'type':
                return a.type.localeCompare(b.type);
            case 'uploader':
                return a.uploadedBy.localeCompare(b.uploadedBy);
            default:
                return 0;
        }
    });
}

// Search functionality
function setupSearch() {
    const searchInput = document.getElementById('mediaSearch');
    let searchTimeout;
    
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            performSearch(this.value);
        }, 300);
    });
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch(this.value);
        }
    });
}

// Perform search
function performSearch(query) {
    if (!query.trim()) {
        displayMedia();
        return;
    }
    
    const lowerQuery = query.toLowerCase();
    const searchResults = mediaLibrary.filter(item => 
        item.title.toLowerCase().includes(lowerQuery) ||
        item.subtitle.toLowerCase().includes(lowerQuery) ||
        item.uploadedBy.toLowerCase().includes(lowerQuery) ||
        (item.category && item.category.toLowerCase().includes(lowerQuery))
    );
    
    // Apply current filter to search results
    filteredMedia = filterMedia(searchResults, currentFilter);
    filteredMedia = sortMedia(filteredMedia, currentSort);
    
    const libraryContainer = document.getElementById('mediaLibrary');
    libraryContainer.innerHTML = '';
    
    if (filteredMedia.length === 0) {
        libraryContainer.innerHTML = `
            <div class="library-entry" style="justify-content: center; color: var(--text-muted);">
                <div class="entry-content" style="text-align: center;">
                    <h3>No results found for "${query}" 🔍</h3>
                    <p>Try adjusting your search terms or filters</p>
                </div>
            </div>
        `;
        return;
    }
    
    filteredMedia.forEach(item => {
        const entryElement = createLibraryEntry(item);
        libraryContainer.appendChild(entryElement);
    });
}

// Upload form functionality
function setupUploadForm() {
    const uploadForm = document.getElementById('mediaUploadForm');
    
    // Check if form exists (it won't on the main media page since upload moved to dedicated page)
    if (!uploadForm) {
        return;
    }
    
    uploadForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData();
        const fileInput = document.getElementById('mediaFile');
        const titleInput = document.getElementById('mediaTitle');
        const descriptionInput = document.getElementById('mediaDescription');
        const uploaderInput = document.getElementById('uploaderName');
        
        if (!fileInput.files[0]) {
            showMessage('Please select a file to upload', 'error');
            return;
        }
        
        if (!uploaderInput.value.trim()) {
            showMessage('Please enter your name', 'error');
            return;
        }
        
        formData.append('media_file', fileInput.files[0]);
        formData.append('title', titleInput.value.trim());
        formData.append('description', descriptionInput.value.trim());
        formData.append('uploader_name', uploaderInput.value.trim());
        formData.append('status', 'pending'); // Always pending for moderation
        
        try {
            const response = await fetch('/api/media.php?action=upload', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                showMessage('Media submitted successfully! It will appear after moderator approval.', 'success');
                closeUploadForm();
                uploadForm.reset();
            } else {
                const error = await response.json();
                showMessage(`Upload failed: ${error.message}`, 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            showMessage('Upload failed. Please try again.', 'error');
        }
    });
}

// Show/hide upload form

// Load more functionality (for pagination)
function loadMoreMedia() {
    // In a real implementation, this would load the next page of results
    showMessage('All media loaded', 'info');
}

// Update statistics
function updateStats() {
    const totalMediaEl = document.getElementById('totalMedia');
    const totalVideosEl = document.getElementById('totalVideos');
    const totalAudioEl = document.getElementById('totalAudio');
    const totalDocumentsEl = document.getElementById('totalDocuments');
    
    const totalMedia = mediaLibrary.length;
    const totalVideos = mediaLibrary.filter(item => item.type === 'video').length;
    const totalAudio = mediaLibrary.filter(item => item.type === 'audio').length;
    const totalDocuments = mediaLibrary.filter(item => item.type === 'document').length;
    
    if (totalMediaEl) animateNumber(totalMediaEl, totalMedia);
    if (totalVideosEl) animateNumber(totalVideosEl, totalVideos);
    if (totalAudioEl) animateNumber(totalAudioEl, totalAudio);
    if (totalDocumentsEl) animateNumber(totalDocumentsEl, totalDocuments);
}

// Update statistics for empty state
function updateStatsForEmpty() {
    const totalMediaEl = document.getElementById('totalMedia');
    const totalVideosEl = document.getElementById('totalVideos');
    const totalAudioEl = document.getElementById('totalAudio');
    const totalDocumentsEl = document.getElementById('totalDocuments');
    
    if (totalMediaEl) totalMediaEl.textContent = '0';
    if (totalVideosEl) totalVideosEl.textContent = '0';
    if (totalAudioEl) totalAudioEl.textContent = '0';
    if (totalDocumentsEl) totalDocumentsEl.textContent = '0';
}

// Animate number counting
function animateNumber(element, target) {
    const start = 0;
    const duration = 1000;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const current = Math.floor(start + (target - start) * progress);
        element.textContent = current;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// Utility functions
function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showMessage(text, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = text;
    messageDiv.style.cssText = `
        position: fixed;
        top: 2rem;
        right: 2rem;
        background: var(--glass-bg);
        border: 1px solid var(--glass-border);
        color: var(--text-primary);
        padding: 1rem 2rem;
        border-radius: var(--radius-lg);
        box-shadow: var(--glass-shadow);
        backdrop-filter: var(--glass-backdrop);
        z-index: 9999;
        animation: fadeIn 0.3s ease;
        max-width: 300px;
    `;
    
    if (type === 'error') {
        messageDiv.style.borderColor = 'var(--error)';
        messageDiv.style.color = 'var(--error)';
    } else if (type === 'success') {
        messageDiv.style.borderColor = 'var(--success)';
        messageDiv.style.color = 'var(--success)';
    }
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Global functions for HTML onclick handlers
window.loadMoreMedia = loadMoreMedia;
window.openMedia = openMedia;
window.downloadMedia = downloadMedia;


// Enhanced showMessage for admin actions
window.showMessage = showMessage;

// Add CSS for empty and error states
const stateStyles = document.createElement('style');
stateStyles.textContent = `
    .empty-state, .error-state {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 300px;
        padding: var(--spacing-xl);
        text-align: center;
    }
    
    .empty-state-content, .error-state-content {
        max-width: 400px;
    }
    
    .empty-state-icon, .error-state-icon {
        font-size: 4rem;
        margin-bottom: var(--spacing-lg);
        display: block;
    }
    
    .empty-state h2, .error-state h2 {
        color: var(--text-primary);
        margin-bottom: var(--spacing-md);
        font-size: var(--font-size-xl);
    }
    
    .empty-state p, .error-state p {
        color: var(--text-secondary);
        margin-bottom: var(--spacing-lg);
        font-size: var(--font-size-md);
        line-height: 1.5;
    }
    
    .btn {
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-md) var(--spacing-lg);
        border: none;
        border-radius: var(--radius-md);
        font-size: var(--font-size-md);
        font-weight: 500;
        cursor: pointer;
        transition: all var(--animation-fast);
        text-decoration: none;
    }
    
    .btn-primary {
        background: var(--primary);
        color: white;
    }
    
    .btn-primary:hover {
        background: var(--primary-dark);
        transform: translateY(-1px);
    }
    
    .btn-secondary {
        background: var(--glass-bg);
        color: var(--text-primary);
        border: 1px solid var(--glass-border);
    }
    
    .btn-secondary:hover {
        background: var(--glass-bg-hover);
        border-color: var(--primary-light);
    }
    
    .btn-icon {
        font-size: var(--font-size-sm);
    }
`;
document.head.appendChild(stateStyles);