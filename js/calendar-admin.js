// Calendar Admin Module

class CalendarAdmin {
    constructor() {
        this.pendingEvents = [];
        this.approvedEvents = [];
        this.currentEvent = null;
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        // Don't load data until module is rendered
    }
    
    async loadEventData() {
        try {
            // Load from event_submissions and calendar_events tables
            const response = await fetch('/api/calendar.php?action=admin_events', {
                credentials: 'same-origin'
            });
            if (response.ok) {
                const data = await response.json();
                this.pendingEvents = data.pending || [];
                this.approvedEvents = data.approved || [];
            } else {
                // Try to get error message
                try {
                    const errorData = await response.json();
                    console.error('Calendar API error:', errorData.error || 'Unknown error');
                } catch (e) {
                    console.error('Calendar API returned status:', response.status);
                }
                this.pendingEvents = [];
                this.approvedEvents = [];
            }
        } catch (error) {
            console.error('Error loading event data:', error);
            this.pendingEvents = [];
            this.approvedEvents = [];
        }
    }
    
    setupEventListeners() {
        // Event listeners will be added when the module renders
    }
    
    async render(container) {
        // Load data if not already loaded
        if (this.pendingEvents.length === 0 && this.approvedEvents.length === 0) {
            await this.loadEventData();
        }
        
        const pendingCount = this.pendingEvents.length;
        const approvedCount = this.approvedEvents.length;
        
        container.innerHTML = `
            <div class="calendar-admin">
                <!-- Stats Overview -->
                <div class="admin-stats-grid">
                    <div class="stat-card pending">
                        <div class="stat-number">${pendingCount}</div>
                        <div class="stat-label">📝 Pending Review</div>
                    </div>
                    <div class="stat-card approved">
                        <div class="stat-number">${approvedCount}</div>
                        <div class="stat-label">✅ On Calendar</div>
                    </div>
                    <div class="stat-card submissions">
                        <div class="stat-number">${pendingCount + approvedCount}</div>
                        <div class="stat-label">📋 Total Submissions</div>
                    </div>
                </div>

                <!-- Admin Tabs -->
                <div class="admin-tabs">
                    <button class="tab-btn active" onclick="showCalendarTab('pending')" data-count="${pendingCount}">
                        <span class="tab-icon">📝</span>
                        <span class="tab-text">Pending Review</span>
                        ${pendingCount > 0 ? `<span class="tab-badge">${pendingCount}</span>` : ''}
                    </button>
                    <button class="tab-btn" onclick="showCalendarTab('approved')" data-count="${approvedCount}">
                        <span class="tab-icon">✅</span>
                        <span class="tab-text">Approved Events</span>
                        ${approvedCount > 0 ? `<span class="tab-badge approved">${approvedCount}</span>` : ''}
                    </button>
                    <button class="tab-btn" onclick="showCalendarTab('create')">
                        <span class="tab-icon">➕</span>
                        <span class="tab-text">Direct Create</span>
                    </button>
                </div>
                
                <!-- Pending Events Tab -->
                <div class="tab-content active" id="pendingEventsTab">
                    <div class="tab-header">
                        <div class="header-info">
                            <h3>📝 Event Submissions Pending Review</h3>
                            <p>Review family member event submissions for calendar approval</p>
                        </div>
                        <div class="header-actions">
                            <button onclick="refreshPendingEvents()" class="btn-secondary">
                                <span class="btn-icon">🔄</span>
                                <span class="btn-text">Refresh</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="events-list" id="pendingEventsList">
                        ${this.renderPendingEvents()}
                    </div>
                </div>
                
                <!-- Approved Events Tab -->
                <div class="tab-content" id="approvedEventsTab">
                    <div class="tab-header">
                        <div class="header-info">
                            <h3>✅ Approved Events</h3>
                            <p>Events currently on the family calendar - edit or remove as needed</p>
                        </div>
                        <div class="header-actions">
                            <button onclick="refreshApprovedEvents()" class="btn-secondary">
                                <span class="btn-icon">🔄</span>
                                <span class="btn-text">Refresh</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="events-list" id="approvedEventsList">
                        ${this.renderApprovedEvents()}
                    </div>
                </div>
                
                <!-- Direct Create Tab -->
                <div class="tab-content" id="createEventsTab">
                    <div class="tab-header">
                        <div class="header-info">
                            <h3>➕ Direct Event Creation</h3>
                            <p>Create events directly on the calendar without moderation workflow</p>
                        </div>
                    </div>
                    
                    <div class="container">
                        <form class="card" id="adminEventForm">
                            <div class="card-header">
                                <h3>📅 Event Details</h3>
                                <p>Create a new event directly on the family calendar</p>
                            </div>
                            
                            <div class="card-body">
                                <div class="form-group">
                                    <label for="adminEventTitle">Event Title *</label>
                                    <input type="text" class="form-input" id="adminEventTitle" placeholder="Family BBQ, Birthday Party, etc." required>
                                </div>
                                
                                <div class="form-group">
                                    <label for="adminEventDate">Event Date *</label>
                                    <input type="date" class="form-input" id="adminEventDate" required>
                                </div>
                                
                                <div class="form-group">
                                    <label for="adminEventType">Event Type</label>
                                    <select class="form-select" id="adminEventType">
                                        <option value="birthday">🎂 Birthday</option>
                                        <option value="reunion">👨‍👩‍👧‍👦 Family Reunion</option>
                                        <option value="holiday">🎄 Holiday</option>
                                        <option value="anniversary">💒 Anniversary</option>
                                        <option value="general">📅 General Event</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label for="adminEventDescription">Description</label>
                                    <textarea class="form-input" id="adminEventDescription" rows="4" placeholder="Event details, location, what to bring, etc."></textarea>
                                </div>
                                
                                <div class="form-group">
                                    <label for="adminEventRecurring">Recurring</label>
                                    <select class="form-select" id="adminEventRecurring">
                                        <option value="none">One-time event</option>
                                        <option value="yearly">Every year</option>
                                        <option value="monthly">Every month</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="card-footer">
                                <button type="reset" class="btn btn-secondary">
                                    🔄 Reset Form
                                </button>
                                <button type="submit" class="btn btn-primary">
                                    ➕ Create Event
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            
            <!-- Event Review Modal -->
            <div class="modal" id="eventReviewModal">
                <div class="modal-content large">
                    <div class="modal-header">
                        <h3>📋 Review Event Submission</h3>
                        <button onclick="closeEventModal()" class="modal-close">×</button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="event-preview">
                            <div class="event-details-grid">
                                <div class="detail-item">
                                    <strong>Event Title:</strong>
                                    <span id="reviewEventTitle">-</span>
                                </div>
                                <div class="detail-item">
                                    <strong>Date:</strong>
                                    <span id="reviewEventDate">-</span>
                                </div>
                                <div class="detail-item">
                                    <strong>Type:</strong>
                                    <span id="reviewEventType">-</span>
                                </div>
                                <div class="detail-item">
                                    <strong>Recurring:</strong>
                                    <span id="reviewEventRecurring">-</span>
                                </div>
                                <div class="detail-item">
                                    <strong>Submitted by:</strong>
                                    <span id="reviewEventSubmitter">-</span>
                                </div>
                                <div class="detail-item">
                                    <strong>Contact Info:</strong>
                                    <span id="reviewEventContact">-</span>
                                </div>
                            </div>
                            
                            <div class="detail-section">
                                <strong>Description:</strong>
                                <div id="reviewEventDescription" class="description-box">-</div>
                            </div>
                        </div>
                        
                        <div class="review-form">
                            <div class="form-group">
                                <label for="eventReviewerNotes">Reviewer Notes (optional)</label>
                                <textarea id="eventReviewerNotes" placeholder="Add notes about your decision..."></textarea>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <button onclick="rejectEvent()" class="btn-danger">
                            ❌ Reject
                        </button>
                        <button onclick="requestEventInfo()" class="btn-secondary">
                            📝 Request More Info
                        </button>
                        <button onclick="approveEvent()" class="btn-primary">
                            ✅ Approve Event
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderPendingEvents() {
        if (this.pendingEvents.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-icon">🎉</div>
                    <h3>All caught up!</h3>
                    <p>No pending event submissions to review. Family members can submit events through the calendar page.</p>
                </div>
            `;
        }
        
