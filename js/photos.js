// Photos Page JavaScript

// Initialize from PHP data
const photoData = window.photoGalleryData || {
    photos: [],
    albums: [],
    people: [],
    isAdmin: false,
    pendingCount: 0
};

let photoAlbums = photoData.photos;
let isAdmin = photoData.isAdmin;
let albumStats = photoData.albums;
let peopleTags = photoData.people;

// Album metadata for display customization
const albumMetadata = {
    'family': {
        title: 'Family Photos',
        date: '2024',
        coverEmoji: '👨‍👩‍👧‍👦',
        description: 'General family photos and memories'
    },
    'events': {
        title: 'Special Events',
        date: '2024',
        coverEmoji: '🎉',
        description: 'Celebrations and special occasions'
    },
    'holidays': {
        title: 'Holiday Memories',
        date: '2024',
        coverEmoji: '🎄',
        description: 'Holiday celebrations and traditions'
    },
    'birthdays': {
        title: 'Birthday Celebrations',
        date: '2024',
        coverEmoji: '🎂',
        description: 'Birthday parties and celebrations'
    },
    'weddings': {
        title: 'Wedding Memories',
        date: '2024',
        coverEmoji: '💍',
        description: 'Wedding ceremonies and celebrations'
    }
};

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Skip checkAdminStatus since we already have it from PHP
    if (isAdmin) {
        enableAdminMode();
    }
    
    // Load photos from API (not just PHP data)
    loadPhotoAlbums().then(() => {
        displayAllPhotos();
    }).catch(() => {
        // Fallback to PHP data if API fails
        displayAllPhotos();
    });
    setupViewControls();
    setupSearch();
    setupTagInput();
    setupModalHandlers();
    
    // Update pending count if admin
    if (isAdmin && photoData.pendingCount > 0) {
        const countEl = document.getElementById('pendingCount');
        if (countEl) countEl.textContent = photoData.pendingCount;
    }
});

// Listen for postMessage from admin module to open specific albums
window.addEventListener('message', function(event) {
    // Only accept messages from same origin
    if (event.origin !== window.location.origin) return;
    
    if (event.data.action === 'openAlbum' && event.data.albumId) {
        // Find the album and open it
        const albums = getAlbumsForDisplay();
        const album = albums.find(a => a.name === event.data.albumId);
        
        if (album) {
            setTimeout(() => {
                openAlbum(album);
            }, 500); // Small delay to ensure page is fully loaded
        }
    }
});

// Admin authentication detection
async function checkAdminStatus() {
    try {
        const response = await fetch('/api/user.php');
        if (response.ok) {
            const userData = await response.json();
            isAdmin = userData.is_admin || false;
            
            if (isAdmin) {
                enableAdminMode();
            }
        }
    } catch (error) {
        console.log('Database not connected - continuing as regular user');
        isAdmin = false;
    }
}

function enableAdminMode() {
    document.body.classList.add('admin-mode');
    showMessage('Admin mode enabled - use the admin panel for photo management', 'success');
}



async function loadPhotoAlbums() {
    try {
        const response = await fetch('/api/photo-albums.php');
        const data = await response.json();

        // Handle API response format
        if (!data.success || !Array.isArray(data.albums)) {
            console.warn('Invalid albums response format');
            photoAlbums = [];
            displayAlbums();
            return;
        }

        const albums = data.albums;
        
        // Helper function to ensure URL is absolute
        function ensureAbsoluteUrl(url) {
            if (!url) return '';
            if (url.startsWith('http://') || url.startsWith('https://')) {
                return url;
            } else if (url.includes('r2.cloudflarestorage.com')) {
                return 'https://' + url.replace(/^\/+/, '');
            }
            return url;
        }

        // Convert API data to our format with metadata
        photoAlbums = albums.map(album => {
            // Albums from API have photos with full R2 URLs
            const albumPhotos = album.photos || [];
            const coverPhotoData = albumPhotos.length > 0
                ? albumPhotos[Math.floor(Math.random() * albumPhotos.length)]
                : null;

            return {
                name: album.album_key || album.name,
                photoCount: parseInt(album.photo_count) || 0,
                // Ensure cover photo URL is absolute
                coverPhoto: coverPhotoData ? ensureAbsoluteUrl(coverPhotoData.src) : null,
                // Ensure all photo URLs are absolute
                photos: albumPhotos.map(photo => ({
                    src: ensureAbsoluteUrl(photo.src),
                    title: photo.title || `Photo from ${album.name}`,
                    desc: photo.desc || photo.description || `Family memory from ${album.name}`,
                    id: photo.id,
                    filename: photo.filename
                })),
                ...albumMetadata[album.name] || {
                    title: album.name,
                    date: "2024",
                    coverEmoji: "📸",
                    description: album.description || `${album.name} album`
                }
            };
        });
        
        displayAlbums();
    } catch (error) {
        console.error('Error loading photo albums:', error);
        // Fallback to empty state
        photoAlbums = [];
        displayAlbums();
    }
}

