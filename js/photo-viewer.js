// Photo Viewer Full Page - Premium Experience

// Global state
let currentAlbum = null;
let currentPhotoIndex = 0;
let allPhotos = [];
let isAdmin = false;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    checkAdminStatus();
    loadPhotoFromURL();
    setupKeyboardNavigation();
    setupTagInput();
});

// Admin authentication detection
async function checkAdminStatus() {
    try {
        // Temporary: Enable admin mode for testing
        // TODO: Replace with actual API call when database is ready
        isAdmin = true;
        if (isAdmin) {
            enableAdminMode();
        }
    } catch (error) {
        console.log('Admin check failed, continuing as regular user');
        isAdmin = false;
    }
}

function enableAdminMode() {
    document.body.classList.add('admin-mode');
    
    // Add admin section to sidebar after DOM is loaded
    setTimeout(() => {
        addAdminSection();
    }, 500);
}

// Load photo based on URL parameters
function loadPhotoFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const albumName = urlParams.get('album');
    const photoIndex = parseInt(urlParams.get('photo')) || 0;
    
    if (albumName) {
        loadAlbumAndPhoto(albumName, photoIndex);
    } else {
        showError('No album specified');
    }
}

// Load album data and display photo
async function loadAlbumAndPhoto(albumName, photoIndex) {
    try {
        // Show loading state
        showLoading(true);
        
        // Fetch album data
        const response = await fetch('/api/photo-albums.php');
        const data = await response.json();

        // Handle API response format
        const albums = data.albums || data;

        // Find the requested album
        const album = albums.find(a => a.name === albumName);
        if (!album) {
            showError('Album not found');
            return;
        }
        
        // Process album data
        currentAlbum = processAlbumData(album, albumName);
        allPhotos = currentAlbum.photos;
        currentPhotoIndex = Math.max(0, Math.min(photoIndex, allPhotos.length - 1));
        
        // Display the photo
        displayPhoto();
        updateUI();
        
    } catch (error) {
        console.error('Error loading album:', error);
        showError('Failed to load album');
    } finally {
        showLoading(false);
    }
}

// Process album data with metadata
function processAlbumData(album, albumName) {
    return {
        name: albumName,
        title: album.display_name || album.title || albumName,
        date: album.date || album.date_range || '',
        description: album.description || '',
        photos: album.photos.map(photo => {
            // Handle both old string format and new object format
            if (typeof photo === 'string') {
                // For strings, check if already absolute URL
                const src = photo.startsWith('http') ? photo : `../../${photo}`;
                return {
                    src: src,
                    filename: photo.split('/').pop()
                };
            } else {
                // For objects, ensure URL is absolute (R2 URLs)
                let src = photo.src || '';

                // Check if it's an absolute URL
                if (src.startsWith('http://') || src.startsWith('https://')) {
                    // Already absolute, use as-is
                } else if (src.includes('r2.cloudflarestorage.com')) {
                    // Has R2 domain but missing protocol - add it
                    src = 'https://' + src.replace(/^\/+/, '');
                } else if (src) {
                    // Relative path, prepend path
                    src = `../../${src}`;
                }

                return {
                    id: photo.id || null,
                    src: src,
                    filename: photo.filename,
                    title: photo.title || null,
                    desc: photo.desc || photo.description || null,
                    date: photo.date || null,
                    event: photo.event || null,
                    location: photo.location || null,
                    city: photo.city || null,
                    state: photo.state || null
                };
            }
        })
    };
}

// Display current photo
function displayPhoto() {
    if (!allPhotos || !allPhotos[currentPhotoIndex]) {
        showError('Photo not found');
        return;
    }

    const photo = allPhotos[currentPhotoIndex];
    const photoElement = document.getElementById('mainPhoto');
    const photoContainer = document.querySelector('.photo-container');

    // Show loading
    photoContainer.classList.add('loading');

    // Update photo
    photoElement.src = photo.src;
    photoElement.alt = photo.title;
    
    // Handle load/error
    photoElement.onload = () => {
        photoContainer.classList.remove('loading');
        updateURL();
    };
    
    photoElement.onerror = () => {
        // Only try fallback once to prevent infinite loop
        if (!photoElement.dataset.retried) {
            photoElement.dataset.retried = 'true';
            // For R2 URLs, don't try to modify the path
            if (photo.src && !photo.src.startsWith('http')) {
                const altPath = photo.src.replace('../../', '../');
                photoElement.src = altPath;
            } else {
                // Show placeholder for failed external URLs
                photoElement.src = '/images/placeholder.png';
                console.error('Failed to load image:', photo.src);
            }
        }
    };
    
    // Load tags for this photo
    loadPhotoTags();
}

