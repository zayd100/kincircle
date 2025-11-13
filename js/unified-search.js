// Unified Search - Search people across all content types

class UnifiedSearch {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.results = [];
        this.init();
    }
    
    init() {
        this.renderSearchInterface();
        this.setupEventListeners();
    }
    
    renderSearchInterface() {
        this.container.innerHTML = `
            <div class="unified-search">
                <div class="search-input-container">
                    <input type="text" 
                           id="unifiedSearchInput" 
                           placeholder="Search for people..." 
                           class="search-input">
                    <button type="button" class="search-btn" onclick="unifiedSearch.performSearch()">
                        🔍
                    </button>
                </div>
                <div class="search-filters">
                    <select id="searchContentType">
                        <option value="all">All Content</option>
                        <option value="photo">Photos Only</option>
                        <option value="media">Media Only</option>
                    </select>
                </div>
                <div class="search-results" id="searchResults" style="display: none;">
                    <!-- Search results will appear here -->
                </div>
            </div>
        `;
    }
    
    setupEventListeners() {
        const searchInput = document.getElementById('unifiedSearchInput');
        
        searchInput.addEventListener('input', (e) => {
            if (e.target.value.length >= 2) {
                this.performSearch();
            } else {
                this.hideResults();
            }
        });
        
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.performSearch();
            }
        });
        
        document.getElementById('searchContentType').addEventListener('change', () => {
            if (searchInput.value.length >= 2) {
                this.performSearch();
            }
        });
    }
    
    async performSearch() {
        const query = document.getElementById('unifiedSearchInput').value.trim();
        const contentType = document.getElementById('searchContentType').value;
        
        if (query.length < 2) {
            this.hideResults();
            return;
        }
        
        try {
            const response = await fetch(`/api/search.php?q=${encodeURIComponent(query)}&type=${contentType}`);
            const data = await response.json();
            
            if (data.success) {
                this.results = data.results;
                this.showResults();
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    }
    
    showResults() {
        const resultsContainer = document.getElementById('searchResults');
        
        if (this.results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <p>No content found for this search.</p>
                </div>
            `;
        } else {
            resultsContainer.innerHTML = this.results.map(result => this.renderPersonResult(result)).join('');
        }
        
        resultsContainer.style.display = 'block';
    }
    
    renderPersonResult(result) {
        const person = result.person;
        const content = result.content;
        const photoCount = content.photos?.length || 0;
        const mediaCount = content.media?.length || 0;
        
        return `
            <div class="person-result">
                <div class="person-header">
                    <h3>${person.display_name}</h3>
                    <span class="content-counts">
                        ${photoCount > 0 ? `${photoCount} photos` : ''}
                        ${photoCount > 0 && mediaCount > 0 ? ', ' : ''}
                        ${mediaCount > 0 ? `${mediaCount} media` : ''}
                    </span>
                </div>
                
                <div class="content-preview">
                    ${this.renderContentGrid(content)}
                </div>
            </div>
        `;
    }
    
    renderContentGrid(content) {
        const allContent = [];
        
        // Add photos
        if (content.photos) {
            allContent.push(...content.photos.map(item => ({...item, type: 'photo'})));
        }
        
        // Add media
        if (content.media) {
            allContent.push(...content.media.map(item => ({...item, type: 'media'})));
        }
        
        // Sort by date
        allContent.sort((a, b) => {
            const dateA = new Date(a.date_taken || a.created_at);
            const dateB = new Date(b.date_taken || b.created_at);
            return dateB - dateA;
        });
        
        return `
            <div class="content-grid">
                ${allContent.slice(0, 6).map(item => this.renderContentItem(item)).join('')}
                ${allContent.length > 6 ? `<div class="more-content">+${allContent.length - 6} more</div>` : ''}
            </div>
        `;
    }
    
    renderContentItem(item) {
        if (item.type === 'photo') {
            return `
                <div class="content-item photo-item">
                    <img src="${item.file_path}" alt="${item.event_name || 'Photo'}" loading="lazy">
                    <div class="content-overlay">
                        <span class="content-type">📷</span>
                        <span class="content-date">${this.formatDate(item.date_taken)}</span>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="content-item media-item">
                    <div class="media-placeholder">
                        ${this.getMediaIcon(item.filename)}
                    </div>
                    <div class="content-overlay">
                        <span class="content-type">${this.getMediaTypeLabel(item.filename)}</span>
                        <span class="content-date">${this.formatDate(item.created_at)}</span>
                    </div>
                </div>
            `;
        }
    }
    
    getMediaIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        if (['mp4', 'mov', 'avi', 'wmv'].includes(ext)) return '🎥';
        if (['mp3', 'wav', 'm4a'].includes(ext)) return '🎵';
        if (['pdf'].includes(ext)) return '📄';
        if (['doc', 'docx'].includes(ext)) return '📝';
        return '📁';
    }
    
    getMediaTypeLabel(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        if (['mp4', 'mov', 'avi', 'wmv'].includes(ext)) return 'Video';
        if (['mp3', 'wav', 'm4a'].includes(ext)) return 'Audio';
        if (['pdf', 'doc', 'docx'].includes(ext)) return 'Document';
        return 'File';
    }
    
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }
    
    hideResults() {
        const resultsContainer = document.getElementById('searchResults');
        resultsContainer.style.display = 'none';
    }
}

// Global instance
let unifiedSearch;