function displayAlbums() {
    const grid = document.getElementById('photoGrid');
    grid.innerHTML = '';
    
    photoAlbums.forEach(album => {
        const albumElement = createAlbumElement(album);
        grid.appendChild(albumElement);
    });
}

function createAlbumElement(album) {
    const albumDiv = document.createElement('div');
    albumDiv.className = 'photo-album';
    
    // Use photo cover if available, otherwise fallback to emoji
    const coverContent = album.coverPhoto 
        ? `<img src="${album.coverPhoto}" alt="${album.title}" class="album-cover-photo">`
        : `<div class="album-cover-text">${album.coverEmoji || '📸'}</div>`;
    
    albumDiv.innerHTML = `
        <div class="album-cover">
            ${coverContent}
            <div class="album-cover-overlay">
                <div class="album-overlay-text">${album.coverEmoji || '📸'}</div>
            </div>
        </div>
        <div class="album-info">
            <h3 class="album-title">${album.title}</h3>
            <div class="album-meta">
                <span>${album.date}</span>
                <span class="album-count">${album.photoCount} photos</span>
            </div>
        </div>
    `;
    
    // Set click handler to open album
    albumDiv.addEventListener('click', function(e) {
        openAlbum(album);
    });
    
    return albumDiv;
}

function openAlbum(album) {
    console.log('openAlbum called with:', album);
    
    if (album.photos && album.photos.length > 0) {
        // Open full page photo viewer
        window.open(`photo-viewer.php?album=${album.name}&photo=0`, '_blank');
    } else {
        console.log('No photos in album or album.photos is undefined');
        showMessage('No photos in this album');
    }
}

function openPhotoViewer(photo, albumName, photoIndex = 0) {
    console.log('🔥 PHOTO VIEWER FUNCTION CALLED!');
    console.log('Photo:', photo);
    console.log('Album:', albumName);
    console.log('Index:', photoIndex);
    
    // Open full page photo viewer
    window.open(`photo-viewer.php?album=${albumName}&photo=${photoIndex}`, '_blank');
}

function generatePhotoId(photoSrc, albumName) {
    // Generate a consistent ID for the photo based on its source and album
    const photoName = photoSrc.split('/').pop();
    return `${albumName}_${photoName}`.replace(/[^a-zA-Z0-9]/g, '_');
}

// Legacy modal functions - no longer needed with full page viewer
// These functions are kept for backward compatibility but redirect to full page viewer

// LEGACY EVENT HANDLERS REMOVED - UNIFIED MODAL SYSTEM HANDLES ALL EVENTS
// (Click outside, ESC key, close buttons all handled by unified-modal.js)

function showMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message success';
    messageDiv.textContent = text;
    messageDiv.style.cssText = `
        position: fixed;
        top: 2rem;
        right: 2rem;
        background: var(--eggshell);
        color: var(--black);
        padding: 1rem 2rem;
        border-radius: 8px;
        box-shadow: var(--shadow);
        z-index: 1000;
        animation: fadeIn 0.3s ease;
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// New functions for enhanced photo page
function setupViewControls() {
    const viewButtons = document.querySelectorAll('.view-btn');
    viewButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active from all buttons
            viewButtons.forEach(b => b.classList.remove('active'));
            // Add active to clicked button
            this.classList.add('active');
            
            const view = this.dataset.view;
            handleViewChange(view);
        });
    });
}

function handleViewChange(view) {
    const grid = document.getElementById('photoGrid');
    
    switch(view) {
        case 'albums':
            // Reset grid class to default album view
            grid.className = 'photo-grid';
            displayAlbums();
            break;
        case 'timeline':
            displayTimeline();
            break;
        case 'people':
            displayPeople();
            break;
        case 'all':
            displayAllPhotos();
            break;
    }
}

function displayAllPhotos() {
    const grid = document.getElementById('photoGrid');
    grid.innerHTML = '';
    grid.className = 'photo-grid all-photos-grid';

    photoAlbums.forEach(album => {
        album.photos.forEach((photo, index) => {
            const photoElement = document.createElement('div');
            photoElement.className = 'photo-item';
            photoElement.innerHTML = `
                <img src="${photo.src}" alt="${photo.title}" loading="lazy">
                <div class="photo-overlay">
                    <span class="photo-album-tag">${album.title}</span>
                </div>
            `;
            photoElement.onclick = () => openPhotoViewer(photo, album.name, index);
            grid.appendChild(photoElement);
        });
    });
}

function setupSearch() {
    const searchInput = document.getElementById('photoSearch');
    const searchIcon = document.querySelector('.search-icon');
    
    let searchTimeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            performSearch(this.value);
        }, 300);
    });
    
    searchIcon.addEventListener('click', function() {
        performSearch(searchInput.value);
    });
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch(this.value);
        }
    });
}

function performSearch(query) {
    if (!query.trim()) {
        displayAlbums();
        return;
    }
    
    const lowerQuery = query.toLowerCase();
    const filteredAlbums = photoAlbums.filter(album => 
        album.title.toLowerCase().includes(lowerQuery) ||
        album.description.toLowerCase().includes(lowerQuery) ||
        album.date.toLowerCase().includes(lowerQuery)
    );
    
    const grid = document.getElementById('photoGrid');
    grid.innerHTML = '';
    
    if (filteredAlbums.length === 0) {
        grid.innerHTML = `<div class="no-results">No albums found for "${query}" 🔍</div>`;
        return;
    }
    
    filteredAlbums.forEach(album => {
        const albumElement = createAlbumElement(album);
        grid.appendChild(albumElement);
    });
}

function updateStats() {
    // Update gallery statistics
    const totalPhotos = photoAlbums.reduce((sum, album) => sum + album.photoCount, 0);
    
    const albumCountEl = document.getElementById('albumCount');
    const photoCountEl = document.getElementById('photoCount');
    
    if (albumCountEl) albumCountEl.textContent = photoAlbums.length;
    if (photoCountEl) photoCountEl.textContent = totalPhotos;
    
    // Animate the numbers
    animateNumber(albumCountEl, photoAlbums.length);
    animateNumber(photoCountEl, totalPhotos);
}

function animateNumber(element, target) {
    if (!element) return;
    
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

// Timeline View Implementation
function displayTimeline() {
    const grid = document.getElementById('photoGrid');
    grid.innerHTML = ''; // Clear previous content
    grid.className = 'photo-grid timeline-grid';
    
    // Group photos by year
    const photosByYear = {};
    
    photoAlbums.forEach(album => {
        const year = extractYear(album.date);
        if (!photosByYear[year]) {
            photosByYear[year] = [];
        }
        
        album.photos.forEach((photo, index) => {
            photosByYear[year].push({
                ...photo,
                albumName: album.name,
                albumTitle: album.title,
                albumDate: album.date,
                photoIndex: index
            });
        });
    });
    
    // Sort years in descending order
    const sortedYears = Object.keys(photosByYear).sort((a, b) => b - a);
    
    // Create year jumper
    const yearJumper = createYearJumper(sortedYears);
    grid.appendChild(yearJumper);
    
    // Create timeline sections
    sortedYears.forEach(year => {
        const yearSection = createYearSection(year, photosByYear[year]);
        grid.appendChild(yearSection);
    });
}

function extractYear(dateStr) {
    const match = dateStr.match(/(\d{4})/);
    return match ? match[1] : new Date().getFullYear();
}

function createYearJumper(years) {
    const jumper = document.createElement('div');
    jumper.className = 'year-jumper';
    jumper.innerHTML = `
        <div class="year-jumper-header">
            <h3>📅 Jump to Year</h3>
        </div>
        <div class="year-buttons">
            ${years.map(year => `
                <button class="year-btn" data-year="${year}" onclick="scrollToYear('${year}')">
                    ${year}
                </button>
            `).join('')}
        </div>
    `;
    return jumper;
}

function createYearSection(year, photos) {
    const section = document.createElement('div');
    section.className = 'year-section';
    section.id = `year-${year}`;
    
    const header = document.createElement('div');
    header.className = 'year-header';
    header.innerHTML = `
        <h2 class="year-title">${year}</h2>
        <span class="year-count">${photos.length} photos</span>
    `;
    
    const photosGrid = document.createElement('div');
    photosGrid.className = 'year-photos-grid';
    
    photos.forEach(photo => {
        const photoElement = document.createElement('div');
        photoElement.className = 'timeline-photo-item';
        photoElement.innerHTML = `
            <img src="${photo.src}" alt="${photo.title}" loading="lazy">
            <div class="timeline-photo-overlay">
                <span class="timeline-photo-album">${photo.albumTitle}</span>
                <span class="timeline-photo-date">${photo.albumDate}</span>
            </div>
        `;
        photoElement.onclick = () => openPhotoViewer(photo, photo.albumName, photo.photoIndex);
        photosGrid.appendChild(photoElement);
    });
    
    section.appendChild(header);
    section.appendChild(photosGrid);
    
    return section;
}

function scrollToYear(year) {
    const yearSection = document.getElementById(`year-${year}`);
    if (yearSection) {
        yearSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Highlight the year button
        document.querySelectorAll('.year-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-year="${year}"]`).classList.add('active');
    }
}