// Update UI elements
function updateUI() {
    if (!currentAlbum) return;

    const photo = allPhotos[currentPhotoIndex];

    // Update title and description
    document.getElementById('albumTitle').textContent = photo?.title || currentAlbum.title;
    document.getElementById('albumDescription').textContent = photo?.desc || currentAlbum.description;

    // Update photo position
    const totalPhotos = allPhotos.length;
    const positionText = `${currentPhotoIndex + 1} of ${totalPhotos}`;
    document.getElementById('photoPosition').textContent = positionText;
    document.getElementById('photoPositionDetail').textContent = positionText;

    // Update details - show photo-specific info when available
    document.getElementById('photoAlbumName').textContent = photo?.event || currentAlbum.title;
    document.getElementById('photoDate').textContent = photo?.date || currentAlbum.date || 'Date not set';
    document.getElementById('photoDescription').textContent = photo?.desc || currentAlbum.description || 'No description';

    // Show location if available
    const locationItem = document.getElementById('photoLocationItem');
    const locationSpan = document.getElementById('photoLocation');
    if (photo?.location || photo?.city || photo?.state) {
        const locationParts = [photo.location, photo.city, photo.state].filter(Boolean);
        locationSpan.textContent = locationParts.join(', ');
        locationItem.style.display = '';
    } else {
        locationItem.style.display = 'none';
    }

    // Update navigation buttons
    updateNavigationButtons();
}

// Update navigation button states
function updateNavigationButtons() {
    const prevBtn = document.getElementById('prevPhotoBtn');
    const nextBtn = document.getElementById('nextPhotoBtn');
    
    if (prevBtn) {
        prevBtn.disabled = currentPhotoIndex <= 0;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPhotoIndex >= allPhotos.length - 1;
    }
}

// Navigate to next/previous photo
function navigatePhoto(direction) {
    const newIndex = currentPhotoIndex + direction;
    
    if (newIndex >= 0 && newIndex < allPhotos.length) {
        currentPhotoIndex = newIndex;
        displayPhoto();
        updateUI();
    }
}

// Update URL without page reload
function updateURL() {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('photo', currentPhotoIndex.toString());
    
    const newURL = `${window.location.pathname}?${urlParams.toString()}`;
    window.history.replaceState({}, '', newURL);
}

// Keyboard navigation
function setupKeyboardNavigation() {
    document.addEventListener('keydown', function(e) {
        switch(e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                navigatePhoto(-1);
                break;
            case 'ArrowRight':
                e.preventDefault();
                navigatePhoto(1);
                break;
            case 'Escape':
                e.preventDefault();
                window.history.back();
                break;
        }
    });
}

// Photo tagging functionality
function setupTagInput() {
    const tagInput = document.getElementById('newTagInput');
    if (tagInput) {
        tagInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
            }
        });
    }
}

// Load photo tags
async function loadPhotoTags() {
    if (!currentAlbum || !allPhotos[currentPhotoIndex]) return;

    const photo = allPhotos[currentPhotoIndex];

    if (!photo.id) {
        console.log('Photo ID not available for loading tags');
        displayCurrentTags([]);
        return;
    }

    try {
        const response = await fetch(`/api/photo-tags/${photo.id}`);

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

// Display current tags
function displayCurrentTags(tags) {
    const tagsContainer = document.getElementById('currentTags');
    if (!tagsContainer) {
        console.error('Tags container not found!');
        return;
    }

    console.log('Displaying tags:', tags);

    if (!tags || tags.length === 0) {
        tagsContainer.innerHTML = '<p class="no-tags">No people tagged yet</p>';
        return;
    }

    tagsContainer.innerHTML = tags.map(tag => `
        <div class="photo-tag">
            ${tag.person_name}
            <button class="tag-remove-btn" onclick="removeTag(${tag.id})">×</button>
        </div>
    `).join('');

    console.log('Tags displayed, HTML:', tagsContainer.innerHTML);
}

// Add new tag
async function addTag() {
    const tagInput = document.getElementById('newTagInput');
    const tagName = tagInput.value.trim();

    if (!tagName) return;

    if (!currentAlbum || !allPhotos[currentPhotoIndex]) {
        showMessage('No photo selected for tagging');
        return;
    }

    const photo = allPhotos[currentPhotoIndex];

    if (!photo.id) {
        showMessage('Photo ID not available');
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
                content_id: photo.id
            })
        });
        
        if (tagResponse.ok) {
            tagInput.value = '';
            loadPhotoTags();
            showMessage(`Tagged ${tagName} in this photo!`);
        } else {
            showMessage('Failed to add tag', 'error');
        }
        
    } catch (error) {
        console.error('Error adding tag:', error);
        showMessage('Failed to add tag', 'error');
    }
}

