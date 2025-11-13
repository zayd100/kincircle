// Media Viewer JavaScript - Family-Friendly Video/Audio Player

let currentMedia = null;
let currentPlayer = null;
let isAdmin = false;

// Initialize viewer on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAdminStatus();
    initializeViewer();
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
        console.log('Admin check failed, continuing as regular user');
        isAdmin = false;
    }
}

function enableAdminMode() {
    document.body.classList.add('admin-mode');
    
    // Add admin section to sidebar after DOM is loaded
    setTimeout(() => {
        addMediaAdminSection();
    }, 1000);
}

// Initialize the media viewer
function initializeViewer() {
    const urlParams = new URLSearchParams(window.location.search);
    const mediaId = urlParams.get('id');
    
    if (!mediaId) {
        showError('No media specified');
        return;
    }
    
    loadMedia(mediaId);
    setupPlaybackControls();
}

// Load media data from API
async function loadMedia(mediaId) {
    try {
        const response = await fetch(`/api/media/${mediaId}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                showError('Media not found');
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const media = await response.json();
        
        if (!media || !media.id) {
            showError('Invalid media data received');
            return;
        }
        
        currentMedia = media;
        displayMedia(media);
    } catch (error) {
        console.error('Error loading media:', error);
        showError('Failed to load media. Please try again later.');
    }
}


// Display media in the player
function displayMedia(media) {
    // Hide loading state
    document.getElementById('mediaLoading').style.display = 'none';
    
    // Update header information
    document.getElementById('mediaTitle').textContent = media.title || 'Untitled Media';
    document.getElementById('mediaDescription').textContent = media.description || media.subtitle || 'No description available';
    
    // Update sidebar details
    document.getElementById('mediaType').textContent = capitalizeFirst(media.type || 'media');
    document.getElementById('mediaDuration').textContent = media.duration || 'Unknown duration';
    document.getElementById('mediaUploader').textContent = media.uploadedBy || media.uploaded_by || 'Unknown';
    document.getElementById('mediaDate').textContent = formatDisplayDate(media.dateAdded || media.date_added);
    document.getElementById('mediaCategory').textContent = media.category || 'Uncategorized';
    document.getElementById('mediaContext').textContent = media.context || media.description || 'No additional context available';
    
    // Set appropriate icon
    const iconElement = document.getElementById('mediaTypeIcon');
    if (media.type === 'audio') {
        iconElement.textContent = '🎵 Audio Details';
    } else {
        iconElement.textContent = '📹 Video Details';
    }
    
    // Show appropriate player
    if (media.type === 'audio') {
        setupAudioPlayer(media);
    } else {
        setupVideoPlayer(media);
    }
    
    // Update page title
    document.title = `${media.title || 'Media'} - Reed & Weaver Media`;
}

// Setup video player
function setupVideoPlayer(media) {
    const videoPlayer = document.getElementById('videoPlayer');
    const videoSource = document.getElementById('videoSource');
    
    videoSource.src = media.filePath;
    videoSource.type = getVideoMimeType(media.filePath);
    
    videoPlayer.style.display = 'block';
    videoPlayer.load();
    
    currentPlayer = videoPlayer;
    setupPlayerEvents(videoPlayer);
}

// Setup audio player
function setupAudioPlayer(media) {
    const audioPlayer = document.getElementById('audioPlayer');
    const audioSource = document.getElementById('audioSource');
    
    audioSource.src = media.filePath;
    audioSource.type = getAudioMimeType(media.filePath);
    
    audioPlayer.style.display = 'block';
    audioPlayer.load();
    
    currentPlayer = audioPlayer;
    setupPlayerEvents(audioPlayer);
}

// Setup player event listeners
function setupPlayerEvents(player) {
    player.addEventListener('loadedmetadata', function() {
        console.log('Media loaded successfully');
    });
    
    player.addEventListener('error', function(e) {
        console.error('Media playback error:', e);
        showError('Failed to load media file');
    });
    
    player.addEventListener('play', function() {
        console.log('Media playback started');
    });
    
    player.addEventListener('pause', function() {
        console.log('Media playback paused');
    });
}

// Setup playback control handlers
function setupPlaybackControls() {
    // Volume control
    const volumeSlider = document.getElementById('volumeSlider');
    volumeSlider.addEventListener('input', function() {
        if (currentPlayer) {
            currentPlayer.volume = this.value / 100;
        }
    });
    
    // Playback speed control
    const speedSelect = document.getElementById('playbackSpeed');
    speedSelect.addEventListener('change', function() {
        if (currentPlayer) {
            currentPlayer.playbackRate = parseFloat(this.value);
        }
    });
}

// Utility functions
function getVideoMimeType(filePath) {
    const extension = filePath.split('.').pop().toLowerCase();
    switch (extension) {
        case 'mp4':
            return 'video/mp4';
        case 'webm':
            return 'video/webm';
        case 'ogg':
            return 'video/ogg';
        case 'mov':
            return 'video/quicktime';
        default:
            return 'video/mp4';
    }
}

function getAudioMimeType(filePath) {
    const extension = filePath.split('.').pop().toLowerCase();
    switch (extension) {
        case 'mp3':
            return 'audio/mpeg';
        case 'wav':
            return 'audio/wav';
        case 'ogg':
            return 'audio/ogg';
        case 'm4a':
            return 'audio/mp4';
        default:
            return 'audio/mpeg';
    }
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDisplayDate(dateInput) {
    if (!dateInput) return 'Unknown date';
    
    try {
        let date;
        if (typeof dateInput === 'string') {
            date = new Date(dateInput);
        } else if (dateInput instanceof Date) {
            date = dateInput;
        } else {
            return 'Unknown date';
        }
        
        if (isNaN(date.getTime())) {
            return 'Unknown date';
        }
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        console.warn('Error formatting date:', error);
        return 'Unknown date';
    }
}

// Show error state
function showError(message) {
    document.getElementById('mediaLoading').style.display = 'none';
    const errorDiv = document.getElementById('mediaError');
    errorDiv.style.display = 'flex';
    
    // Update error message if provided
    if (message) {
        const errorText = errorDiv.querySelector('p');
        errorText.textContent = message;
    }
}

// Action button handlers
function downloadMedia() {
    if (currentMedia && currentMedia.filePath) {
        // Create download link
        const link = document.createElement('a');
        link.href = currentMedia.filePath;
        link.download = `${currentMedia.title}.${currentMedia.filePath.split('.').pop()}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showMessage('Download started!', 'success');
    } else {
        showMessage('Download not available', 'error');
    }
}

function shareMedia() {
    const shareUrl = window.location.href;
    
    if (navigator.share) {
        navigator.share({
            title: currentMedia.title,
            text: currentMedia.description,
            url: shareUrl
        }).catch(err => {
            console.log('Error sharing:', err);
            copyToClipboard(shareUrl);
        });
    } else {
        copyToClipboard(shareUrl);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showMessage('Link copied to clipboard!', 'success');
    }).catch(() => {
        showMessage('Could not copy link', 'error');
    });
}