// People View Implementation
function displayPeople() {
    const grid = document.getElementById('photoGrid');
    grid.className = 'photo-grid people-grid';
    
    // Load people with tagged photos from database
    loadPeopleWithPhotos();
}

async function loadPeopleWithPhotos() {
    try {
        const response = await fetch('/api/people.php?action=content');
        
        if (!response.ok) {
            showInstructionalPlaceholder();
            return;
        }
        
        const data = await response.json();
        const people = data.success ? (data.results || []) : [];
        
        const grid = document.getElementById('photoGrid');
        
        if (people.length === 0) {
            // Show instructions if no people are tagged yet
            grid.innerHTML = `
                <div class="people-placeholder">
                    <div class="people-header">
                        <h2>👥 People in Photos</h2>
                        <p>Start tagging people in your photos to see them organized here!</p>
                    </div>
                    <div class="tagging-instructions">
                        <div class="instruction-item">
                            <span class="instruction-icon">📸</span>
                            <span class="instruction-text">Click on any photo to add tags</span>
                        </div>
                        <div class="instruction-item">
                            <span class="instruction-icon">✏️</span>
                            <span class="instruction-text">Type names of people in the photo</span>
                        </div>
                        <div class="instruction-item">
                            <span class="instruction-icon">🔍</span>
                            <span class="instruction-text">Find photos of specific people instantly</span>
                        </div>
                    </div>
                </div>
            `;
            return;
        }
        
        // Display people with their photos
        grid.innerHTML = '';
        grid.className = 'photo-grid people-results-grid';
        
        people.forEach(person => {
            const personSection = createPersonSection(person);
            grid.appendChild(personSection);
        });
        
    } catch (error) {
        console.error('Error loading people with photos:', error);
        showInstructionalPlaceholder();
    }
}

function showInstructionalPlaceholder() {
    const grid = document.getElementById('photoGrid');
    grid.innerHTML = `
        <div class="people-placeholder">
            <div class="people-header">
                <h2>👥 People in Photos</h2>
                <p>Start tagging people in your photos to see them organized here!</p>
            </div>
            <div class="tagging-instructions">
                <div class="instruction-item">
                    <span class="instruction-icon">📸</span>
                    <span class="instruction-text">Click on any photo to add tags</span>
                </div>
                <div class="instruction-item">
                    <span class="instruction-icon">✏️</span>
                    <span class="instruction-text">Type names of people in the photo</span>
                </div>
                <div class="instruction-item">
                    <span class="instruction-icon">🔍</span>
                    <span class="instruction-text">Find photos of specific people instantly</span>
                </div>
            </div>
        </div>
    `;
}

function createPersonSection(person) {
    const section = document.createElement('div');
    section.className = 'person-section';
    
    section.innerHTML = `
        <div class="person-header">
            <h3 class="person-name">${person.name}</h3>
            <span class="person-photo-count">${person.photo_count} photos</span>
        </div>
        <div class="person-photos">
            ${person.photos.map(photo => `
                <div class="person-photo-item" onclick="openPhotoViewer(${JSON.stringify(photo)}, '${photo.album_name}', ${photo.photo_index})">
                    <img src="${photo.photo_src}" alt="${photo.photo_title}" loading="lazy">
                    <div class="person-photo-overlay">
                        <span class="person-photo-album">${photo.album_name}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    return section;
}