        return this.pendingEvents.map(event => {
            const submitDate = new Date(event.submitted_at).toLocaleDateString();
            const eventDate = new Date(event.event_date).toLocaleDateString();
            const eventTypeEmoji = this.getEventTypeEmoji(event.event_type);
            const daysUntilEvent = Math.ceil((new Date(event.event_date) - new Date()) / (1000 * 60 * 60 * 24));
            
            return `
                <div class="event-card pending">
                    <div class="event-priority">
                        ${daysUntilEvent <= 7 ? '<span class="priority-badge urgent">Urgent</span>' : ''}
                        ${daysUntilEvent <= 30 && daysUntilEvent > 7 ? '<span class="priority-badge soon">Soon</span>' : ''}
                    </div>
                    
                    <div class="event-header">
                        <div class="event-title-section">
                            <h4 class="event-title">${eventTypeEmoji} ${event.title}</h4>
                            <div class="event-meta">
                                <span class="event-date">📅 ${eventDate}</span>
                                <span class="submit-date">📝 Submitted ${submitDate}</span>
                                ${daysUntilEvent > 0 ? `<span class="days-until">⏰ ${daysUntilEvent} days</span>` : '<span class="days-until overdue">⚠️ Past due</span>'}
                            </div>
                        </div>
                        
                        <div class="event-actions">
                            <button onclick="quickApproveEvent(${event.id})" class="action-btn approve" title="Quick Approve">
                                <span class="btn-icon">✅</span>
                                <span class="btn-text">Approve</span>
                            </button>
                            <button onclick="reviewEvent(${event.id})" class="action-btn primary" title="Review Details">
                                <span class="btn-icon">👁️</span>
                                <span class="btn-text">Review</span>
                            </button>
                            <button onclick="quickRejectEvent(${event.id})" class="action-btn reject" title="Quick Reject">
                                <span class="btn-icon">❌</span>
                                <span class="btn-text">Reject</span>
                            </button>
                        </div>
                    </div>
                    
                    ${event.description ? `
                        <div class="event-description">
                            <p>${event.description}</p>
                        </div>
                    ` : ''}
                    
                    <div class="event-details">
                        <div class="detail-item">
                            <span class="detail-label">Type:</span>
                            <span class="detail-value">${event.event_type}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Recurring:</span>
                            <span class="detail-value">${event.recurring}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Contact:</span>
                            <span class="detail-value">${event.contact_info || 'Not provided'}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    renderApprovedEvents() {
        if (this.approvedEvents.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-icon">📅</div>
                    <h3>No approved events yet</h3>
                    <p>Approved events will appear here and on the family calendar. Events can be approved from the Pending Review tab.</p>
                </div>
            `;
        }
        
        return this.approvedEvents.map(event => {
            const eventDate = new Date(event.event_date).toLocaleDateString();
            const eventTypeEmoji = this.getEventTypeEmoji(event.event_type);
            const daysUntilEvent = Math.ceil((new Date(event.event_date) - new Date()) / (1000 * 60 * 60 * 24));
            
            return `
                <div class="event-card approved">
                    <div class="event-status">
                        <span class="status-badge approved">✅ On Calendar</span>
                        ${daysUntilEvent <= 7 && daysUntilEvent > 0 ? '<span class="status-badge upcoming">📅 This Week</span>' : ''}
                        ${daysUntilEvent <= 0 ? '<span class="status-badge past">📅 Past Event</span>' : ''}
                    </div>
                    
                    <div class="event-header">
                        <div class="event-title-section">
                            <h4 class="event-title">${eventTypeEmoji} ${event.title}</h4>
                            <div class="event-meta">
                                <span class="event-date">📅 ${eventDate}</span>
                                ${daysUntilEvent > 0 ? `<span class="days-until">⏰ ${daysUntilEvent} days</span>` : ''}
                                ${daysUntilEvent <= 0 ? `<span class="days-past">⏰ ${Math.abs(daysUntilEvent)} days ago</span>` : ''}
                            </div>
                        </div>
                        
                        <div class="event-actions">
                            <button onclick="editEvent(${event.id})" class="action-btn secondary" title="Edit Event">
                                <span class="btn-icon">✏️</span>
                                <span class="btn-text">Edit</span>
                            </button>
                            <button onclick="duplicateEvent(${event.id})" class="action-btn primary" title="Duplicate Event">
                                <span class="btn-icon">📋</span>
                                <span class="btn-text">Duplicate</span>
                            </button>
                            <button onclick="removeEvent(${event.id})" class="action-btn danger" title="Remove from Calendar">
                                <span class="btn-icon">🗑️</span>
                                <span class="btn-text">Remove</span>
                            </button>
                        </div>
                    </div>
                    
                    ${event.description ? `
                        <div class="event-description">
                            <p>${event.description}</p>
                        </div>
                    ` : ''}
                    
                    <div class="event-details">
                        <div class="detail-item">
                            <span class="detail-label">Type:</span>
                            <span class="detail-value">${event.event_type}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Recurring:</span>
                            <span class="detail-value">${event.recurring}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Added:</span>
                            <span class="detail-value">${event.approved_at ? new Date(event.approved_at).toLocaleDateString() : 'Direct creation'}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    getEventTypeEmoji(type) {
        const emojiMap = {
            birthday: '🎂',
            anniversary: '💍',
            reunion: '👨‍👩‍👧‍👦',
            holiday: '🎉',
            gathering: '🏠',
            other: '📅'
        };
        return emojiMap[type] || '📅';
    }
    
    findEvent(id) {
        return this.pendingEvents.find(event => event.id === id);
    }
    
    async getStats() {
        return [
            {
                label: 'Pending Events',
                value: this.pendingEvents.length
            },
            {
                label: 'Approved Events',
                value: this.approvedEvents.length
            }
        ];
    }
    
    showMessage(text, type = 'info') {
        // Use admin core's message system for consistent positioning
        if (window.adminCore) {
            adminCore.showMessage(text, type);
        } else {
            // Fallback for standalone testing
            console.log(`${type.toUpperCase()}: ${text}`);
        }
    }
}

// Global functions for event management
function showCalendarTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Map tab names to correct IDs
    const tabIds = {
        'pending': 'pendingEventsTab',
        'approved': 'approvedEventsTab', 
        'create': 'createEventsTab'
    };
    
    // Show selected tab
    const tabElement = document.getElementById(tabIds[tabName]);
    if (tabElement) {
        tabElement.classList.add('active');
    }
    
    // Make clicked button active
    event.target.closest('.tab-btn').classList.add('active');
}

function refreshPendingEvents() {
    calendarAdmin.loadEventData().then(() => {
        const container = document.getElementById('pendingEventsList');
        container.innerHTML = calendarAdmin.renderPendingEvents();
        calendarAdmin.showMessage('Refreshed pending events', 'success');
    });
}

function reviewEvent(eventId) {
    const event = calendarAdmin.findEvent(eventId);
    if (!event) {
        calendarAdmin.showMessage('Event not found', 'error');
        return;
    }
    
    calendarAdmin.currentEvent = event;
    
    // Populate modal with event data
    document.getElementById('reviewEventTitle').textContent = event.title;
    document.getElementById('reviewEventDate').textContent = new Date(event.event_date).toLocaleDateString();
    document.getElementById('reviewEventType').textContent = event.event_type;
    document.getElementById('reviewEventRecurring').textContent = event.recurring;
    document.getElementById('reviewEventSubmitter').textContent = `User ${event.submitter_id}`;
    document.getElementById('reviewEventContact').textContent = event.contact_info || 'None provided';
    document.getElementById('reviewEventDescription').textContent = event.description || 'No description provided';
    
    // Show modal
    document.getElementById('eventReviewModal').classList.add('active');
}

function closeEventModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    
    // Clear form data
    document.getElementById('eventReviewerNotes').value = '';
    calendarAdmin.currentEvent = null;
}

async function approveEvent() {
    const reviewerNotes = document.getElementById('eventReviewerNotes').value;
    
    try {
        const response = await fetch('/api/approve-event.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                eventId: calendarAdmin.currentEvent.id,
                reviewerNotes: reviewerNotes,
                reviewerId: 1 // Mock admin ID
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            calendarAdmin.showMessage('Event approved successfully!', 'success');
            closeEventModal();
            
            // Remove from pending list
            calendarAdmin.pendingEvents = calendarAdmin.pendingEvents.filter(
                e => e.id !== calendarAdmin.currentEvent.id
            );
            
            // Refresh display
            const container = document.getElementById('pendingEventsList');
            container.innerHTML = calendarAdmin.renderPendingEvents();
        } else {
            calendarAdmin.showMessage(result.error || 'Approval failed', 'error');
        }
    } catch (error) {
        console.error('Approval error:', error);
        calendarAdmin.showMessage('Network error during approval', 'error');
    }
}

async function rejectEvent() {
    const reviewerNotes = document.getElementById('eventReviewerNotes').value;
    
    if (!reviewerNotes.trim()) {
        calendarAdmin.showMessage('Please provide a reason for rejection', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/reject-event.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                eventId: calendarAdmin.currentEvent.id,
                reviewerNotes: reviewerNotes,
                reviewerId: 1 // Mock admin ID
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            calendarAdmin.showMessage('Event rejected', 'success');
            closeEventModal();
            
            // Remove from pending list
            calendarAdmin.pendingEvents = calendarAdmin.pendingEvents.filter(
                e => e.id !== calendarAdmin.currentEvent.id
            );
            
            // Refresh display
            const container = document.getElementById('pendingEventsList');
            container.innerHTML = calendarAdmin.renderPendingEvents();
        } else {
            calendarAdmin.showMessage(result.error || 'Rejection failed', 'error');
        }
    } catch (error) {
        console.error('Rejection error:', error);
        calendarAdmin.showMessage('Network error during rejection', 'error');
    }
}

function requestEventInfo() {
    const reviewerNotes = document.getElementById('eventReviewerNotes').value;
    
    if (!reviewerNotes.trim()) {
        calendarAdmin.showMessage('Please add notes explaining what info is needed', 'error');
        return;
    }
    
    // Mock request more info process
    console.log('Requesting more info for event:', calendarAdmin.currentEvent.id, reviewerNotes);
    calendarAdmin.showMessage('Info request sent to submitter', 'success');
    closeEventModal();
}

function quickApproveEvent(eventId) {
    const event = calendarAdmin.findEvent(eventId);
    if (!event) return;
    
    // Mock quick approval
    console.log('Quick approving event:', eventId);
    calendarAdmin.showMessage(`"${event.title}" approved`, 'success');
    
    // Remove from pending
    calendarAdmin.pendingEvents = calendarAdmin.pendingEvents.filter(e => e.id !== eventId);
    
    // Refresh display
    const container = document.getElementById('pendingEventsList');
    container.innerHTML = calendarAdmin.renderPendingEvents();
}

function quickRejectEvent(eventId) {
    if (!confirm('Are you sure you want to reject this event?')) return;
    
    // Mock quick rejection
    console.log('Quick rejecting event:', eventId);
    calendarAdmin.showMessage('Event rejected', 'success');
    
    // Remove from pending
    calendarAdmin.pendingEvents = calendarAdmin.pendingEvents.filter(e => e.id !== eventId);
    
    // Refresh display
    const container = document.getElementById('pendingEventsList');
    container.innerHTML = calendarAdmin.renderPendingEvents();
}

function editEvent(eventId) {
    calendarAdmin.showMessage(`Edit event: ${eventId} (not implemented)`, 'info');
}

function removeEvent(eventId) {
    if (confirm('Are you sure you want to remove this event from the calendar?')) {
        calendarAdmin.showMessage(`Event removed: ${eventId} (not implemented)`, 'info');
    }
}

function duplicateEvent(eventId) {
    const event = calendarAdmin.approvedEvents.find(e => e.id === eventId);
    if (event) {
        calendarAdmin.showMessage(`Duplicate event: "${event.title}" (not implemented)`, 'info');
    }
}

function refreshApprovedEvents() {
    calendarAdmin.showMessage('Refreshed approved events', 'success');
}

// Initialize calendar admin
const calendarAdmin = new CalendarAdmin();

// Register with admin core when it's ready
if (window.adminCore) {
    adminCore.registerModule({
        name: 'calendar',
        title: 'Calendar Events',
        icon: '📅',
        priority: 2,
        getStats: () => calendarAdmin.getStats(),
        render: (container) => calendarAdmin.render(container)
    });
} else {
    // Wait for admin core to load
    document.addEventListener('DOMContentLoaded', () => {
        if (window.adminCore) {
            adminCore.registerModule({
                name: 'calendar',
                title: 'Calendar Events',
                icon: '📅',
                priority: 2,
                getStats: () => calendarAdmin.getStats(),
                render: (container) => calendarAdmin.render(container)
            });
        }
    });
}

// Add beautiful CSS for calendar admin
const calendarAdminStyle = document.createElement('style');
calendarAdminStyle.textContent = `
    /* Calendar Admin Container */
    .calendar-admin {
        max-width: 1200px;
        margin: 0 auto;
    }
    
    /* Stats Overview */
    .admin-stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: var(--spacing-lg);
        margin-bottom: var(--spacing-2xl);
    }
    
    .admin-stats-grid .stat-card {
        background: var(--glass-bg);
        backdrop-filter: var(--glass-backdrop);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-xl);
        padding: var(--spacing-xl);
        text-align: center;
        transition: all var(--animation-normal);
        box-shadow: var(--glass-shadow);
    }
    
    .admin-stats-grid .stat-card:hover {
        transform: translateY(-2px);
        box-shadow: var(--glass-shadow-hover);
        border-color: var(--primary-light);
    }
    
    .admin-stats-grid .stat-number {
        font-size: 2.5rem;
        font-weight: 700;
        margin-bottom: var(--spacing-sm);
        background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }
    
    .admin-stats-grid .stat-label {
        font-size: var(--font-size-sm);
        font-weight: 600;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    /* Admin Tabs */
    .admin-tabs {
        display: flex;
        gap: var(--spacing-sm);
        margin-bottom: var(--spacing-2xl);
        border-bottom: 2px solid var(--glass-border);
        padding-bottom: var(--spacing-lg);
    }
    
    .tab-btn {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-md) var(--spacing-xl);
        background: var(--glass-bg);
        backdrop-filter: var(--glass-backdrop);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-lg);
        color: var(--text-secondary);
        font-size: var(--font-size-sm);
        font-weight: 600;
        cursor: pointer;
        transition: all var(--animation-normal);
        position: relative;
        overflow: hidden;
    }
    