function reportIssue() {
    const message = `Issue with media: ${currentMedia.title} (ID: ${currentMedia.id})`;
    const mailtoLink = `mailto:admin@reedweaver.family?subject=Media Issue Report&body=${encodeURIComponent(message)}`;
    window.location.href = mailtoLink;
}

// Show message notification
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
    }, 4000);
}

// Keyboard controls
document.addEventListener('keydown', function(e) {
    if (!currentPlayer) return;
    
    switch (e.code) {
        case 'Space':
            e.preventDefault();
            if (currentPlayer.paused) {
                currentPlayer.play();
            } else {
                currentPlayer.pause();
            }
            break;
        case 'ArrowLeft':
            e.preventDefault();
            currentPlayer.currentTime = Math.max(0, currentPlayer.currentTime - 10);
            break;
        case 'ArrowRight':
            e.preventDefault();
            currentPlayer.currentTime = Math.min(currentPlayer.duration, currentPlayer.currentTime + 10);
            break;
        case 'ArrowUp':
            e.preventDefault();
            currentPlayer.volume = Math.min(1, currentPlayer.volume + 0.1);
            document.getElementById('volumeSlider').value = currentPlayer.volume * 100;
            break;
        case 'ArrowDown':
            e.preventDefault();
            currentPlayer.volume = Math.max(0, currentPlayer.volume - 0.1);
            document.getElementById('volumeSlider').value = currentPlayer.volume * 100;
            break;
        case 'KeyM':
            e.preventDefault();
            currentPlayer.muted = !currentPlayer.muted;
            break;
        case 'KeyF':
            e.preventDefault();
            if (currentPlayer.requestFullscreen) {
                currentPlayer.requestFullscreen();
            }
            break;
    }
});