// Remove tag
async function removeTag(tagId) {
    try {
        const response = await fetch(`/api/photo-tags/${tagId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadPhotoTags();
            showMessage('Tag removed');
        } else {
            showMessage('Failed to remove tag', 'error');
        }
        
    } catch (error) {
        console.error('Error removing tag:', error);
        showMessage('Failed to remove tag', 'error');
    }
}

// Generate photo ID
function generatePhotoId(photoSrc, albumName) {
    const photoName = photoSrc.split('/').pop();
    return `${albumName}_${photoName}`.replace(/[^a-zA-Z0-9]/g, '_');
}

// Action functions
function downloadPhoto() {
    if (!allPhotos[currentPhotoIndex]) return;
    
    const photo = allPhotos[currentPhotoIndex];
    const link = document.createElement('a');
    link.href = photo.src;
    link.download = `family-photo-${currentPhotoIndex + 1}.jpg`;
    link.click();
}


// Utility functions
function showLoading(show) {
    const photoContainer = document.querySelector('.photo-container');
    if (photoContainer) {
        photoContainer.classList.toggle('loading', show);
    }
}

function showError(message) {
    const albumTitle = document.getElementById('albumTitle');
    const albumDescription = document.getElementById('albumDescription');
    
    if (albumTitle) albumTitle.textContent = 'Error';
    if (albumDescription) albumDescription.textContent = message;
    
    showMessage(message, 'error');
}

function showMessage(text, type = 'success') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = text;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? 'var(--error)' : 'var(--success)'};
        color: white;
        padding: var(--spacing-md) var(--spacing-lg);
        border-radius: var(--radius-md);
        box-shadow: var(--glass-shadow);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 300);
    }, 3000);
}

// Admin functionality
function addAdminSection() {
    const sidebar = document.querySelector('.photo-info-sidebar');
    if (!sidebar || !isAdmin) return;
    
    const adminSection = document.createElement('div');
    adminSection.className = 'photo-admin-section';
    adminSection.innerHTML = `
        <div class="admin-section-header">
            <h3>🛠️ Admin Actions</h3>
        </div>
        <div class="admin-actions">
            <button class="admin-action-btn" onclick="editPhotoDetails()">
                <span class="action-icon">✏️</span>
                <span class="action-text">Edit Details</span>
            </button>
            <button class="admin-action-btn" onclick="editPhotoLocation()">
                <span class="action-icon">📍</span>
                <span class="action-text">Edit Location</span>
            </button>
            <button class="admin-action-btn" onclick="changePhotoAlbum()">
                <span class="action-icon">📁</span>
                <span class="action-text">Move Album</span>
            </button>
            <button class="admin-action-btn" onclick="changePhotoDate()">
                <span class="action-icon">📅</span>
                <span class="action-text">Change Date</span>
            </button>
            <button class="admin-action-btn" onclick="managePhotoTags()">
                <span class="action-icon">🏷️</span>
                <span class="action-text">Manage Tags</span>
            </button>
            <button class="admin-action-btn danger" onclick="deletePhoto()">
                <span class="action-icon">🗑️</span>
                <span class="action-text">Delete Photo</span>
            </button>
        </div>
    `;
    
    // Insert before the photo actions section
    const photoActions = sidebar.querySelector('.photo-actions');
    sidebar.insertBefore(adminSection, photoActions);
}

function editPhotoDetails() {
    if (!isAdmin) return;

    closePhotoAdminModal();

    const photo = allPhotos[currentPhotoIndex];
    const currentTitle = photo?.title || '';
    const currentDescription = photo?.desc || '';
    const currentDate = photo?.date || '';

    const modalHTML = `
        <div class="admin-modal-overlay" id="detailsModalOverlay">
            <div class="admin-modal">
                <div class="admin-modal-header">
                    <h3>✏️ Edit Photo Details</h3>
                    <button class="modal-close" id="closeDetailsModal">×</button>
                </div>
                <div class="admin-modal-body">
                    <div class="form-group">
                        <label for="editPhotoTitle">Photo Title</label>
                        <input type="text" id="editPhotoTitle" class="form-input" value="${currentTitle}" placeholder="Custom title for this photo">
                    </div>
                    <div class="form-group">
                        <label for="editPhotoDescription">Description</label>
                        <textarea id="editPhotoDescription" class="form-input" rows="3" placeholder="Describe what's happening in this photo">${currentDescription}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="editPhotoDate">Date Taken</label>
                        <input type="text" id="editPhotoDate" class="form-input" value="${currentDate}" placeholder="e.g., 2024-07-14 or Summer 2003">
                        <small class="form-help">Can be exact (YYYY-MM-DD) or approximate (Summer 2003, 1980s, etc.)</small>
                    </div>
                    <div class="form-group">
                        <label for="editPhotoLocation">Location</label>
                        <input type="text" id="editPhotoLocation" class="form-input" value="${photo?.location || ''}" placeholder="e.g., Grandma's House, Central Park">
                    </div>
                    <div class="form-group">
                        <label for="editPhotoCity">City</label>
                        <input type="text" id="editPhotoCity" class="form-input" value="${photo?.city || ''}" placeholder="e.g., Eugene">
                    </div>
                    <div class="form-group">
                        <label for="editPhotoState">State/Region</label>
                        <input type="text" id="editPhotoState" class="form-input" value="${photo?.state || ''}" placeholder="e.g., Oregon">
                    </div>
                </div>
                <div class="admin-modal-footer">
                    <button class="btn btn-secondary" id="cancelDetailsModal">Cancel</button>
                    <button class="btn btn-primary" id="saveDetailsBtn">Save Changes</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
        console.log('Attaching event listeners');

        const closeBtn = document.getElementById('closeDetailsModal');
        const cancelBtn = document.getElementById('cancelDetailsModal');
        const saveBtn = document.getElementById('saveDetailsBtn');
        const overlay = document.getElementById('detailsModalOverlay');

        console.log('closeBtn:', closeBtn);
        console.log('cancelBtn:', cancelBtn);
        console.log('saveBtn:', saveBtn);
        console.log('overlay:', overlay);

        if (closeBtn) {
            closeBtn.addEventListener('click', function(e) {
                console.log('Close button clicked');
                e.stopPropagation();
                closePhotoAdminModal();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', function(e) {
                console.log('Cancel button clicked');
                e.stopPropagation();
                closePhotoAdminModal();
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', function(e) {
                console.log('Save button clicked');
                console.log('Attempting to call savePhotoDetails');
                e.stopPropagation();
                try {
                    savePhotoDetails();
                    console.log('savePhotoDetails called successfully');
                } catch (error) {
                    console.error('Error calling savePhotoDetails:', error);
                }
            });
        }

        if (overlay) {
            overlay.addEventListener('click', function(e) {
                console.log('Overlay clicked, target:', e.target, 'this:', this);
                if (e.target === this) {
                    console.log('Closing modal from overlay click');
                    closePhotoAdminModal();
                }
            });
        }
    }, 10);
}