    .tab-btn:hover {
        background: var(--glass-bg-hover);
        color: var(--text-primary);
        transform: translateY(-1px);
        box-shadow: var(--glass-shadow);
    }
    
    .tab-btn.active {
        background: var(--primary);
        color: white;
        border-color: var(--primary);
        box-shadow: var(--glass-shadow-hover);
    }
    
    .tab-icon {
        font-size: var(--font-size-lg);
    }
    
    .tab-badge {
        background: rgba(255, 255, 255, 0.2);
        color: white;
        padding: 0.25rem 0.5rem;
        border-radius: var(--radius-full);
        font-size: 0.75rem;
        font-weight: 700;
        margin-left: var(--spacing-xs);
    }
    
    .tab-badge.approved {
        background: rgba(34, 197, 94, 0.2);
    }
    
    /* Tab Content */
    .tab-content {
        display: none;
    }
    
    .tab-content.active {
        display: block;
    }
    
    /* Tab Headers */
    .tab-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: var(--spacing-2xl);
        gap: var(--spacing-xl);
    }
    
    .header-info h3 {
        margin: 0 0 var(--spacing-sm) 0;
        font-size: var(--font-size-2xl);
        font-weight: 700;
        color: var(--text-primary);
    }
    
    .header-info p {
        margin: 0;
        color: var(--text-secondary);
        font-size: var(--font-size-sm);
    }
    
    .header-actions {
        display: flex;
        gap: var(--spacing-md);
    }
    
    /* Event Cards */
    .events-list {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-lg);
    }
    
    .event-card {
        background: var(--glass-bg);
        backdrop-filter: var(--glass-backdrop);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-xl);
        padding: var(--spacing-xl);
        transition: all var(--animation-normal);
        box-shadow: var(--glass-shadow);
        position: relative;
        overflow: hidden;
    }
    
    .event-card:hover {
        transform: translateY(-2px);
        box-shadow: var(--glass-shadow-hover);
        border-color: var(--primary-light);
    }
    
    .event-card.pending {
        border-left: 4px solid var(--primary);
    }
    
    .event-card.approved {
        border-left: 4px solid var(--success);
    }
    
    /* Event Priority/Status */
    .event-priority, .event-status {
        display: flex;
        gap: var(--spacing-sm);
        margin-bottom: var(--spacing-md);
    }
    
    .priority-badge, .status-badge {
        padding: 0.25rem 0.75rem;
        border-radius: var(--radius-full);
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .priority-badge.urgent {
        background: rgba(239, 68, 68, 0.1);
        color: #dc2626;
        border: 1px solid rgba(239, 68, 68, 0.2);
    }
    
    .priority-badge.soon {
        background: rgba(245, 158, 11, 0.1);
        color: #d97706;
        border: 1px solid rgba(245, 158, 11, 0.2);
    }
    
    .status-badge.approved {
        background: rgba(34, 197, 94, 0.1);
        color: #059669;
        border: 1px solid rgba(34, 197, 94, 0.2);
    }
    
    .status-badge.upcoming {
        background: rgba(59, 130, 246, 0.1);
        color: #2563eb;
        border: 1px solid rgba(59, 130, 246, 0.2);
    }
    
    .status-badge.past {
        background: rgba(107, 114, 128, 0.1);
        color: #6b7280;
        border: 1px solid rgba(107, 114, 128, 0.2);
    }
    
    /* Event Header */
    .event-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: var(--spacing-xl);
        margin-bottom: var(--spacing-lg);
    }
    
    .event-title-section {
        flex: 1;
    }
    
    .event-title {
        margin: 0 0 var(--spacing-sm) 0;
        font-size: var(--font-size-xl);
        font-weight: 700;
        color: var(--text-primary);
        line-height: 1.3;
    }
    
    .event-meta {
        display: flex;
        flex-wrap: wrap;
        gap: var(--spacing-md);
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
    }
    
    .event-meta span {
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }
    
    .days-until {
        color: var(--primary);
        font-weight: 600;
    }
    
    .days-until.overdue {
        color: #dc2626;
    }
    
    .days-past {
        color: var(--text-muted);
    }
    
    /* Event Actions */
    .event-actions {
        display: flex;
        gap: var(--spacing-sm);
        flex-wrap: wrap;
    }
    
    .action-btn {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        padding: var(--spacing-sm) var(--spacing-md);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-md);
        background: var(--glass-bg);
        color: var(--text-secondary);
        font-size: var(--font-size-sm);
        font-weight: 600;
        cursor: pointer;
        transition: all var(--animation-fast);
        white-space: nowrap;
    }
    
    .action-btn:hover {
        transform: translateY(-1px);
        box-shadow: var(--glass-shadow);
    }
    
    .action-btn.primary {
        background: var(--primary);
        border-color: var(--primary);
        color: white;
    }
    
    .action-btn.primary:hover {
        background: var(--primary-dark);
    }
    
    .action-btn.approve {
        background: rgba(34, 197, 94, 0.1);
        border-color: #22c55e;
        color: #059669;
    }
    
    .action-btn.approve:hover {
        background: #22c55e;
        color: white;
    }
    
    .action-btn.reject, .action-btn.danger {
        background: rgba(239, 68, 68, 0.1);
        border-color: #ef4444;
        color: #dc2626;
    }
    
    .action-btn.reject:hover, .action-btn.danger:hover {
        background: #ef4444;
        color: white;
    }
    
    .action-btn.secondary {
        background: var(--glass-bg-hover);
        border-color: var(--glass-border-hover);
    }
    
    .action-btn.secondary:hover {
        background: var(--text-secondary);
        color: white;
    }
    
    /* Event Description */
    .event-description {
        margin-bottom: var(--spacing-lg);
        padding: var(--spacing-md);
        background: rgba(139, 92, 246, 0.05);
        border: 1px solid rgba(139, 92, 246, 0.1);
        border-radius: var(--radius-md);
    }
    
    .event-description p {
        margin: 0;
        color: var(--text-primary);
        font-size: var(--font-size-sm);
        line-height: 1.5;
    }
    
    /* Event Details */
    .event-details {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: var(--spacing-md);
        margin-top: var(--spacing-md);
        padding-top: var(--spacing-md);
        border-top: 1px solid var(--glass-border);
    }
    
    .detail-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }
    
    .detail-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .detail-value {
        font-size: var(--font-size-sm);
        font-weight: 500;
        color: var(--text-primary);
    }
    
    /* Empty State */
    .empty-state {
        text-align: center;
        padding: var(--spacing-4xl);
        color: var(--text-secondary);
    }
    
    .empty-icon {
        font-size: 4rem;
        margin-bottom: var(--spacing-lg);
        opacity: 0.5;
    }
    
    .empty-state h3 {
        margin: 0 0 var(--spacing-md) 0;
        font-size: var(--font-size-xl);
        font-weight: 600;
        color: var(--text-primary);
    }
    
    .empty-state p {
        margin: 0;
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
        max-width: 400px;
        margin-left: auto;
        margin-right: auto;
    }
    
    /* Form styling handled by main.css unified system */
    
    /* Button Styles */
    .btn-primary, .btn-secondary, .btn-danger {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-md) var(--spacing-xl);
        border: 1px solid;
        border-radius: var(--radius-md);
        font-size: var(--font-size-sm);
        font-weight: 600;
        cursor: pointer;
        transition: all var(--animation-normal);
        text-decoration: none;
    }
    
    .btn-primary {
        background: var(--primary);
        border-color: var(--primary);
        color: white;
    }
    
    .btn-primary:hover {
        background: var(--primary-dark);
        transform: translateY(-1px);
        box-shadow: var(--glass-shadow-hover);
    }
    
    .btn-secondary {
        background: var(--glass-bg);
        border-color: var(--glass-border);
        color: var(--text-secondary);
    }
    
    .btn-secondary:hover {
        background: var(--glass-bg-hover);
        color: var(--text-primary);
        transform: translateY(-1px);
        box-shadow: var(--glass-shadow);
    }
    
    .btn-danger {
        background: rgba(239, 68, 68, 0.1);
        border-color: #ef4444;  
        color: #dc2626;
    }
    
    .btn-danger:hover {
        background: #ef4444;
        border-color: #dc2626;
        color: white;  
        transform: translateY(-1px);
        box-shadow: var(--glass-shadow-hover);
    }
    
    /* Mobile Responsiveness */
    @media (max-width: 768px) {
        .admin-stats-grid {
            grid-template-columns: 1fr;
        }
        
        .admin-tabs {
            flex-direction: column;
        }
        
        .tab-header {
            flex-direction: column;
            gap: var(--spacing-lg);
        }
        
        .event-header {
            flex-direction: column;
            gap: var(--spacing-lg);
        }
        
        .event-actions {
            width: 100%;
            justify-content: center;
        }
        
        .form-grid {
            grid-template-columns: 1fr;
        }
        
        .form-actions {
            flex-direction: column;
        }
    }
    
    .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 1rem;
        margin-bottom: 1rem;
    }
    
    .event-description {
        background: var(--eggshell);
        padding: 1rem;
        border-radius: 4px;
        margin-top: 1rem;
    }
    
    .quick-actions {
        display: flex;
        gap: 0.5rem;
        justify-content: flex-end;
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid var(--border);
    }
    
    .btn-small {
        padding: 0.5rem 1rem;
        font-size: 0.9rem;
    }
    
    .event-details-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
    }
    
    .detail-item {
        padding: 0.75rem;
        background: var(--eggshell);
        border-radius: 4px;
    }
    
    .detail-section {
        margin-bottom: 1.5rem;
    }
    
    .description-box {
        background: var(--eggshell);
        padding: 1rem;
        border-radius: 4px;
        margin-top: 0.5rem;
        white-space: pre-wrap;
    }
    
    .admin-event-form {
        background: white;
        padding: 2rem;
        border-radius: 8px;
        border: 1px solid var(--border);
    }
    
    .empty-state {
        text-align: center;
        padding: 3rem;
        color: var(--light-gray);
    }
    
    .pending-events-header,
    .approved-events-header,
    .create-event-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
    }
`;
document.head.appendChild(calendarAdminStyle);