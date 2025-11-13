// Family Connection Intelligence System
// Where family bonds transcend time and space

class FamilyConnectionIntelligence {
    constructor() {
        this.familyMembers = [];
        this.filteredMembers = [];
        this.currentFilter = 'all';
        this.currentView = 'cards';
        this.currentUser = null;
        this.searchTimeout = null;
        this.isLoggedIn = false;
        this.privacyLevel = 'guest';
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        await this.loadFamilyData();
        await this.loadUserStatus();
        this.renderView();
        this.startRealTimeUpdates();
        
        // Staggered entrance animation
        setTimeout(() => {
            this.animateEntrance();
        }, 500);
    }
    
    setupEventListeners() {
        // Search functionality
        document.getElementById('family-search').addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.performSearch(e.target.value);
            }, 300);
        });
        
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
                this.updateFilterButtons(e.target);
            });
        });
        
        // View buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setView(e.target.dataset.view);
                this.updateViewButtons(e.target);
            });
        });
        
        // Cousin Connect status toggle
        document.getElementById('status-toggle-btn').addEventListener('click', () => {
            this.toggleCousinConnectStatus();
        });
        
        // Edit interests
        document.getElementById('edit-interests-btn').addEventListener('click', () => {
            this.showInterestsEditor();
        });
        
        // Interest editor actions
        document.getElementById('save-interests-btn').addEventListener('click', () => {
            this.saveInterests();
        });
        
        document.getElementById('cancel-interests-btn').addEventListener('click', () => {
            this.hideInterestsEditor();
        });
        
        // Profile modal
        document.getElementById('close-profile-modal').addEventListener('click', () => {
            this.closeProfileModal();
        });
        
        document.querySelector('.modal-backdrop').addEventListener('click', () => {
            this.closeProfileModal();
        });
        
        // Modal actions
        document.getElementById('send-message-btn').addEventListener('click', () => {
            this.sendMessage();
        });
        
        document.getElementById('view-photos-btn').addEventListener('click', () => {
            this.viewPhotos();
        });
        
        document.getElementById('view-calendar-btn').addEventListener('click', () => {
            this.viewCalendar();
        });
        
        // Escape key handling
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeProfileModal();
                this.hideInterestsEditor();
            }
        });
    }
    
    async loadFamilyData() {
        try {
            const response = await fetch('/api/users.php?action=directory');
            const data = await response.json();
            
            if (data.success) {
                this.familyMembers = data.users || [];
                this.privacyLevel = data.privacy_level || 'guest';
                this.isLoggedIn = data.privacy_level === 'family';
                this.filteredMembers = [...this.familyMembers];
                this.updateStats();
            } else {
                throw new Error(data.error || 'Failed to load family data');
            }
        } catch (error) {
            console.error('Failed to load family data:', error);
            // Initialize with empty state for production
            this.familyMembers = [];
            this.filteredMembers = [];
            this.privacyLevel = 'guest';
            this.isLoggedIn = false;
            this.updateStats();
            this.showMessage('Unable to load family directory. Please check your connection and try again.', 'error');
        }
    }
    
    
    async loadUserStatus() {
        if (!this.isLoggedIn) return;
        
        try {
            const response = await fetch('/api/cousin-connect.php?action=status');
            const data = await response.json();
            
            if (data.success) {
                this.currentUser = data.status;
                this.updateUserStatusDisplay();
            } else {
                throw new Error(data.error || 'Failed to load user status');
            }
        } catch (error) {
            console.error('Failed to load user status:', error);
            // Initialize with default unavailable state
            this.currentUser = {
                cousin_connect_available: false,
                cousin_connect_interests: null,
                cousin_connect_since: null
            };
            this.updateUserStatusDisplay();
        }
    }
    
    updateStats() {
        const totalFamily = this.familyMembers.length;
        const cousinConnectCount = this.familyMembers.filter(m => m.cousin_connect_available).length;
        this.animateCounter('family-count', totalFamily);
        this.animateCounter('cousin-connect-count', cousinConnectCount);
    }
    
    animateCounter(elementId, targetValue) {
        const element = document.getElementById(elementId);
        const currentValue = parseInt(element.textContent) || 0;
        const increment = Math.ceil((targetValue - currentValue) / 20);
        
        const updateCounter = () => {
            const current = parseInt(element.textContent) || 0;
            if (current < targetValue) {
                element.textContent = Math.min(current + increment, targetValue);
                setTimeout(updateCounter, 50);
            } else {
                element.textContent = targetValue;
            }
        };
        
        updateCounter();
    }
    
    
    performSearch(query) {
        const searchTerm = query.toLowerCase().trim();
        
        if (!searchTerm) {
            this.filteredMembers = [...this.familyMembers];
        } else {
            this.filteredMembers = this.familyMembers.filter(member => {
                const name = member.display_name.toLowerCase();
                const email = member.email?.toLowerCase() || '';
                const interests = member.cousin_connect_interests?.toLowerCase() || '';
                
                return name.includes(searchTerm) || 
                       email.includes(searchTerm) || 
                       interests.includes(searchTerm);
            });
        }
        
        this.applyCurrentFilter();
        this.renderView();
    }
    
    setFilter(filter) {
        this.currentFilter = filter;
        this.applyCurrentFilter();
        this.renderView();
    }
    
    applyCurrentFilter() {
        switch (this.currentFilter) {
            case 'cousin-connect':
                this.filteredMembers = this.filteredMembers.filter(m => m.cousin_connect_available);
                break;
            default:
                // 'all' (Directory) - no additional filtering
                break;
        }
    }
    
    updateFilterButtons(activeButton) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        activeButton.classList.add('active');
    }
    
    setView(view) {
        this.currentView = view;
        this.renderView();
    }
    
    updateViewButtons(activeButton) {
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        activeButton.classList.add('active');
    }
    
    renderView() {
        const connectionsGrid = document.getElementById('connections-grid');
        const mapView = document.getElementById('connection-map-view');
        
        // Hide all views
        connectionsGrid.style.display = 'none';
        mapView.style.display = 'none';
        
        switch (this.currentView) {
            case 'cards':
                connectionsGrid.style.display = 'grid';
                this.renderFamilyCards();
                break;
            case 'map':
                mapView.style.display = 'block';
                this.renderConnectionMap();
                break;
        }
    }
    
    renderFamilyCards() {
        const container = document.getElementById('connections-grid');
        
        if (this.filteredMembers.length === 0) {
            const isFiltered = this.currentFilter !== 'all' || document.getElementById('family-search').value.trim();
            container.innerHTML = `
                <div class="empty-connections">
                    <div class="icon">👥</div>
                    <h3>${isFiltered ? 'No family members match your criteria' : 'No family members found'}</h3>
                    <p>${isFiltered ? 'Try adjusting your search or filters to see more results' : 'Family members will appear here once they join the directory'}</p>
                </div>
            `;
            return;
        }
        
        // Sort alphabetically by display name
        const sortedMembers = [...this.filteredMembers].sort((a, b) => 
            a.display_name.localeCompare(b.display_name)
        );
        
        // Group by first letter
        const letterGroups = {};
        sortedMembers.forEach(member => {
            const firstLetter = member.display_name[0].toUpperCase();
            if (!letterGroups[firstLetter]) {
                letterGroups[firstLetter] = [];
            }
            letterGroups[firstLetter].push(member);
        });
        
        // Render letter groups
        let html = '';
        Object.keys(letterGroups).sort().forEach(letter => {
            html += `
                <div class="letter-group">
                    <div class="letter-header">${letter}</div>
                    <div class="letter-cards">
                        ${letterGroups[letter].map(member => this.renderFamilyCard(member)).join('')}
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        // Add event listeners to cards for popup
        document.querySelectorAll('.family-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('btn') && !e.target.closest('.btn')) {
                    this.openProfileModal(parseInt(card.dataset.memberId));
                }
            });
        });
    }
    
    renderFamilyCard(member) {
        const isCousinConnect = member.cousin_connect_available;
        
        return `
            <div class="family-card rolodex-card" data-member-id="${member.id}">
                <div class="card-header">
                    <div class="member-info">
                        <h3>${member.display_name}</h3>
                        <div class="member-badges">
                            ${isCousinConnect ? '<span class="badge cousin-connect">Cousin Connect</span>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    updateRelationship(memberId, relationship) {
        // TODO: Implement database save for relationship data
        if (relationship) {
            this.showMessage(`Relationship updated: ${relationship}`, 'success');
        }
    }
    
    
    
    parseInterests(interestsString) {
        if (!interestsString) return [];
        
        const interestMap = {
            'family-history': '📚 Family History',
            'photos': '📸 Photos',
            'recipes': '🍝 Recipes',
            'travel': '✈️ Travel',
            'hobbies': '🎨 Hobbies',
            'mentoring': '🤝 Mentoring',
            'events': '🎉 Events',
            'pen-pals': '💌 Pen Pals'
        };
        
        return interestsString.split(',').map(interest => {
            const trimmed = interest.trim();
            return interestMap[trimmed] || trimmed;
        });
    }
    
    
    renderConnectionMap() {
        const mapContainer = document.querySelector('.map-container');
        
        if (this.filteredMembers.length === 0) {
            mapContainer.innerHTML = `
                <div class="map-view">
                    <h3>Connection Map</h3>
                    <div class="empty-map">
                        <div class="icon">🗺️</div>
                        <p>Connection map will show family relationships once members join the directory</p>
                    </div>
                </div>
            `;
            return;
        }
        
        setTimeout(() => {
            const displayMembers = this.filteredMembers.slice(0, 8);
            mapContainer.innerHTML = `
                <div class="map-view">
                    <h3>Connection Map</h3>
                    <p>Showing connections for ${this.filteredMembers.length} member${this.filteredMembers.length !== 1 ? 's' : ''}</p>
                    <div class="map-placeholder">
                        <div class="connection-nodes">
                            ${displayMembers.map(member => `
                                <div class="connection-node">
                                    <div class="node-avatar">${member.display_name[0]}</div>
                                    <div class="node-label">${member.display_name}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        }, 300);
    }
    
    showContactInfo(element) {
        const email = element.dataset.email;
        element.textContent = email;
        element.classList.remove('show-on-click');
        
        // Show success message
        this.showMessage('✅ Contact info revealed!', 'success');
    }
    
    updateUserStatusDisplay() {
        if (!this.currentUser) return;
        
        const statusIndicator = document.getElementById('status-indicator');
        const statusTitle = document.getElementById('status-title');
        const statusDescription = document.getElementById('status-description');
        const toggleBtn = document.getElementById('status-toggle-btn');
        const toggleText = document.getElementById('toggle-text');
        
        const isAvailable = this.currentUser.cousin_connect_available;
        
        if (isAvailable) {
            statusIndicator.className = 'status-indicator available';
            statusTitle.textContent = 'Available for Connection';
            statusDescription.textContent = 'You\'re marked as available for cousin connections. Family members can reach out to you.';
            toggleText.textContent = 'Set Unavailable';
            toggleBtn.className = 'btn status-toggle';
        } else {
            statusIndicator.className = 'status-indicator';
            statusTitle.textContent = 'Not Available';
            statusDescription.textContent = 'You\'re not marked as available for cousin connections. Click to change your status.';
            toggleText.textContent = 'Set Available';
            toggleBtn.className = 'btn status-toggle secondary';
        }
    }
    
    async toggleCousinConnectStatus() {
        if (!this.isLoggedIn) {
            this.showMessage('Please log in to update your status', 'error');
            return;
        }
        
        const newStatus = !this.currentUser.cousin_connect_available;
        
        try {
            const response = await fetch('/api/cousin-connect.php?action=toggle_availability', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    available: newStatus,
                    interests: this.currentUser.cousin_connect_interests || ''
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.currentUser.cousin_connect_available = newStatus;
                this.updateUserStatusDisplay();
                this.showMessage(data.message, 'success');
                
                // Refresh family data to show updated status
                await this.loadFamilyData();
                this.renderView();
            } else {
                this.showMessage('Error updating status: ' + data.error, 'error');
            }
        } catch (error) {
            this.showMessage('Connection error. Please try again.', 'error');
        }
    }
    
    showInterestsEditor() {
        const editor = document.getElementById('interests-editor');
        editor.style.display = 'block';
        
        // Load current interests
        const currentInterests = this.currentUser.cousin_connect_interests?.split(',') || [];
        document.querySelectorAll('.interest-category input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = currentInterests.includes(checkbox.value);
        });
    }
    
    hideInterestsEditor() {
        document.getElementById('interests-editor').style.display = 'none';
    }
    
    async saveInterests() {
        const selectedInterests = Array.from(document.querySelectorAll('.interest-category input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value);
        
        const interestsString = selectedInterests.join(',');
        
        try {
            const response = await fetch('/api/cousin-connect.php?action=toggle_availability', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    available: this.currentUser.cousin_connect_available,
                    interests: interestsString
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.currentUser.cousin_connect_interests = interestsString;
                this.hideInterestsEditor();
                this.showMessage('Interests updated successfully!', 'success');
                
                // Refresh family data
                await this.loadFamilyData();
                this.renderView();
            } else {
                this.showMessage('Error updating interests: ' + data.error, 'error');
            }
        } catch (error) {
            this.showMessage('Connection error. Please try again.', 'error');
        }
    }
    
    openProfileModal(memberId) {
        const member = this.familyMembers.find(m => m.id === memberId);
        if (!member) return;
        
        const modal = document.getElementById('profile-modal');
        
        // Privacy tier logic
        const showFullInfo = this.privacyLevel === 'family';
        const showCousinConnectEmail = member.cousin_connect_available && !showFullInfo;
        
        // Populate modal content
        document.getElementById('profile-name').textContent = member.display_name;
        
        // Handle email based on privacy
        const emailElement = document.getElementById('profile-email');
        if (showFullInfo) {
            emailElement.textContent = member.email || 'Not provided';
        } else if (showCousinConnectEmail) {
            emailElement.innerHTML = `<span class="show-on-click" data-email="${member.email}">Click to show email</span>`;
        } else {
            emailElement.textContent = 'Email hidden';
        }
        
        document.getElementById('profile-phone').textContent = 
            showFullInfo ? (member.phone || 'Not provided') : 'Phone hidden';
        document.getElementById('profile-interests').textContent = 
            this.parseInterests(member.cousin_connect_interests).join(', ') || 'Not specified';
        document.getElementById('profile-member-since').textContent = 
            new Date(member.created_at).toLocaleDateString();
        
        // Set avatar
        const avatar = document.getElementById('profile-avatar');
        avatar.textContent = member.display_name[0].toUpperCase();
        
        // Store member ID for actions
        modal.dataset.memberId = memberId;
        
        // USE UNIFIED MODAL SYSTEM
        if (window.unifiedModal) {
            window.unifiedModal.open('profile-modal');
        } else {
            // Fallback for legacy compatibility
            modal.classList.add('active');
        }
        
        // Add event listener for show-on-click email if present
        const showOnClick = modal.querySelector('.show-on-click');
        if (showOnClick) {
            showOnClick.addEventListener('click', (e) => {
                this.showContactInfo(e.target);
            });
        }
        
        // Add event listener for relationship selector
        const relationshipSelect = document.getElementById('profile-relationship-select');
        relationshipSelect.onchange = (e) => {
            this.updateRelationship(memberId, e.target.value);
        };
    }
    
    closeProfileModal() {
        // USE UNIFIED MODAL SYSTEM
        if (window.unifiedModal) {
            window.unifiedModal.close('profile-modal');
        } else {
            // Fallback for legacy compatibility
            document.getElementById('profile-modal').classList.remove('active');
        }
    }
    
    sendMessage() {
        const memberId = document.getElementById('profile-modal').dataset.memberId;
        const member = this.familyMembers.find(m => m.id == memberId);
        
        this.closeProfileModal();
        
        // Redirect to messaging with user ID for reliability
        window.location.href = `inbox.php?user=${member.id}`;
    }
    
    sendMessageToMember(memberId) {
        const member = this.familyMembers.find(m => m.id === memberId);
        if (!member) return;
        
        // Redirect to messaging with user ID for reliability
        window.location.href = `inbox.php?user=${member.id}`;
    }
    
    viewPhotos() {
        const memberId = document.getElementById('profile-modal').dataset.memberId;
        this.closeProfileModal();
        window.location.href = `photos.php?member=${memberId}`;
    }
    
    viewCalendar() {
        this.closeProfileModal();
        window.location.href = `calendar.php`;
    }
    
    animateEntrance() {
        const elements = document.querySelectorAll('.family-card, .connection-hero, .connection-controls');
        elements.forEach((element, index) => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                element.style.transition = 'all 0.6s ease';
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }
    
    startRealTimeUpdates() {
        // Update stats every 30 seconds
        setInterval(() => {
            this.updateStats();
        }, 30000);
        
        // Refresh family data every 2 minutes
        setInterval(() => {
            this.loadFamilyData();
        }, 120000);
    }
    
    showMessage(text, type = 'success') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `${type}-message`;
        messageDiv.innerHTML = `
            <span class="icon">${type === 'success' ? '✅' : '❌'}</span>
            ${text}
        `;
        
        document.body.insertBefore(messageDiv, document.body.firstChild);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

// Initialize the Family Connection Intelligence System
const familyConnections = new FamilyConnectionIntelligence();