// Media Admin functionality
function addMediaAdminSection() {
    const sidebar = document.querySelector('.media-info-sidebar');
    if (!sidebar || !isAdmin) return;
    
    const adminSection = document.createElement('div');
    adminSection.className = 'media-admin-section';
    adminSection.innerHTML = `
        <div class="admin-section-header">
            <h3>🛠️ Admin Actions</h3>
        </div>
        <div class="admin-actions">
            <button class="admin-action-btn" onclick="editMediaDetails()">
                <span class="action-icon">✏️</span>
                <span class="action-text">Edit Details</span>
            </button>
            <button class="admin-action-btn" onclick="editMediaMetadata()">
                <span class="action-icon">📝</span>
                <span class="action-text">Edit Metadata</span>
            </button>
            <button class="admin-action-btn" onclick="changeMediaCategory()">
                <span class="action-icon">📁</span>
                <span class="action-text">Change Category</span>
            </button>
            <button class="admin-action-btn" onclick="changeMediaDate()">
                <span class="action-icon">📅</span>
                <span class="action-text">Change Date</span>
            </button>
            <button class="admin-action-btn" onclick="manageMediaTranscript()">
                <span class="action-icon">📄</span>
                <span class="action-text">Add Transcript</span>
            </button>
            <button class="admin-action-btn" onclick="manageMediaAccess()">
                <span class="action-icon">🔒</span>
                <span class="action-text">Manage Access</span>
            </button>
            <button class="admin-action-btn danger" onclick="archiveMedia()">
                <span class="action-icon">📦</span>
                <span class="action-text">Archive Media</span>
            </button>
        </div>
    `;
    
    // Insert before the media actions section
    const mediaActions = sidebar.querySelector('.media-actions');
    sidebar.insertBefore(adminSection, mediaActions);
}