function editPhotoLocation() {
    if (!isAdmin) return;

    closePhotoAdminModal();

    const photo = allPhotos[currentPhotoIndex];
    const currentLocation = photo?.location || '';
    const currentCity = photo?.city || '';
    const currentState = photo?.state || '';

    const modalHTML = `
        <div class="admin-modal-overlay" id="locationModalOverlay">
            <div class="admin-modal">
                <div class="admin-modal-header">
                    <h3>📍 Edit Photo Location</h3>
                    <button class="modal-close" id="closeLocationModal">×</button>
                </div>
                <div class="admin-modal-body">
                    <div class="form-group">
                        <label for="photoLocation">Location</label>
                        <input type="text" id="photoLocation" class="form-input" value="${currentLocation}" placeholder="e.g., Grandma's House, Central Park">
                    </div>
                    <div class="form-group">
                        <label for="photoCity">City</label>
                        <input type="text" id="photoCity" class="form-input" value="${currentCity}" placeholder="e.g., Eugene">
                    </div>
                    <div class="form-group">
                        <label for="photoState">State/Region</label>
                        <input type="text" id="photoState" class="form-input" value="${currentState}" placeholder="e.g., Oregon">
                    </div>
                </div>
                <div class="admin-modal-footer">
                    <button class="btn btn-secondary" id="cancelLocationModal">Cancel</button>
                    <button class="btn btn-primary" id="saveLocationBtn">Save Location</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    setTimeout(() => {
        const closeBtn = document.getElementById('closeLocationModal');
        const cancelBtn = document.getElementById('cancelLocationModal');
        const saveBtn = document.getElementById('saveLocationBtn');
        const overlay = document.getElementById('locationModalOverlay');

        if (closeBtn) closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closePhotoAdminModal(); });
        if (cancelBtn) cancelBtn.addEventListener('click', (e) => { e.stopPropagation(); closePhotoAdminModal(); });
        if (saveBtn) saveBtn.addEventListener('click', (e) => { e.stopPropagation(); savePhotoLocation(); });
        if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) closePhotoAdminModal(); });
    }, 10);
}

async function changePhotoAlbum() {
    if (!isAdmin) return;

    closePhotoAdminModal();

    try {
        // Fetch available albums
        const response = await fetch('/api/photo-albums.php');
        const data = await response.json();
        const albums = data.albums || [];

        // Filter out current album and build options
        const albumOptions = albums
            .filter(a => a.name !== currentAlbum.name)
            .map(a => `<option value="${a.name}">${a.display_name || a.name}</option>`)
            .join('');

        const modalHTML = `
            <div class="admin-modal-overlay">
                <div class="admin-modal">
                    <div class="admin-modal-header">
                        <h3>📁 Move Photo to Different Album</h3>
                        <button class="modal-close" id="closeAlbumModal">×</button>
                    </div>
                    <div class="admin-modal-body">
                        <div class="form-group">
                            <label for="targetAlbum">Target Album</label>
                            <select id="targetAlbum" class="form-input">
                                <option value="">Select album...</option>
                                ${albumOptions}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Current Album:</label>
                            <p style="margin-top: 8px;"><strong>${currentAlbum?.title || currentAlbum?.name || 'Unknown'}</strong></p>
                        </div>
                    </div>
                    <div class="admin-modal-footer">
                        <button class="btn btn-secondary" id="cancelAlbumModal">Cancel</button>
                        <button class="btn btn-primary" id="moveAlbumBtn">Move Photo</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        setTimeout(() => {
            const closeBtn = document.getElementById('closeAlbumModal');
            const cancelBtn = document.getElementById('cancelAlbumModal');
            const moveBtn = document.getElementById('moveAlbumBtn');
            const overlay = document.querySelector('.admin-modal-overlay');

            if (closeBtn) closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closePhotoAdminModal(); });
            if (cancelBtn) cancelBtn.addEventListener('click', (e) => { e.stopPropagation(); closePhotoAdminModal(); });
            if (moveBtn) moveBtn.addEventListener('click', (e) => { e.stopPropagation(); movePhotoToAlbum(); });
            if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) closePhotoAdminModal(); });
        }, 10);
    } catch (error) {
        console.error('Error loading albums:', error);
        showMessage('Failed to load albums', 'error');
    }
}

