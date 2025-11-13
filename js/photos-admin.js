// Photos Admin Module

class PhotosAdmin {
    constructor() {
        this.pendingSubmissions = [];
        this.albums = [];
        this.currentPhoto = null;
        this.selectedSubmissions = new Set();
        
        this.init();
    }
    
    async init() {
        await this.loadDashboardData();
        // Don't setup listeners or update stats yet - wait for render
    }
    
    async loadDashboardData() {
        try {
            // Load pending submissions
            const pendingResponse = await fetch('/api/pending-submissions.php');
            if (pendingResponse.ok) {
                const data = await pendingResponse.json();
                // Ensure we have an array
                this.pendingSubmissions = Array.isArray(data) ? data : 
                                         (data.submissions ? data.submissions : []);
            } else {
                console.log('Pending submissions API not available, using empty array');
                this.pendingSubmissions = [];
            }
            
            // Load albums
            const albumsResponse = await fetch('/api/photo-albums.php');
            if (albumsResponse.ok) {
                const data = await albumsResponse.json();
                // Ensure we have an array
                this.albums = Array.isArray(data) ? data : 
                             (data.albums ? data.albums : []);
            } else {
                console.log('Albums API not available, using empty array');
                this.albums = [];
            }
            
            // Don't render yet - wait for render() method to be called
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            // Initialize with empty arrays to prevent map errors
            this.pendingSubmissions = [];
            this.albums = [];
            this.showMessage('Photo data temporarily unavailable', 'warning');
        }
    }
    
    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.onclick.toString().match(/showTab\('(.+?)'\)/)[1];
                this.showTab(tabName);
            });
        });
    }
    
    updateStats() {
        // Count pending photos (not submissions)  
        const totalPendingPhotos = this.pendingSubmissions.reduce((total, submission) => {
            return total + (submission.photos ? submission.photos.length : 1);
        }, 0);
        
        // Only update if elements exist
        const pendingEl = document.getElementById('pendingCount');
        const albumsEl = document.getElementById('totalAlbums'); 
        const photosEl = document.getElementById('totalPhotos');
        
        if (pendingEl) pendingEl.textContent = totalPendingPhotos;
        if (albumsEl) albumsEl.textContent = this.albums.length;
        if (photosEl) {
            const totalPhotos = this.albums.reduce((total, album) => total + album.photoCount, 0);
            photosEl.textContent = totalPhotos;
        }
    }
    
    renderPendingPhotos() {
        const container = document.getElementById('pendingPhotos');
        if (!container) return '';
        
        if (this.pendingSubmissions.length === 0) {
            const html = `
                <div class="loading-state">
                    <p>🎉 No pending submissions! All caught up.</p>
                </div>
            `;
            if (container) container.innerHTML = html;
            return html;
        }
        
        // Group submissions by event and uploader
        const groupedSubmissions = this.groupSubmissions(this.pendingSubmissions);
        const html = groupedSubmissions.map(group => this.renderSubmissionGroup(group)).join('');
        
        if (container) container.innerHTML = html;
        return html;
    }
    
    groupSubmissions(submissions) {
        // For now, treat each submission as its own group
        // Later can group by event_name + uploader_id + date
        return submissions.map(submission => ({
            event: submission.event_name,
            uploader: `User ${submission.uploader_id}`,
            date: submission.uploaded_at,
            submissions: [submission]
        }));
    }
    
    renderSubmissionGroup(group) {
        const submission = group.submissions[0]; // For now, one submission per group
        const uploadDate = new Date(submission.uploaded_at).toLocaleDateString();
        
        return `
            <div class="photo-submission">
                <div class="submission-header">
                    <div>
                        <h3 class="submission-title">${submission.event_name}</h3>
                        <div class="submission-meta">
                            Uploaded by ${group.uploader} on ${uploadDate}
                        </div>
                    </div>
                    <div class="submission-actions">
                        <input type="checkbox" class="submission-select" data-filename="${submission.filename}" onchange="handleCheckboxChange(this)">
                    </div>
                </div>
                
                <div class="submission-content">
                    <div class="photos-grid">
                        <div class="photo-thumbnail" onclick="reviewPhoto('${submission.filename}')">
                            <img src="/uploads/pending/${submission.filename}" alt="${submission.original_name}">
                            <div class="photo-overlay">
                                <span>👁️ Review</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="context-summary">
                        <div class="context-item">
                            <div class="context-label">Event</div>
                            <div class="context-value">${submission.event_name}</div>
                        </div>
                        <div class="context-item">
                            <div class="context-label">Date Taken</div>
                            <div class="context-value">${submission.date_taken || 'Not specified'}</div>
                        </div>
                        <div class="context-item">
                            <div class="context-label">People</div>
                            <div class="context-value">${submission.people_in_photo || 'Not specified'}</div>
                        </div>
                        <div class="context-item">
                            <div class="context-label">Suggested Album</div>
                            <div class="context-value">${submission.suggested_album || 'None'}</div>
                        </div>
                    </div>
                    
                    ${submission.description ? `
                        <div class="context-item">
                            <div class="context-label">Description</div>
                            <div class="context-value">${submission.description}</div>
                        </div>
                    ` : ''}
                    
                    <div class="submission-actions">
                        <button class="btn-danger" onclick="quickReject('${submission.filename}')">
                            ❌ Reject
                        </button>
                        <button class="btn-secondary" onclick="reviewPhoto('${submission.filename}')">
                            👁️ Review
                        </button>
                        <button class="btn-primary" onclick="quickApprove('${submission.filename}')">
                            ✅ Quick Approve
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderAlbums() {
        if (this.albums.length === 0) {
            return `
                <div class="loading-state">
                    <p>No albums found. Create your first album!</p>
                </div>
            `;
        }
        
        return this.albums.map(album => `
            <div class="album-card">
                <div class="album-cover">
                    ${album.emoji || '📸'}
                </div>
                <div class="album-info">
                    <h3 class="album-title">${album.display_name || album.name}</h3>
                    <div class="album-meta">
                        ${album.photoCount} photos • ${album.date_range || 'No date range'}
                    </div>
                    <div class="album-actions">
                        <button class="btn-secondary" onclick="viewAlbum('${album.name}')">
                            👁️ View Gallery
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    populateAlbumSelects() {
        const selects = document.querySelectorAll('#finalAlbum');
        
        selects.forEach(select => {
            // Clear existing options except defaults
            select.innerHTML = `
                <option value="">Select album...</option>
                <option value="create_new">Create New Album</option>
            `;
            
            // Add existing albums
            this.albums.forEach(album => {
                const option = document.createElement('option');
                option.value = album.name;
                option.textContent = `${album.display_name || album.name} (${album.photoCount} photos)`;
                select.appendChild(option);
            });
        });
    }
    
    findSubmission(filename) {
        return this.pendingSubmissions.find(s => s.filename === filename);
    }
    
    async getStats() {
        return [
            {
                label: 'Pending Photos',
                value: this.pendingSubmissions.length
            },
            {
                label: 'Total Albums',
                value: this.albums.length
            }
        ];
    }
    
    async render(container) {
        container.innerHTML = `
            <div class="photos-admin-panel">
                <div class="admin-tabs">
                    <button class="tab-btn active" onclick="showTab('pending')">
                        📝 Pending Photos (${this.pendingSubmissions.length})
                    </button>
                    <button class="tab-btn" onclick="showTab('albums')">
                        📁 Albums (${this.albums.length})
                    </button>
                    <button class="tab-btn" onclick="showTab('tags')">
                        🏷️ Tag Management
                    </button>
                </div>
                
                <div class="tab-content active" id="pendingTab">
                    <div class="section-header">
                        <h3>📋 Photo Submissions Pending Review</h3>
                        <div class="header-actions">
                            <label class="select-all-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px;">
                                <input type="checkbox" id="selectAllCheckbox" onchange="selectAll()" style="cursor: pointer;">
                                <span>Select All</span>
                            </label>
                            <button onclick="refreshPending()" class="btn btn-secondary">
                                🔄 Refresh
                            </button>
                        </div>
                    </div>

                    <div id="pendingPhotos">
                        ${this.renderPendingPhotos()}
                    </div>

                    <!-- Batch Actions Bar -->
                    <div class="batch-actions-bar" id="batchActionsBar" style="display: none; position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: var(--glass-bg); backdrop-filter: blur(10px); padding: 1rem 2rem; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.1); border: 2px solid var(--primary); z-index: 1000;">
                        <div style="display: flex; align-items: center; gap: 2rem;">
                            <div class="batch-count" style="font-weight: 600; color: var(--primary);">
                                <span id="selectedCount">0</span> photo(s) selected
                            </div>
                            <div class="batch-buttons" style="display: flex; gap: 1rem;">
                                <button onclick="batchReject()" class="btn btn-danger">
                                    ❌ Reject Selected
                                </button>
                                <button onclick="batchApprove()" class="btn btn-primary">
                                    ✅ Approve Selected
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="tab-content" id="albumsTab">
                    <div class="section-header">
                        <h3>📁 Photo Albums</h3>
                        <button onclick="showCreateAlbum()" class="btn btn-primary">
                            ➕ Create Album
                        </button>
                    </div>
                    
                    <div id="albumsGrid">
                        ${this.renderAlbums()}
                    </div>
                </div>
                
                <div class="tab-content" id="tagsTab">
                    <div class="section-header">
                        <h3>🏷️ Photo Tag Management</h3>
                        <button onclick="exportTags()" class="btn btn-secondary">
                            📥 Export Tags
                        </button>
                    </div>
                    
                    <div class="tag-stats">
                        <div class="stat-card">
                            <div class="stat-number" id="totalTags">-</div>
                            <div class="stat-label">Total Tags</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number" id="uniquePeople">-</div>
                            <div class="stat-label">Unique People</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number" id="taggedPhotos">-</div>
                            <div class="stat-label">Tagged Photos</div>
                        </div>
                    </div>
                    
                    <div class="tag-management-content">
                        <div class="tag-search">
                            <input type="text" id="tagSearch" placeholder="Search people..." class="form-input">
                        </div>
                        <div id="tagsList" class="tags-list">
                            <!-- Tags will be loaded here -->
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Photo Review Modal -->
            <div class="modal" id="photoModal">
                <div class="modal-overlay" onclick="closeModal()"></div>
                <div class="modal-content large">
                    <div class="modal-header">
                        <h3>📋 Review Photo Submission</h3>
                        <button onclick="closeModal()" class="modal-close">×</button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="photo-review-layout">
                            <div class="photo-preview">
                                <img id="previewImage" src="" alt="Photo preview">
                            </div>
                            
                            <div class="photo-context">
                                <div class="context-group">
                                    <label>Event</label>
                                    <span id="contextEvent">-</span>
                                </div>
                                <div class="context-group">
                                    <label>Date Taken</label>
                                    <span id="contextDate">-</span>
                                </div>
                                <div class="context-group">
                                    <label>People</label>
                                    <span id="contextPeople">-</span>
                                </div>
                                <div class="context-group">
                                    <label>Description</label>
                                    <span id="contextDescription">-</span>
                                </div>
                                <div class="context-group">
                                    <label>Suggested Album</label>
                                    <span id="contextAlbum">-</span>
                                </div>
                                <div class="context-group">
                                    <label>Uploader</label>
                                    <span id="contextUploader">-</span>
                                </div>
                                <div class="context-group">
                                    <label>File Details</label>
                                    <span id="contextFileDetails">-</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="approval-section">
                            <div class="album-assignment">
                                <label for="finalAlbum">Final Album</label>
                                <select id="finalAlbum">
                                    <option value="">Select album...</option>
                                </select>
                            </div>
                            
                            <div class="reviewer-notes">
                                <label for="reviewerNotes">Reviewer Notes (optional)</label>
                                <textarea id="reviewerNotes" placeholder="Add notes about your decision..."></textarea>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <button onclick="rejectPhoto()" class="btn-danger">
                            ❌ Reject
                        </button>
                        <button onclick="requestMoreInfo()" class="btn-secondary">
                            📝 Request More Info
                        </button>
                        <button onclick="approvePhoto()" class="btn-primary">
                            ✅ Approve Photo
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Album Creation Modal -->
            <div class="modal" id="albumModal">
                <div class="modal-overlay" onclick="closeModal()"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>📁 Create New Album</h3>
                        <button onclick="closeModal()" class="modal-close">×</button>
                    </div>
                    
                    <div class="modal-body">
                        <form id="albumForm">
                            <div class="form-group">
                                <label for="albumFolder">Folder Name</label>
                                <input type="text" id="albumFolder" placeholder="e.g., Summer2024" required class="form-input">
                                <small>This will be the URL-friendly folder name</small>
                            </div>
                            
                            <div class="form-group">
                                <label for="albumTitle">Display Title</label>
                                <input type="text" id="albumTitle" placeholder="e.g., Summer BBQ 2024" required class="form-input">
                            </div>
                            
                            <div class="form-group">
                                <label for="albumEmoji">Album Emoji</label>
                                <input type="text" id="albumEmoji" placeholder="e.g., 🌞" maxlength="2" class="form-input">
                            </div>
                            
                            <div class="form-group">
                                <label for="albumDescription">Description</label>
                                <textarea id="albumDescription" rows="3" placeholder="Brief description of the album..." class="form-input"></textarea>
                            </div>
                            
                            <div class="form-group">
                                <label for="albumDateRange">Date Range</label>
                                <input type="text" id="albumDateRange" placeholder="e.g., July 2024" class="form-input">
                            </div>
                        </form>
                    </div>
                    
                    <div class="modal-footer">
                        <button onclick="closeModal()" class="btn btn-secondary">
                            Cancel
                        </button>
                        <button onclick="createAlbum()" class="btn btn-primary">
                            ✅ Create Album
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Initialize batch selection after render
        this.initBatchSelection();
        this.loadTagData();
        this.populateAlbumSelects();
    }
    
    initBatchSelection() {
        // Setup checkbox change listeners
        setTimeout(() => {
            document.querySelectorAll('.submission-select').forEach(checkbox => {
                checkbox.addEventListener('change', () => this.updateBatchBar());
            });
        }, 100);
    }
    
    updateBatchBar() {
        const selectedCount = this.selectedSubmissions.size;
        const batchBar = document.getElementById('batchActionsBar');
        const countSpan = document.getElementById('selectedCount');

        if (batchBar && countSpan) {
            if (selectedCount > 0) {
                batchBar.style.display = 'block';
                countSpan.textContent = selectedCount;
            } else {
                batchBar.style.display = 'none';
            }
        }

        // Update select all checkbox
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        const totalCheckboxes = document.querySelectorAll('.submission-select').length;
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = selectedCount === totalCheckboxes && totalCheckboxes > 0;
            selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < totalCheckboxes;
        }
    }
    
    async loadTagData() {
        try {
            const response = await fetch('/api/photo-tags/stats.php');
            if (response.ok) {
                const stats = await response.json();
                this.updateTagStats(stats);
                this.loadTagsList();
            }
        } catch (error) {
            console.log('Tag stats not available yet');
        }
    }
    
    updateTagStats(stats) {
        const totalTagsEl = document.getElementById('totalTags');
        const uniquePeopleEl = document.getElementById('uniquePeople');
        const taggedPhotosEl = document.getElementById('taggedPhotos');
        
        if (totalTagsEl) totalTagsEl.textContent = stats.totalTags || 0;
        if (uniquePeopleEl) uniquePeopleEl.textContent = stats.uniquePeople || 0;
        if (taggedPhotosEl) taggedPhotosEl.textContent = stats.taggedPhotos || 0;
    }
    
    async loadTagsList() {
        try {
            const response = await fetch('/api/photo-tags/people.php');
            if (response.ok) {
                const people = await response.json();
                this.renderTagsList(people);
            }
        } catch (error) {
            console.log('Tags list not available yet');
            const tagsList = document.getElementById('tagsList');
            if (tagsList) {
                tagsList.innerHTML = `
                    <div class="no-tags-message">
                        <p>No tags created yet. Tags will appear here once photos are tagged with people.</p>
                    </div>
                `;
            }
        }
    }
    
    renderTagsList(people) {
        const tagsList = document.getElementById('tagsList');
        if (!tagsList) return;
        
        if (people.length === 0) {
            tagsList.innerHTML = `
                <div class="no-tags-message">
                    <p>No tags created yet. Tags will appear here once photos are tagged with people.</p>
                </div>
            `;
            return;
        }
        
        tagsList.innerHTML = people.map(person => `
            <div class="tag-item">
                <div class="tag-info">
                    <h4>${person.name}</h4>
                    <span class="tag-count">${person.photo_count} photos</span>
                </div>
                <div class="tag-actions">
                    <button onclick="editTag('${person.name}')" class="btn btn-sm btn-secondary">
                        ✏️ Edit
                    </button>
                    <button onclick="mergeTag('${person.name}')" class="btn btn-sm btn-secondary">
                        🔄 Merge
                    </button>
                    <button onclick="deleteTag('${person.name}')" class="btn btn-sm btn-danger">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    showMessage(text, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = text;
        messageDiv.style.cssText = `
            position: fixed;
            top: 2rem;
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
}

// Global functions for onclick handlers
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName + 'Tab').classList.add('active');
    event.target.classList.add('active');
}

function refreshPending() {
    photosAdmin.loadDashboardData();
    photosAdmin.showMessage('Refreshed pending submissions', 'success');
}

function reviewPhoto(filename) {
    const submission = photosAdmin.findSubmission(filename);
    if (!submission) {
        photosAdmin.showMessage('Submission not found', 'error');
        return;
    }

    photosAdmin.currentPhoto = submission;

    // Store filename in modal data attribute for later use
    const photoModal = document.getElementById('photoModal');
    photoModal.dataset.currentFilename = submission.filename;

    // Populate modal with submission data
    document.getElementById('previewImage').src = `/uploads/pending/${submission.filename}`;
    document.getElementById('contextEvent').textContent = submission.event_name;
    document.getElementById('contextDate').textContent = submission.date_taken || 'Not specified';
    document.getElementById('contextPeople').textContent = submission.people_in_photo || 'Not specified';
    document.getElementById('contextDescription').textContent = submission.description || 'No description provided';
    document.getElementById('contextAlbum').textContent = submission.suggested_album || 'None suggested';
    document.getElementById('contextUploader').textContent = `User ${submission.uploader_id}`;

    const fileSize = (submission.file_size / 1024 / 1024).toFixed(2);
    document.getElementById('contextFileDetails').textContent =
        `${submission.original_name} (${fileSize} MB, ${submission.mime_type || submission.file_type || 'unknown'})`;

    // Set suggested album in dropdown
    const albumSelect = document.getElementById('finalAlbum');
    if (submission.suggested_album) {
        albumSelect.value = submission.suggested_album;
    }

    // Show modal
    photoModal.classList.add('active');
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    
    // Clear form data
    document.getElementById('reviewerNotes').value = '';
    document.getElementById('finalAlbum').value = '';
    photosAdmin.currentPhoto = null;
}

async function approvePhoto() {
    const albumSelect = document.getElementById('finalAlbum');
    const reviewerNotes = document.getElementById('reviewerNotes').value;
    const photoModal = document.getElementById('photoModal');

    // Get filename from modal data attribute or currentPhoto
    const filename = photoModal.dataset.currentFilename || (photosAdmin.currentPhoto && photosAdmin.currentPhoto.filename);

    if (!filename) {
        photosAdmin.showMessage('Photo information not found', 'error');
        return;
    }

    if (!albumSelect.value) {
        photosAdmin.showMessage('Please select an album', 'error');
        return;
    }

    if (albumSelect.value === 'create_new') {
        // Show album creation modal
        closeModal();
        showCreateAlbum();
        return;
    }

    try {
        const response = await fetch('/api/approve-photo.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: filename,
                album: albumSelect.value,
                reviewerNotes: reviewerNotes
            })
        });

        const result = await response.json();

        if (result.success) {
            photosAdmin.showMessage('Photo approved successfully!', 'success');
            closeModal();

            // Remove from pending list
            photosAdmin.pendingSubmissions = photosAdmin.pendingSubmissions.filter(
                s => s.filename !== filename
            );
            photosAdmin.renderPendingPhotos();
            photosAdmin.updateStats();

            // Refresh admin dashboard stats
            if (window.adminCore) {
                adminCore.refreshStats();
            }
        } else {
            photosAdmin.showMessage(result.error || 'Approval failed', 'error');
        }
    } catch (error) {
        console.error('Approval error:', error);
        photosAdmin.showMessage('Network error during approval', 'error');
    }
}

async function rejectPhoto() {
    const reviewerNotes = document.getElementById('reviewerNotes').value;
    const photoModal = document.getElementById('photoModal');

    // Get filename from modal data attribute or currentPhoto
    const filename = photoModal.dataset.currentFilename || (photosAdmin.currentPhoto && photosAdmin.currentPhoto.filename);

    if (!filename) {
        photosAdmin.showMessage('Photo information not found', 'error');
        return;
    }

    if (!reviewerNotes.trim()) {
        photosAdmin.showMessage('Please provide a reason for rejection', 'error');
        return;
    }

    try {
        const response = await fetch('/api/reject-photo.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: filename,
                reviewerNotes: reviewerNotes
            })
        });

        const result = await response.json();

        if (result.success) {
            photosAdmin.showMessage('Photo rejected', 'success');
            closeModal();

            // Remove from pending list
            photosAdmin.pendingSubmissions = photosAdmin.pendingSubmissions.filter(
                s => s.filename !== filename
            );
            photosAdmin.renderPendingPhotos();
            photosAdmin.updateStats();

            // Refresh admin dashboard stats
            if (window.adminCore) {
                adminCore.refreshStats();
            }
        } else {
            photosAdmin.showMessage(result.error || 'Rejection failed', 'error');
        }
    } catch (error) {
        console.error('Rejection error:', error);
        photosAdmin.showMessage('Network error during rejection', 'error');
    }
}

function requestMoreInfo() {
    const reviewerNotes = document.getElementById('reviewerNotes').value;
    
    if (!reviewerNotes.trim()) {
        photosAdmin.showMessage('Please add notes explaining what info is needed', 'error');
        return;
    }
    
    // Mock request more info process
    console.log('Requesting more info:', {
        filename: photosAdmin.currentPhoto.filename,
        notes: reviewerNotes
    });
    
    photosAdmin.showMessage('Info request sent to uploader', 'success');
    closeModal();
}

async function quickApprove(filename) {
    const submission = photosAdmin.findSubmission(filename);
    if (!submission) return;

    // Use suggested album or prompt for one
    const album = submission.suggested_album;
    if (!album) {
        photosAdmin.showMessage('No suggested album - use detailed review', 'error');
        return;
    }

    try {
        const response = await fetch('/api/approve-photo.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: filename,
                album: album,
                reviewerNotes: 'Quick approved'
            })
        });

        const result = await response.json();

        if (result.success) {
            photosAdmin.showMessage(`Approved to ${album}!`, 'success');

            // Remove from pending
            photosAdmin.pendingSubmissions = photosAdmin.pendingSubmissions.filter(
                s => s.filename !== filename
            );
            photosAdmin.renderPendingPhotos();
            photosAdmin.updateStats();

            // Refresh admin dashboard stats
            if (window.adminCore) {
                adminCore.refreshStats();
            }
        } else {
            photosAdmin.showMessage(result.error || 'Quick approval failed', 'error');
        }
    } catch (error) {
        console.error('Quick approval error:', error);
        photosAdmin.showMessage('Network error during quick approval', 'error');
    }
}

async function quickReject(filename) {
    if (!confirm('Are you sure you want to reject this photo?')) return;

    try {
        const response = await fetch('/api/reject-photo.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: filename,
                reviewerNotes: 'Quick rejected'
            })
        });

        const result = await response.json();

        if (result.success) {
            photosAdmin.showMessage('Photo rejected', 'success');

            // Remove from pending
            photosAdmin.pendingSubmissions = photosAdmin.pendingSubmissions.filter(
                s => s.filename !== filename
            );
            photosAdmin.renderPendingPhotos();
            photosAdmin.updateStats();

            // Refresh admin dashboard stats
            if (window.adminCore) {
                adminCore.refreshStats();
            }
        } else {
            photosAdmin.showMessage(result.error || 'Quick rejection failed', 'error');
        }
    } catch (error) {
        console.error('Quick rejection error:', error);
        photosAdmin.showMessage('Network error during quick rejection', 'error');
    }
}

function showCreateAlbum() {
    document.getElementById('albumModal').classList.add('active');
}

async function createAlbum() {
    const folder = document.getElementById('albumFolder').value.trim();
    const title = document.getElementById('albumTitle').value.trim();
    const emoji = document.getElementById('albumEmoji').value.trim();
    const description = document.getElementById('albumDescription').value.trim();
    const dateRange = document.getElementById('albumDateRange').value.trim();
    
    if (!folder || !title) {
        adminDashboard.showMessage('Folder name and title are required', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/create-album.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                folder: folder,
                title: title,
                emoji: emoji || '📸',
                description: description,
                dateRange: dateRange
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            photosAdmin.showMessage('Album created successfully!', 'success');
            closeModal();
            
            // Clear form
            document.getElementById('albumForm').reset();
            
            // Refresh albums list
            await photosAdmin.loadDashboardData();
        } else {
            photosAdmin.showMessage(result.error || 'Album creation failed', 'error');
        }
    } catch (error) {
        console.error('Album creation error:', error);
        photosAdmin.showMessage('Network error during album creation', 'error');
    }
}

function approveSelected() {
    photosAdmin.showMessage('Batch approval not implemented yet', 'error');
}

function viewAlbum(albumName) {
    // Convert album name to match the albums structure in photos.js
    const albumMap = {
        'Family': 'family',
        'Events': 'events', 
        'Holidays': 'holidays'
    };
    
    const albumId = albumMap[albumName] || albumName.toLowerCase();
    
    // Open the photos page and trigger album opening via postMessage
    const photosWindow = window.open('../photos.php', '_blank');
    
    // Wait for the page to load then trigger album opening
    setTimeout(() => {
        if (photosWindow && !photosWindow.closed) {
            photosWindow.postMessage({ 
                action: 'openAlbum', 
                albumId: albumId 
            }, window.location.origin);
        }
    }, 1000);
}

function exportUserList() {
    photosAdmin.showMessage('User export not implemented yet', 'info');
}

// Checkbox handling
function handleCheckboxChange(checkbox) {
    const filename = checkbox.dataset.filename;
    if (checkbox.checked) {
        photosAdmin.selectedSubmissions.add(filename);
    } else {
        photosAdmin.selectedSubmissions.delete(filename);
    }
    photosAdmin.updateBatchBar();
}

// Batch operations
function selectAll() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const checkboxes = document.querySelectorAll('.submission-select');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
        const filename = checkbox.dataset.filename;
        if (checkbox.checked) {
            photosAdmin.selectedSubmissions.add(filename);
        } else {
            photosAdmin.selectedSubmissions.delete(filename);
        }
    });
    
    photosAdmin.updateBatchBar();
}

async function batchApprove() {
    const count = photosAdmin.selectedSubmissions.size;
    if (count === 0) return;
    
    if (!confirm(`Approve ${count} selected photos?`)) return;
    
    // For now, show message - actual implementation would process each photo
    photosAdmin.showMessage(`Batch approval for ${count} photos initiated`, 'info');
    
    // Clear selection
    photosAdmin.selectedSubmissions.clear();
    document.querySelectorAll('.submission-select').forEach(cb => cb.checked = false);
    photosAdmin.updateBatchBar();
}

async function batchReject() {
    const count = photosAdmin.selectedSubmissions.size;
    if (count === 0) return;
    
    if (!confirm(`Reject ${count} selected photos? This cannot be undone.`)) return;
    
    // For now, show message - actual implementation would process each photo
    photosAdmin.showMessage(`Batch rejection for ${count} photos initiated`, 'info');
    
    // Clear selection
    photosAdmin.selectedSubmissions.clear();
    document.querySelectorAll('.submission-select').forEach(cb => cb.checked = false);
    photosAdmin.updateBatchBar();
}

// Tag management functions
function editTag(tagName) {
    photosAdmin.showMessage(`Edit tag: ${tagName} (not implemented)`, 'info');
}

function mergeTag(tagName) {
    photosAdmin.showMessage(`Merge tag: ${tagName} (not implemented)`, 'info');
}

function deleteTag(tagName) {
    if (!confirm(`Delete tag "${tagName}"? This will remove the tag from all photos.`)) return;
    photosAdmin.showMessage(`Delete tag: ${tagName} (not implemented)`, 'info');
}

function exportTags() {
    photosAdmin.showMessage('Export tags feature coming soon', 'info');
}

// Register module with admin core
const photosAdmin = new PhotosAdmin();

// Register with admin core when it's ready
if (window.adminCore) {
    adminCore.registerModule({
        name: 'photos',
        title: 'Photo Moderation',
        icon: '📸',
        priority: 1,
        getStats: () => photosAdmin.getStats(),
        render: (container) => photosAdmin.render(container)
    });
} else {
    // Wait for admin core to load
    document.addEventListener('DOMContentLoaded', () => {
        if (window.adminCore) {
            adminCore.registerModule({
                name: 'photos',
                title: 'Photo Moderation',
                icon: '📸',
                priority: 1,
                getStats: () => photosAdmin.getStats(),
                render: (container) => photosAdmin.render(container)
            });
        }
    });
}

// Add CSS for slide-in animation
const photosAdminStyle = document.createElement('style');
photosAdminStyle.textContent = `
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
`;
document.head.appendChild(photosAdminStyle);