// Photo Tagging System
async function loadPhotoTags(photoId) {
    try {
        const response = await fetch(`/api/photo-tags/${photoId}`);
        
        // Handle 404 gracefully - API endpoint doesn't exist yet
        if (!response.ok) {
            displayCurrentTags([]);
            return;
        }
        
        const tags = await response.json();
        displayCurrentTags(tags);
        
    } catch (error) {
        console.error('Error loading photo tags:', error);
        displayCurrentTags([]);
    }
}

function displayCurrentTags(tags) {
    const currentTagsContainer = document.getElementById('currentTags');
    
    if (tags.length === 0) {
        currentTagsContainer.innerHTML = '<div class="no-tags-message">No people tagged yet</div>';
        return;
    }
    
    currentTagsContainer.innerHTML = tags.map(tag => `
        <div class="photo-tag">
            <span class="tag-name">${tag.person_name}</span>
            <button class="tag-remove-btn" onclick="removeTag(${tag.id}, '${tag.person_name}')" title="Remove tag">×</button>
        </div>
    `).join('');
}

async function addTag() {
    const tagInput = document.getElementById('newTagInput');
    const tagName = tagInput.value.trim();
    
    if (!tagName) {
        return;
    }
    
    if (!window.currentPhotoInfo) {
        console.error('No photo selected for tagging');
        return;
    }
    
    try {
        // First, search for or create the person
        const searchResponse = await fetch(`/api/people.php?action=search&q=${encodeURIComponent(tagName)}`);
        const searchData = await searchResponse.json();
        
        let personId;
        
        // Check if person exists
        const existingPerson = searchData.people?.find(p => 
            p.display_name.toLowerCase() === tagName.toLowerCase()
        );
        
        if (existingPerson) {
            personId = existingPerson.id;
        } else {
            // Create new person
            const createResponse = await fetch('/api/people.php?action=create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: tagName
                })
            });
            
            if (!createResponse.ok) {
                throw new Error('Failed to create person');
            }
            
            const createData = await createResponse.json();
            personId = createData.person_id;
        }
        
        // Now tag the photo with the person
        const tagResponse = await fetch('/api/people.php?action=tag', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                person_id: personId,
                content_type: 'photo',
                content_id: window.currentPhotoInfo.photoId
            })
        });
        
        if (tagResponse.ok) {
            tagInput.value = '';
            
            // Reload tags to show the new one
            loadPhotoTags(window.currentPhotoInfo.photoId);
            
            // Show success message
            showMessage(`Tagged ${tagName} in this photo!`);
        } else {
            const error = await tagResponse.json();
            showMessage(`Error: ${error.message || 'Failed to add tag'}`);
        }
        
    } catch (error) {
        console.error('Error adding tag:', error);
        showMessage('Error adding tag. Please try again.');
    }
}