function changePhotoDate() {
    if (!isAdmin) return;

    closePhotoAdminModal();

    const photo = allPhotos[currentPhotoIndex];
    const currentDate = photo?.date || '';

    // Parse current date if it exists
    let dateValue = '';
    let timeValue = '';
    if (currentDate) {
        const parts = currentDate.split(' ');
        dateValue = parts[0] || '';
        timeValue = parts[1] ? parts[1].substring(0, 5) : ''; // Get HH:MM only
    }

    const modalHTML = `
        <div class="admin-modal-overlay">
            <div class="admin-modal">
                <div class="admin-modal-header">
                    <h3>📅 Change Photo Date</h3>
                    <button class="modal-close" id="closeDateModal">×</button>
                </div>
                <div class="admin-modal-body">
                    <div class="form-group">
                        <label for="photoNewDate">Date Photo Was Taken</label>
                        <input type="text" id="photoNewDate" class="form-input" value="${currentDate}" placeholder="e.g., 2024-07-14 or Summer 2003">
                        <small class="form-help">Can be exact (YYYY-MM-DD) or approximate (Summer 2003, 1980s, etc.)</small>
                    </div>
                    <div class="form-group">
                        <label>Current Date: ${currentDate || 'Not set'}</label>
                    </div>
                </div>
                <div class="admin-modal-footer">
                    <button class="btn btn-secondary" id="cancelDateModal">Cancel</button>
                    <button class="btn btn-primary" id="saveDateBtn">Update Date</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    setTimeout(() => {
        const closeBtn = document.getElementById('closeDateModal');
        const cancelBtn = document.getElementById('cancelDateModal');
        const saveBtn = document.getElementById('saveDateBtn');
        const overlay = document.querySelector('.admin-modal-overlay');

        if (closeBtn) closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closePhotoAdminModal(); });
        if (cancelBtn) cancelBtn.addEventListener('click', (e) => { e.stopPropagation(); closePhotoAdminModal(); });
        if (saveBtn) saveBtn.addEventListener('click', (e) => { e.stopPropagation(); savePhotoDate(); });
        if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) closePhotoAdminModal(); });
    }, 10);
}

async function managePhotoTags() {
    if (!isAdmin) return;

    closePhotoAdminModal();

    const modalHTML = `
        <div class="admin-modal-overlay">
            <div class="admin-modal">
                <div class="admin-modal-header">
                    <h3>🏷️ Manage People Tags</h3>
                    <button class="modal-close" id="closeTagsModal">×</button>
                </div>
                <div class="admin-modal-body">
                    <div class="form-group">
                        <label>Currently Tagged People</label>
                        <div id="adminCurrentTags" class="admin-tags-list">
                            <p style="color: var(--text-secondary); font-style: italic;">Loading tags...</p>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="newTagName">Add Person Tag</label>
                        <input type="text" id="newTagName" class="form-input" placeholder="Enter person's name">
                        <button class="btn btn-primary" id="addTagBtn" style="margin-top: 8px; width: 100%;">Add Tag</button>
                    </div>
                    <div class="form-group">
                        <label for="bulkTags">Bulk Add (comma-separated)</label>
                        <input type="text" id="bulkTags" class="form-input" placeholder="Mom, Dad, Uncle Mike, Aunt Sarah">
                        <button class="btn btn-secondary" id="bulkAddBtn" style="margin-top: 8px; width: 100%;">Add All</button>
                    </div>
                </div>
                <div class="admin-modal-footer">
                    <button class="btn btn-secondary" id="closeTagsModalBtn">Close</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    setTimeout(() => {
        const closeBtn = document.getElementById('closeTagsModal');
        const closeBtn2 = document.getElementById('closeTagsModalBtn');
        const addTagBtn = document.getElementById('addTagBtn');
        const bulkAddBtn = document.getElementById('bulkAddBtn');
        const newTagInput = document.getElementById('newTagName');
        const overlay = document.querySelector('.admin-modal-overlay');

        if (closeBtn) closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closePhotoAdminModal(); });
        if (closeBtn2) closeBtn2.addEventListener('click', (e) => { e.stopPropagation(); closePhotoAdminModal(); });
        if (addTagBtn) addTagBtn.addEventListener('click', (e) => { e.stopPropagation(); addSingleTag(); });
        if (bulkAddBtn) bulkAddBtn.addEventListener('click', (e) => { e.stopPropagation(); addBulkTags(); });
        if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) closePhotoAdminModal(); });

        // Allow Enter key to add tag
        if (newTagInput) {
            newTagInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addSingleTag();
                }
            });
        }
    }, 10);

    // Load current tags
    await loadAdminTags();
}