function editMediaDetails() {
    if (!isAdmin || !currentMedia) return;
    
    const modalHTML = `
        <div class="admin-modal-overlay" onclick="closeAdminModal()">
            <div class="admin-modal" onclick="event.stopPropagation()">
                <div class="admin-modal-header">
                    <h3>✏️ Edit Media Details</h3>
                    <button onclick="closeAdminModal()" class="modal-close">×</button>
                </div>
                <div class="admin-modal-body">
                    <div class="form-group">
                        <label for="mediaTitle">Media Title</label>
                        <input type="text" id="mediaTitle" class="form-input" value="${currentMedia.title || ''}">
                    </div>
                    <div class="form-group">
                        <label for="mediaSubtitle">Subtitle/Context</label>
                        <input type="text" id="mediaSubtitle" class="form-input" value="${currentMedia.subtitle || ''}" placeholder="Brief description or context">
                    </div>
                    <div class="form-group">
                        <label for="mediaDescription">Full Description</label>
                        <textarea id="mediaDescription" class="form-input" rows="4">${currentMedia.description || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="mediaUploader">Uploaded By</label>
                        <input type="text" id="mediaUploader" class="form-input" value="${currentMedia.uploadedBy || ''}" placeholder="Person who uploaded this">
                    </div>
                </div>
                <div class="admin-modal-footer">
                    <button onclick="closeAdminModal()" class="btn btn-secondary">Cancel</button>
                    <button onclick="saveMediaDetails()" class="btn btn-primary">Save Changes</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function editMediaMetadata() {
    if (!isAdmin || !currentMedia) return;
    
    const modalHTML = `
        <div class="admin-modal-overlay" onclick="closeAdminModal()">
            <div class="admin-modal" onclick="event.stopPropagation()">
                <div class="admin-modal-header">
                    <h3>📝 Edit Media Metadata</h3>
                    <button onclick="closeAdminModal()" class="modal-close">×</button>
                </div>
                <div class="admin-modal-body">
                    <div class="form-group">
                        <label for="mediaDuration">${currentMedia.type === 'video' ? 'Duration' : currentMedia.type === 'audio' ? 'Length' : 'Pages'}</label>
                        <input type="text" id="mediaDuration" class="form-input" value="${currentMedia.duration || currentMedia.pages || ''}" placeholder="e.g., 5 minutes, 12 pages">
                    </div>
                    <div class="form-group">
                        <label for="mediaDate">Date Created/Recorded</label>
                        <input type="date" id="mediaDate" class="form-input">
                    </div>
                    <div class="form-group">
                        <label for="mediaLocation">Location</label>
                        <input type="text" id="mediaLocation" class="form-input" placeholder="Where was this recorded/created?">
                    </div>
                    <div class="form-group">
                        <label for="mediaEvent">Event/Occasion</label>
                        <input type="text" id="mediaEvent" class="form-input" placeholder="e.g., Wedding, Birthday Party, Family Reunion">
                    </div>
                    <div class="form-group">
                        <label for="mediaTags">Tags (comma-separated)</label>
                        <input type="text" id="mediaTags" class="form-input" placeholder="family, celebration, music, etc.">
                    </div>
                </div>
                <div class="admin-modal-footer">
                    <button onclick="closeAdminModal()" class="btn btn-secondary">Cancel</button>
                    <button onclick="saveMediaMetadata()" class="btn btn-primary">Save Metadata</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function changeMediaCategory() {
    if (!isAdmin || !currentMedia) return;
    
    const modalHTML = `
        <div class="admin-modal-overlay" onclick="closeAdminModal()">
            <div class="admin-modal" onclick="event.stopPropagation()">
                <div class="admin-modal-header">
                    <h3>📁 Change Media Category</h3>
                    <button onclick="closeAdminModal()" class="modal-close">×</button>
                </div>
                <div class="admin-modal-body">
                    <div class="form-group">
                        <label>Current Category: <strong>${currentMedia.category || 'Uncategorized'}</strong></label>
                    </div>
                    <div class="form-group">
                        <label for="newCategory">New Category</label>
                        <select id="newCategory" class="form-input">
                            <option value="">Select category...</option>
                            <option value="holidays">🎄 Holidays</option>
                            <option value="weddings">💒 Weddings</option>
                            <option value="birthdays">🎂 Birthdays</option>
                            <option value="music">🎵 Music</option>
                            <option value="recipes">🍝 Recipes & Cooking</option>
                            <option value="history">📚 Family History</option>
                            <option value="memories">💫 General Memories</option>
                            <option value="create_new">➕ Create New Category</option>
                        </select>
                    </div>
                    <div class="form-group" id="newCategoryGroup" style="display: none;">
                        <label for="customCategory">Custom Category Name</label>
                        <input type="text" id="customCategory" class="form-input" placeholder="Enter new category name">
                    </div>
                </div>
                <div class="admin-modal-footer">
                    <button onclick="closeAdminModal()" class="btn btn-secondary">Cancel</button>
                    <button onclick="saveMediaCategory()" class="btn btn-primary">Change Category</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Handle create new category option
    document.getElementById('newCategory').addEventListener('change', function() {
        const customGroup = document.getElementById('newCategoryGroup');
        if (this.value === 'create_new') {
            customGroup.style.display = 'block';
        } else {
            customGroup.style.display = 'none';
        }
    });
}

function manageMediaAccess() {
    if (!isAdmin || !currentMedia) return;
    
    const modalHTML = `
        <div class="admin-modal-overlay" onclick="closeAdminModal()">
            <div class="admin-modal" onclick="event.stopPropagation()">
                <div class="admin-modal-header">
                    <h3>🔒 Manage Media Access</h3>
                    <button onclick="closeAdminModal()" class="modal-close">×</button>
                </div>
                <div class="admin-modal-body">
                    <div class="form-group">
                        <label>Privacy Level</label>
                        <select id="privacyLevel" class="form-input">
                            <option value="public">👥 Public - All family members</option>
                            <option value="family">🏠 Family Only - Core family</option>
                            <option value="restricted">🔒 Restricted - Specific people</option>
                            <option value="private">👤 Private - Admin only</option>
                        </select>
                    </div>
                    <div class="form-group" id="restrictedUsersGroup" style="display: none;">
                        <label>Allowed Users (for restricted access)</label>
                        <div class="checkbox-group">
                            <label><input type="checkbox" value="mom"> Mom</label>
                            <label><input type="checkbox" value="dad"> Dad</label>
                            <label><input type="checkbox" value="sarah"> Sarah</label>
                            <label><input type="checkbox" value="mike"> Uncle Mike</label>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="accessNotes">Access Notes</label>
                        <textarea id="accessNotes" class="form-input" rows="2" placeholder="Optional notes about access restrictions"></textarea>
                    </div>
                </div>
                <div class="admin-modal-footer">
                    <button onclick="closeAdminModal()" class="btn btn-secondary">Cancel</button>
                    <button onclick="saveMediaAccess()" class="btn btn-primary">Update Access</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Handle privacy level changes
    document.getElementById('privacyLevel').addEventListener('change', function() {
        const restrictedGroup = document.getElementById('restrictedUsersGroup');
        if (this.value === 'restricted') {
            restrictedGroup.style.display = 'block';
        } else {
            restrictedGroup.style.display = 'none';
        }
    });
}

function changeMediaDate() {
    if (!isAdmin || !currentMedia) return;
    
    const currentDate = currentMedia.dateRecorded || currentMedia.dateCreated || '';
    
    const modalHTML = `
        <div class="admin-modal-overlay" onclick="closeAdminModal()">
            <div class="admin-modal" onclick="event.stopPropagation()">
                <div class="admin-modal-header">
                    <h3>📅 Change Media Date</h3>
                    <button onclick="closeAdminModal()" class="modal-close">×</button>
                </div>
                <div class="admin-modal-body">
                    <div class="form-group">
                        <label for="mediaNewDate">Date ${currentMedia.type === 'video' ? 'Recorded' : currentMedia.type === 'audio' ? 'Recorded' : 'Created'}</label>
                        <input type="date" id="mediaNewDate" class="form-input" value="${currentDate ? currentDate.split('T')[0] : ''}">
                        <small class="form-help">This will update when the media appears in timeline views</small>
                    </div>
                    <div class="form-group">
                        <label for="mediaNewTime">Time (Optional)</label>
                        <input type="time" id="mediaNewTime" class="form-input" value="${currentDate ? currentDate.split('T')[1]?.split('.')[0] || '' : ''}">
                        <small class="form-help">Helps with media ordering within the same day</small>
                    </div>
                    <div class="form-group">
                        <label>Current Date Info</label>
                        <div class="current-date-info">
                            <p><strong>Upload Date:</strong> ${currentMedia.dateAdded || 'Not available'}</p>
                            <p><strong>File Modified:</strong> ${currentMedia.dateModified || 'Not available'}</p>
                            <p><strong>Current Record Date:</strong> ${currentDate || 'Not set'}</p>
                        </div>
                    </div>
                </div>
                <div class="admin-modal-footer">
                    <button onclick="closeAdminModal()" class="btn btn-secondary">Cancel</button>
                    <button onclick="saveMediaDate()" class="btn btn-primary">Update Date</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function manageMediaTranscript() {
    if (!isAdmin || !currentMedia) return;
    
    const isVideo = currentMedia.type === 'video';
    const isAudio = currentMedia.type === 'audio';
    const title = isVideo ? 'Subtitles/Transcript' : isAudio ? 'Transcript' : 'Content Description';
    
    const modalHTML = `
        <div class="admin-modal-overlay" onclick="closeAdminModal()">
            <div class="admin-modal" onclick="event.stopPropagation()">
                <div class="admin-modal-header">
                    <h3>📄 Manage ${title}</h3>
                    <button onclick="closeAdminModal()" class="modal-close">×</button>
                </div>
                <div class="admin-modal-body">
                    ${isVideo || isAudio ? `
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="enableTranscript"> 
                            Enable ${isVideo ? 'subtitles/transcript' : 'transcript'} for this ${currentMedia.type}
                        </label>
                    </div>
                    ` : ''}
                    <div class="form-group">
                        <label for="transcriptContent">${title} Content</label>
                        <textarea id="transcriptContent" class="form-input" rows="8" placeholder="${isVideo ? 'Enter subtitles or full transcript...' : isAudio ? 'Enter transcript of the audio...' : 'Enter description of the content...'}">${currentMedia.transcript || ''}</textarea>
                        <small class="form-help">${isVideo ? 'This can be displayed as subtitles or searchable transcript' : isAudio ? 'This makes audio content searchable and accessible' : 'This helps with searching and organizing content'}</small>
                    </div>
                    <div class="form-group">
                        <label for="transcriptLanguage">Language</label>
                        <select id="transcriptLanguage" class="form-input">
                            <option value="en">English</option>
                            <option value="es">Spanish</option>
                            <option value="fr">French</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="transcriptNotes">Notes</label>
                        <input type="text" id="transcriptNotes" class="form-input" placeholder="Any notes about the transcript/subtitles">
                    </div>
                </div>
                <div class="admin-modal-footer">
                    <button onclick="closeAdminModal()" class="btn btn-secondary">Cancel</button>
                    <button onclick="saveMediaTranscript()" class="btn btn-primary">Save ${title}</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

async function archiveMedia() {
    if (!isAdmin || !currentMedia) return;
    
    const mediaName = currentMedia.title || 'this media';
    
    if (!confirm(`Archive "${mediaName}"? It will be moved to the archive and hidden from regular users.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/media/${currentMedia.id}/archive`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        showMessage('Media archived successfully', 'success');
        
        // Redirect back to media library after archiving
        setTimeout(() => {
            window.location.href = '/media/';
        }, 1500);
    } catch (error) {
        console.error('Error archiving media:', error);
        showMessage('Failed to archive media. Please try again.', 'error');
    }
}

// Modal management and save functions
function closeAdminModal() {
    const modal = document.querySelector('.admin-modal-overlay');
    if (modal) {
        modal.remove();
    }
}

async function saveMediaDetails() {
    const title = document.getElementById('mediaTitle')?.value;
    const subtitle = document.getElementById('mediaSubtitle')?.value;
    const description = document.getElementById('mediaDescription')?.value;
    const uploader = document.getElementById('mediaUploader')?.value;
    
    if (!currentMedia?.id) {
        showMessage('Error: No media selected', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/media/${currentMedia.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: title,
                subtitle: subtitle,
                description: description,
                uploaded_by: uploader
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const updatedMedia = await response.json();
        showMessage('Media details updated successfully!', 'success');
        closeAdminModal();
        
        // Update current display with server response
        if (updatedMedia) {
            currentMedia = { ...currentMedia, ...updatedMedia };
            
            // Update display elements
            const titleEl = document.getElementById('mediaTitle');
            const subtitleEl = document.getElementById('mediaSubtitle');
            if (titleEl) titleEl.textContent = title;
            if (subtitleEl) subtitleEl.textContent = subtitle;
        }
    } catch (error) {
        console.error('Error updating media details:', error);
        showMessage('Failed to update media details. Please try again.', 'error');
    }
}

async function saveMediaMetadata() {
    const duration = document.getElementById('mediaDuration')?.value;
    const date = document.getElementById('mediaDate')?.value;
    const location = document.getElementById('mediaLocation')?.value;
    const event = document.getElementById('mediaEvent')?.value;
    const tags = document.getElementById('mediaTags')?.value;
    
    if (!currentMedia?.id) {
        showMessage('Error: No media selected', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/media/${currentMedia.id}/metadata`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                duration,
                date,
                location,
                event,
                tags: tags ? tags.split(',').map(tag => tag.trim()) : []
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        showMessage('Media metadata updated successfully!', 'success');
        closeAdminModal();
    } catch (error) {
        console.error('Error updating media metadata:', error);
        showMessage('Failed to update media metadata. Please try again.', 'error');
    }
}

async function saveMediaCategory() {
    const newCategory = document.getElementById('newCategory')?.value;
    const customCategory = document.getElementById('customCategory')?.value;
    
    if (!newCategory) {
        showMessage('Please select a category', 'error');
        return;
    }
    
    const finalCategory = newCategory === 'create_new' ? customCategory : newCategory;
    
    if (!finalCategory) {
        showMessage('Please enter a category name', 'error');
        return;
    }
    
    if (!currentMedia?.id) {
        showMessage('Error: No media selected', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/media/${currentMedia.id}/category`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                category: finalCategory
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        showMessage(`Media moved to "${finalCategory}" category!`, 'success');
        closeAdminModal();
        
        // Update current media object
        currentMedia.category = finalCategory;
        document.getElementById('mediaCategory').textContent = finalCategory;
    } catch (error) {
        console.error('Error updating media category:', error);
        showMessage('Failed to update media category. Please try again.', 'error');
    }
}

async function saveMediaAccess() {
    const privacyLevel = document.getElementById('privacyLevel')?.value;
    const accessNotes = document.getElementById('accessNotes')?.value;
    
    let allowedUsers = [];
    if (privacyLevel === 'restricted') {
        const checkboxes = document.querySelectorAll('#restrictedUsersGroup input[type="checkbox"]:checked');
        allowedUsers = Array.from(checkboxes).map(cb => cb.value);
    }
    
    if (!currentMedia?.id) {
        showMessage('Error: No media selected', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/media/${currentMedia.id}/access`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                privacy_level: privacyLevel,
                allowed_users: allowedUsers,
                access_notes: accessNotes
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        showMessage(`Media access updated to "${privacyLevel}" level!`, 'success');
        closeAdminModal();
    } catch (error) {
        console.error('Error updating media access:', error);
        showMessage('Failed to update media access. Please try again.', 'error');
    }
}

async function saveMediaDate() {
    const newDate = document.getElementById('mediaNewDate')?.value;
    const newTime = document.getElementById('mediaNewTime')?.value;
    
    if (!newDate) {
        showMessage('Please select a date', 'error');
        return;
    }
    
    if (!currentMedia?.id) {
        showMessage('Error: No media selected', 'error');
        return;
    }
    
    // Combine date and time
    const dateTimeString = newTime ? `${newDate}T${newTime}:00` : `${newDate}T12:00:00`;
    
    try {
        const response = await fetch(`/api/media/${currentMedia.id}/date`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                date_recorded: dateTimeString
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        showMessage('Media date updated successfully!', 'success');
        closeAdminModal();
        
        // Update current media object
        if (currentMedia) {
            currentMedia.dateRecorded = dateTimeString;
            currentMedia.dateCreated = dateTimeString;
        }
    } catch (error) {
        console.error('Error updating media date:', error);
        showMessage('Failed to update media date. Please try again.', 'error');
    }
}

async function saveMediaTranscript() {
    const transcriptContent = document.getElementById('transcriptContent')?.value;
    const transcriptLanguage = document.getElementById('transcriptLanguage')?.value;
    const transcriptNotes = document.getElementById('transcriptNotes')?.value;
    const enableTranscript = document.getElementById('enableTranscript')?.checked;
    
    if (!transcriptContent && enableTranscript) {
        showMessage('Please enter transcript content', 'error');
        return;
    }
    
    if (!currentMedia?.id) {
        showMessage('Error: No media selected', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/media/${currentMedia.id}/transcript`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                transcript_content: transcriptContent,
                transcript_language: transcriptLanguage,
                transcript_notes: transcriptNotes,
                transcript_enabled: enableTranscript
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const mediaType = currentMedia.type || 'media';
        const actionText = currentMedia.type === 'video' ? 'Subtitles/transcript' : 
                         currentMedia.type === 'audio' ? 'Transcript' : 'Content description';
        
        showMessage(`${actionText} updated successfully!`, 'success');
        closeAdminModal();
        
        // Update current media object
        if (currentMedia) {
            currentMedia.transcript = transcriptContent;
            currentMedia.transcriptLanguage = transcriptLanguage;
            currentMedia.transcriptEnabled = enableTranscript;
        }
    } catch (error) {
        console.error('Error updating media transcript:', error);
        showMessage('Failed to update transcript. Please try again.', 'error');
    }
}

// Add CSS for admin functionality
const adminStyles = document.createElement('style');
adminStyles.textContent = `
    /* Media Admin Section Styles */
    .media-admin-section {
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
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease;
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
    
    .checkbox-group {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
        margin-top: var(--spacing-sm);
    }
    
    .checkbox-group label {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        cursor: pointer;
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
document.head.appendChild(adminStyles);

// Make functions globally available
window.downloadMedia = downloadMedia;
window.shareMedia = shareMedia;
window.reportIssue = reportIssue;
window.editMediaDetails = editMediaDetails;
window.editMediaMetadata = editMediaMetadata;
window.changeMediaCategory = changeMediaCategory;
window.changeMediaDate = changeMediaDate;
window.manageMediaTranscript = manageMediaTranscript;
window.manageMediaAccess = manageMediaAccess;
window.archiveMedia = archiveMedia;
window.closeAdminModal = closeAdminModal;
window.saveMediaDetails = saveMediaDetails;
window.saveMediaMetadata = saveMediaMetadata;
window.saveMediaCategory = saveMediaCategory;
window.saveMediaDate = saveMediaDate;
window.saveMediaTranscript = saveMediaTranscript;
window.saveMediaAccess = saveMediaAccess;