async function removeTag(tagId, personName) {
    try {
        const response = await fetch(`/api/photo-tags/${tagId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            // Reload tags to show the removal
            loadPhotoTags(window.currentPhotoInfo.photoId);
            
            // Show success message
            showMessage(`Removed ${personName} from this photo`);
        } else {
            const error = await response.json();
            showMessage(`Error: ${error.message || 'Failed to remove tag'}`);
        }
        
    } catch (error) {
        console.error('Error removing tag:', error);
        showMessage('Error removing tag. Please try again.');
    }
}

// Enhanced search to include people
function performSearch(query) {
    if (!query.trim()) {
        // Return to current view
        const activeView = document.querySelector('.view-btn.active').dataset.view;
        handleViewChange(activeView);
        return;
    }
    
    const lowerQuery = query.toLowerCase();
    
    // Search albums
    const filteredAlbums = photoAlbums.filter(album => 
        album.title.toLowerCase().includes(lowerQuery) ||
        album.description.toLowerCase().includes(lowerQuery) ||
        album.date.toLowerCase().includes(lowerQuery)
    );
    
    // Also search people tags
    searchPeopleAndPhotos(lowerQuery, filteredAlbums);
}

async function searchPeopleAndPhotos(query, filteredAlbums) {
    try {
        const response = await fetch(`/api/photo-tags/search?q=${encodeURIComponent(query)}`);
        
        // Handle 404 gracefully - API endpoint doesn't exist yet
        let peopleResults = [];
        if (response.ok) {
            peopleResults = await response.json();
        }
        
        const grid = document.getElementById('photoGrid');
        grid.className = 'photo-grid search-results-grid';
        grid.innerHTML = '';
        
        // Show album results
        if (filteredAlbums.length > 0) {
            const albumsHeader = document.createElement('div');
            albumsHeader.className = 'search-section-header';
            albumsHeader.innerHTML = `<h3>📁 Albums (${filteredAlbums.length})</h3>`;
            grid.appendChild(albumsHeader);
            
            filteredAlbums.forEach(album => {
                const albumElement = createAlbumElement(album);
                grid.appendChild(albumElement);
            });
        }
        
        // Show people results
        if (peopleResults.length > 0) {
            const peopleHeader = document.createElement('div');
            peopleHeader.className = 'search-section-header';
            peopleHeader.innerHTML = `<h3>👥 People (${peopleResults.length})</h3>`;
            grid.appendChild(peopleHeader);
            
            peopleResults.forEach(result => {
                const photoElement = document.createElement('div');
                photoElement.className = 'search-photo-item';
                photoElement.innerHTML = `
                    <img src="${result.photo_src}" alt="${result.photo_title}" loading="lazy">
                    <div class="search-photo-overlay">
                        <span class="search-photo-person">${result.person_name}</span>
                        <span class="search-photo-album">${result.album_name}</span>
                    </div>
                `;
                photoElement.onclick = () => openPhotoViewer(result, result.album_name, result.photo_index);
                grid.appendChild(photoElement);
            });
        }
        
        // Show no results message
        if (filteredAlbums.length === 0 && peopleResults.length === 0) {
            grid.innerHTML = `<div class="no-results">No results found for "${query}" 🔍</div>`;
        }
        
    } catch (error) {
        console.error('Error searching people and photos:', error);
        
        // Fallback to album search only
        const grid = document.getElementById('photoGrid');
        grid.innerHTML = '';
        
        if (filteredAlbums.length === 0) {
            grid.innerHTML = `<div class="no-results">No albums found for "${query}" 🔍</div>`;
            return;
        }
        
        filteredAlbums.forEach(album => {
            const albumElement = createAlbumElement(album);
            grid.appendChild(albumElement);
        });
    }
}

// Setup tag input keyboard handlers
function setupTagInput() {
    const tagInput = document.getElementById('newTagInput');
    
    if (!tagInput) {
        console.log('Tag input element not found, skipping tag input setup');
        return;
    }
    
    tagInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTag();
        }
    });
    
    tagInput.addEventListener('input', function(e) {
        const addButton = document.querySelector('.add-tag-btn');
        addButton.disabled = !e.target.value.trim();
    });
}

// Setup modal close handlers
function setupModalHandlers() {
    // Close button handler
    const closeButtons = document.querySelectorAll('.photo-modal .close-modal, .photo-modal .modal-close');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', closePhotoModal);
    });
    
    // Click outside to close
    const modal = document.getElementById('photoModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closePhotoModal();
            }
        });
    }
    
    // ESC key to close
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('photoModal');
            if (modal && modal.classList.contains('active')) {
                closePhotoModal();
            }
        }
    });
}



// Enhanced showMessage function with better styling
function showMessage(text, type = 'success') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = text;
    
    const colors = {
        success: { bg: '#f0fdf4', text: '#166534', border: '#86efac' },
        error: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
        info: { bg: '#f0f9ff', text: '#1e40af', border: '#93c5fd' }
    };
    
    const color = colors[type] || colors.info;
    
    messageDiv.style.cssText = `
        position: fixed;
        top: 80px;
        right: 2rem;
        background: ${color.bg};
        color: ${color.text};
        border: 1px solid ${color.border};
        padding: 1rem 2rem;
        border-radius: var(--radius-md);
        box-shadow: var(--glass-shadow);
        z-index: 9999;
        animation: slideIn 0.3s ease;
        font-weight: 500;
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => messageDiv.remove(), 300);
    }, 3000);
}