async function deletePhoto() {
    if (!isAdmin) return;

    const currentPhoto = allPhotos[currentPhotoIndex];
    if (!currentPhoto) return;

    const photoName = currentPhoto.title || currentPhoto.filename || 'this photo';

    if (!confirm(`Are you sure you want to delete ${photoName}? This action cannot be undone.`)) {
        return;
    }

    if (!currentPhoto.id) {
        showMessage('Cannot delete: Photo ID not available', 'error');
        return;
    }

    try {
        const response = await fetch('/api/delete-photo.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: currentPhoto.id
            })
        });

        const result = await response.json();

        if (result.success) {
            showMessage('Photo deleted successfully!', 'success');

            // Remove from photos array
            allPhotos.splice(currentPhotoIndex, 1);

            // Navigate to next photo or close if no more photos
            if (allPhotos.length === 0) {
                window.location.href = '/photos.php';
            } else {
                if (currentPhotoIndex >= allPhotos.length) {
                    currentPhotoIndex = allPhotos.length - 1;
                }
                displayPhoto();
                updateUI();
            }
        } else {
            showMessage(result.error || 'Failed to delete photo', 'error');
        }
    } catch (error) {
        console.error('Delete error:', error);
        showMessage('Network error during deletion', 'error');
    }
}

// Modal management functions
function closePhotoAdminModal() {
    const modals = document.querySelectorAll('.admin-modal-overlay');
    modals.forEach(modal => modal.remove());
}

async function savePhotoDetails() {
    const title = document.getElementById('editPhotoTitle')?.value;
    const description = document.getElementById('editPhotoDescription')?.value;
    const date = document.getElementById('editPhotoDate')?.value;
    const location = document.getElementById('editPhotoLocation')?.value;
    const city = document.getElementById('editPhotoCity')?.value;
    const state = document.getElementById('editPhotoState')?.value;

    if (!currentAlbum || !allPhotos[currentPhotoIndex]) {
        showMessage('No photo selected', 'error');
        return;
    }

    const filename = allPhotos[currentPhotoIndex].src.split('/').pop();

    try {
        const response = await fetch('/api/update-photo-details.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: filename,
                album: currentAlbum.name,
                title: title,
                description: description,
                date: date,
                location: location,
                city: city,
                state: state
            })
        });

        const result = await response.json();
        console.log('Save photo details response:', result);

        if (result.success) {
            showMessage('Photo details updated successfully!', 'success');
            closePhotoAdminModal();

            // Update local photo data
            const photo = allPhotos[currentPhotoIndex];
            if (photo) {
                photo.title = title;
                photo.desc = description;
                photo.date = date;
                photo.location = location;
                photo.city = city;
                photo.state = state;
            }
            updateUI();
        } else {
            showMessage(result.error || 'Failed to update photo details', 'error');
        }
    } catch (error) {
        console.error('Error saving photo details:', error);
        showMessage('Network error while updating photo details', 'error');
    }
}

async function savePhotoLocation() {
    const location = document.getElementById('photoLocation')?.value;
    const city = document.getElementById('photoCity')?.value;
    const state = document.getElementById('photoState')?.value;

    if (!currentAlbum || !allPhotos[currentPhotoIndex]) {
        showMessage('No photo selected', 'error');
        return;
    }

    const filename = allPhotos[currentPhotoIndex].src.split('/').pop();

    try {
        const response = await fetch('/api/update-photo-location.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: filename,
                album: currentAlbum.name,
                location: location,
                city: city,
                state: state
            })
        });

        const result = await response.json();

        if (result.success) {
            showMessage('Photo location updated successfully!', 'success');
            closePhotoAdminModal();
        } else {
            showMessage(result.error || 'Failed to update photo location', 'error');
        }
    } catch (error) {
        console.error('Error saving photo location:', error);
        showMessage('Network error while updating photo location', 'error');
    }
}

async function savePhotoDate() {
    const newDate = document.getElementById('photoNewDate')?.value;

    if (!newDate || !newDate.trim()) {
        showMessage('Please enter a date', 'error');
        return;
    }

    if (!currentAlbum || !allPhotos[currentPhotoIndex]) {
        showMessage('No photo selected', 'error');
        return;
    }

    const filename = allPhotos[currentPhotoIndex].src.split('/').pop();

    try {
        const response = await fetch('/api/update-photo-date.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: filename,
                album: currentAlbum.name,
                date_taken: newDate.trim()
            })
        });

        const result = await response.json();

        if (result.success) {
            showMessage('Photo date updated successfully!', 'success');
            closePhotoAdminModal();

            // Update local data
            if (allPhotos[currentPhotoIndex]) {
                allPhotos[currentPhotoIndex].date = newDate.trim();
            }
            updateUI();
        } else {
            showMessage(result.error || 'Failed to update photo date', 'error');
        }
    } catch (error) {
        console.error('Error saving photo date:', error);
        showMessage('Network error while updating photo date', 'error');
    }
}

async function movePhotoToAlbum() {
    const targetAlbum = document.getElementById('targetAlbum')?.value;

    if (!targetAlbum) {
        showMessage('Please select a target album', 'error');
        return;
    }

    if (!currentAlbum || !allPhotos[currentPhotoIndex]) {
        showMessage('No photo selected', 'error');
        return;
    }

    const filename = allPhotos[currentPhotoIndex].src.split('/').pop();

    try {
        const response = await fetch('/api/move-photo.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: filename,
                from_album: currentAlbum.name,
                to_album: targetAlbum
            })
        });

        const result = await response.json();

        if (result.success) {
            showMessage('Photo moved successfully!', 'success');
            closePhotoAdminModal();

            // Remove photo from current album array
            allPhotos.splice(currentPhotoIndex, 1);

            // Navigate to next photo or go back to gallery if no more photos
            if (allPhotos.length === 0) {
                window.location.href = '../photos.php';
            } else {
                if (currentPhotoIndex >= allPhotos.length) {
                    currentPhotoIndex = allPhotos.length - 1;
                }
                displayPhoto();
                updateUI();
            }
        } else {
            showMessage(result.error || 'Failed to move photo', 'error');
        }
    } catch (error) {
        console.error('Error moving photo:', error);
        showMessage('Network error while moving photo', 'error');
    }
}

async function addSingleTag() {
    const input = document.getElementById('newTagName');
    const tagName = input?.value?.trim();

    if (!tagName) {
        showMessage('Please enter a name', 'error');
        return;
    }

    if (!currentAlbum || !allPhotos[currentPhotoIndex]) {
        showMessage('No photo selected', 'error');
        return;
    }

    const photo = allPhotos[currentPhotoIndex];

    if (!photo.id) {
        console.error('Photo object:', photo);
        console.error('All photos:', allPhotos);
        showMessage('Photo ID not available - check console', 'error');
        return;
    }

    console.log('Tagging photo ID:', photo.id);

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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: tagName })
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                person_id: personId,
                content_type: 'photo',
                content_id: photo.id
            })
        });

        if (tagResponse.ok) {
            input.value = '';
            showMessage(`Tagged ${tagName}!`, 'success');
            await loadAdminTags();
            loadPhotoTags(); // Update sidebar tags too
        } else {
            showMessage('Failed to add tag', 'error');
        }
    } catch (error) {
        console.error('Error adding tag:', error);
        showMessage('Failed to add tag', 'error');
    }
}

async function addBulkTags() {
    const bulkTagsInput = document.getElementById('bulkTags');
    const tags = bulkTagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag);

    if (tags.length === 0) {
        showMessage('Please enter some tag names', 'error');
        return;
    }

    if (!currentAlbum || !allPhotos[currentPhotoIndex]) {
        showMessage('No photo selected', 'error');
        return;
    }

    const photo = allPhotos[currentPhotoIndex];

    if (!photo.id) {
        showMessage('Photo ID not available', 'error');
        return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const tagName of tags) {

        try {
            // Search for or create the person
            const searchResponse = await fetch(`/api/people.php?action=search&q=${encodeURIComponent(tagName)}`);
            const searchData = await searchResponse.json();

            let personId;
            const existingPerson = searchData.people?.find(p =>
                p.display_name.toLowerCase() === tagName.toLowerCase()
            );

            if (existingPerson) {
                personId = existingPerson.id;
            } else {
                const createResponse = await fetch('/api/people.php?action=create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: tagName })
                });

                if (!createResponse.ok) {
                    failCount++;
                    continue;
                }

                const createData = await createResponse.json();
                personId = createData.person_id;
            }

            // Tag the photo
            const tagResponse = await fetch('/api/people.php?action=tag', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    person_id: personId,
                    content_type: 'photo',
                    content_id: photo.id
                })
            });

            if (tagResponse.ok) {
                successCount++;
            } else {
                failCount++;
            }
        } catch (error) {
            console.error('Error adding tag:', tagName, error);
            failCount++;
        }
    }

    bulkTagsInput.value = '';

    if (successCount > 0) {
        showMessage(`Added ${successCount} tag${successCount !== 1 ? 's' : ''}!`, 'success');
        await loadAdminTags();
        loadPhotoTags(); // Update sidebar tags too
    }

    if (failCount > 0) {
        showMessage(`Failed to add ${failCount} tag${failCount !== 1 ? 's' : ''}`, 'error');
    }
}

async function loadAdminTags() {
    const container = document.getElementById('adminCurrentTags');
    if (!container) return;

    if (!currentAlbum || !allPhotos[currentPhotoIndex]) {
        container.innerHTML = '<p style="color: var(--text-secondary);">No photo selected</p>';
        return;
    }

    const photo = allPhotos[currentPhotoIndex];

    if (!photo.id) {
        container.innerHTML = '<p style="color: var(--text-secondary); font-style: italic;">Photo ID not available</p>';
        return;
    }

    try {
        const response = await fetch(`/api/photo-tags/${photo.id}`);

        if (!response.ok) {
            container.innerHTML = '<p style="color: var(--text-secondary); font-style: italic;">No tags yet</p>';
            return;
        }

        const tags = await response.json();

        if (!tags || tags.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); font-style: italic;">No tags yet</p>';
            return;
        }

        container.innerHTML = tags.map(tag => `
            <div class="admin-tag-item">
                <span class="tag-name">${tag.person_name}</span>
                <button class="tag-remove-btn" onclick="removeAdminTag(${tag.id})">×</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading admin tags:', error);
        container.innerHTML = '<p style="color: var(--text-secondary); font-style: italic;">No tags yet</p>';
    }
}

async function removeAdminTag(tagId) {
    try {
        const response = await fetch(`/api/people.php?action=untag&id=${tagId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showMessage('Tag removed', 'success');
            await loadAdminTags();
            loadPhotoTags(); // Update sidebar tags too
        } else {
            showMessage('Failed to remove tag', 'error');
        }
    } catch (error) {
        console.error('Error removing tag:', error);
        showMessage('Failed to remove tag', 'error');
    }
}

// Add CSS for message animations and admin styles
const style = document.createElement('style');
style.textContent = `
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
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    /* Admin Section Styles */
    .photo-admin-section {
        background: var(--glass-bg);
        backdrop-filter: var(--glass-backdrop);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-md);
        padding: var(--spacing-lg);
        margin-bottom: var(--spacing-lg);
    }
    
    .admin-section-header h3 {
        margin: 0 0 var(--spacing-md) 0;
        color: var(--primary);
        font-size: var(--font-size-lg);
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
    }
    
    .admin-actions {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
    }
    
    .admin-action-btn {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-md);
        background: transparent;
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-md);
        color: var(--text-primary);
        cursor: pointer;
        transition: all var(--animation-fast);
        font-size: var(--font-size-sm);
    }
    
    .admin-action-btn:hover {
        background: var(--glass-bg-hover);
        border-color: var(--primary-light);
        transform: translateY(-1px);
    }
    
    .admin-action-btn.danger:hover {
        background: var(--error);
        border-color: var(--error);
        color: white;
    }
    
    /* Admin Modal Styles */
    .admin-modal-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        background: rgba(0, 0, 0, 0.5) !important;
        backdrop-filter: blur(4px);
        z-index: 9999 !important;
        display: flex !important;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease;
        pointer-events: auto !important;
    }

    .admin-modal {
        background: var(--glass-bg);
        backdrop-filter: var(--glass-backdrop);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-lg);
        max-width: 500px;
        width: 90vw;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: var(--glass-shadow-hover);
        pointer-events: auto !important;
        position: relative;
        z-index: 10000 !important;
    }
    
    .admin-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--spacing-lg);
        border-bottom: 1px solid var(--glass-border);
    }
    
    .admin-modal-header h3 {
        margin: 0;
        color: var(--primary);
    }
    
    .modal-close {
        background: none;
        border: none;
        font-size: var(--font-size-xl);
        cursor: pointer;
        color: var(--text-secondary);
        padding: var(--spacing-xs);
    }
    
    .admin-modal-body {
        padding: var(--spacing-lg);
    }
    
    .admin-modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: var(--spacing-md);
        padding: var(--spacing-lg);
        border-top: 1px solid var(--glass-border);
    }
    
    .suggested-tags {
        display: flex;
        flex-wrap: wrap;
        gap: var(--spacing-sm);
        margin-top: var(--spacing-sm);
    }
    
    .tag-suggestion {
        background: var(--primary-light);
        color: white;
        border: none;
        padding: var(--spacing-xs) var(--spacing-md);
        border-radius: var(--radius-full);
        font-size: var(--font-size-sm);
        cursor: pointer;
        transition: all var(--animation-fast);
    }
    
    .tag-suggestion:hover {
        background: var(--primary);
        transform: scale(1.05);
    }
    
    .admin-tags-list {
        display: flex;
        flex-wrap: wrap;
        gap: var(--spacing-sm);
        margin-top: var(--spacing-sm);
    }
    
    .admin-tag-item {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        background: var(--glass-bg-hover);
        padding: var(--spacing-xs) var(--spacing-sm);
        border-radius: var(--radius-md);
        border: 1px solid var(--glass-border);
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    /* Date Info Styles */
    .current-date-info {
        background: rgba(var(--primary-rgb), 0.05);
        border: 1px solid rgba(var(--primary-rgb), 0.1);
        border-radius: var(--radius-sm);
        padding: var(--spacing-md);
        margin-top: var(--spacing-sm);
    }
    
    .current-date-info p {
        margin: 0 0 var(--spacing-xs) 0;
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
    }
    
    .form-help {
        display: block;
        margin-top: var(--spacing-xs);
        font-size: var(--font-size-xs);
        color: var(--text-tertiary);
        font-style: italic;
    }
`;
document.head.appendChild(style);