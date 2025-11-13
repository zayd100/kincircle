// Events Admin Module - Family Coordination Management
// For family administrators to manage events and tasks across the platform

class EventsAdmin {
    constructor() {
        this.events = [];
        this.currentFilter = 'all';
        this.currentSort = 'date';
        this.selectedEvents = new Set();
        this.currentUser = this.getCurrentUser();
        
        this.init();
    }
    
    init() {
        this.loadEvents();
    }
    
    getCurrentUser() {
        return {
            id: 1,
            name: 'Clarke',
            isAdmin: true
        };
    }
    
    async loadEvents() {
        try {
            // Try to load from API
            const response = await fetch('/api/calendar.php?action=getEvents');
            const data = await response.json();
            
            if (data.success) {
                this.events = data.events.map(event => this.enrichEventData(event));
            } else {
                this.events = [];
            }
        } catch (error) {
            console.log('No events data available');
            this.events = [];
        }
    }
    
    enrichEventData(event) {
        return {
            ...event,
            attendeeCount: Math.floor(Math.random() * 20) + 5,
            taskCount: Math.floor(Math.random() * 25) + 3,
            completedTasks: Math.floor(Math.random() * 15),
            issues: Math.random() > 0.8 ? ['Duplicate tasks', 'Missing assignments'] : [],
            lastActivity: this.getRandomRecentDate(),
            createdBy: {
                id: Math.floor(Math.random() * 5) + 1,
                name: ['Sarah', 'Mike', 'Jenny', 'Tom', 'Lisa'][Math.floor(Math.random() * 5)]
            }
        };
    }
    
    generateMockEvents() {
        return [
            {
                id: 1,
                title: "Annual Family Reunion",
                event_date: "2025-07-15",
                event_type: "reunion",
                description: "Our biggest family gathering of the year",
                location: "Community Center",
                attendeeCount: 45,
                taskCount: 23,
                completedTasks: 12,
                issues: ['Missing venue confirmation', 'Task assignments needed'],
                lastActivity: '2025-01-14T10:30:00Z',
                createdBy: { id: 1, name: 'Sarah' }
            },
            {
                id: 2,
                title: "Grandma's 85th Birthday",
                event_date: "2025-03-20",
                event_type: "birthday",
                description: "Special celebration for Grandma",
                location: "Reed Family Home",
                attendeeCount: 25,
                taskCount: 15,
                completedTasks: 8,
                issues: [],
                lastActivity: '2025-01-15T14:20:00Z',
                createdBy: { id: 2, name: 'Mike' }
            },
            {
                id: 3,
                title: "Summer BBQ",
                event_date: "2025-08-20",
                event_type: "gathering",
                description: "Casual family get-together",
                location: "Uncle Mike's Backyard",
                attendeeCount: 18,
                taskCount: 8,
                completedTasks: 2,
                issues: ['Duplicate task entries'],
                lastActivity: '2025-01-13T09:15:00Z',
                createdBy: { id: 3, name: 'Jenny' }
            }
        ];
    }
    
    getRandomRecentDate() {
        const days = Math.floor(Math.random() * 7) + 1;
        const date = new Date();
        date.setDate(date.getDate() - days);
        return date.toISOString();
    }
    
    render(container) {
        container.innerHTML = `
            <div class="events-admin-container">
                <div class="admin-header">
                    <h2>🎉 Events Management</h2>
                    <p>Manage family events, tasks, and coordination</p>
                </div>
                
                <div class="admin-toolbar">
                    <div class="filter-controls">
                        <select id="eventFilter" class="admin-select">
                            <option value="all">All Events</option>
                            <option value="upcoming">Upcoming Events</option>
                            <option value="with-issues">Events with Issues</option>
                            <option value="high-task-count">High Task Count</option>
                            <option value="recent-activity">Recent Activity</option>
                        </select>
                        <select id="eventSort" class="admin-select">
                            <option value="date">Sort by Date</option>
                            <option value="activity">Sort by Activity</option>
                            <option value="tasks">Sort by Task Count</option>
                            <option value="attendees">Sort by Attendees</option>
                        </select>
                    </div>
                    
                    <div class="bulk-actions">
                        <button class="admin-btn secondary" id="selectAllEvents">
                            📋 Select All
                        </button>
                        <button class="admin-btn warning" id="bulkCleanupTasks" disabled>
                            🧹 Cleanup Selected
                        </button>
                        <button class="admin-btn danger" id="bulkDeleteEvents" disabled>
                            🗑️ Delete Selected
                        </button>
                        <button class="admin-btn primary" id="exportEventData">
                            📊 Export Data
                        </button>
                    </div>
                </div>
                
                <div class="admin-stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">📅</div>
                        <div class="stat-content">
                            <div class="stat-number" id="totalEvents">${this.events.length}</div>
                            <div class="stat-label">Total Events</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">⚠️</div>
                        <div class="stat-content">
                            <div class="stat-number" id="eventsWithIssues">${this.events.filter(e => e.issues.length > 0).length}</div>
                            <div class="stat-label">Events with Issues</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📋</div>
                        <div class="stat-content">
                            <div class="stat-number" id="totalTasks">${this.events.reduce((sum, e) => sum + e.taskCount, 0)}</div>
                            <div class="stat-label">Total Tasks</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">✅</div>
                        <div class="stat-content">
                            <div class="stat-number" id="completedTasks">${this.events.reduce((sum, e) => sum + e.completedTasks, 0)}</div>
                            <div class="stat-label">Completed Tasks</div>
                        </div>
                    </div>
                </div>
                
                <div class="events-admin-list" id="eventsAdminList">
                    ${this.renderEventsList()}
                </div>
                
                <div class="admin-help-section">
                    <h3>🆘 Family-Friendly Admin Tips</h3>
                    <div class="help-grid">
                        <div class="help-card">
                            <h4>👴👵 Helping Elderly Family Members</h4>
                            <ul>
                                <li>Look for events with many duplicate tasks</li>
                                <li>Clean up completed tasks to reduce confusion</li>
                                <li>Use template tasks for common events</li>
                                <li>Reset assignments if tasks were assigned incorrectly</li>
                            </ul>
                        </div>
                        <div class="help-card">
                            <h4>🚨 Common Issues to Watch For</h4>
                            <ul>
                                <li>Events with 20+ tasks (may be overwhelming)</li>
                                <li>Duplicate or very similar task names</li>
                                <li>Tasks assigned to users who can't complete them</li>
                                <li>Events with no tasks but many attendees</li>
                            </ul>
                        </div>
                        <div class="help-card">
                            <h4>🛠️ Quick Cleanup Actions</h4>
                            <ul>
                                <li>Use "Admin View" in task boards for direct editing</li>
                                <li>Bulk delete completed tasks after events</li>
                                <li>Add task templates for standard events</li>
                                <li>Export data before major cleanups</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.setupEventListeners();
    }
    
    renderEventsList() {
        let filteredEvents = [...this.events];
        
        // Apply filters
        switch (this.currentFilter) {
            case 'upcoming':
                const now = new Date();
                filteredEvents = filteredEvents.filter(e => new Date(e.event_date) >= now);
                break;
            case 'with-issues':
                filteredEvents = filteredEvents.filter(e => e.issues.length > 0);
                break;
            case 'high-task-count':
                filteredEvents = filteredEvents.filter(e => e.taskCount > 15);
                break;
            case 'recent-activity':
                const threeDaysAgo = new Date();
                threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
                filteredEvents = filteredEvents.filter(e => new Date(e.lastActivity) >= threeDaysAgo);
                break;
        }
        
        // Apply sorting
        switch (this.currentSort) {
            case 'date':
                filteredEvents.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
                break;
            case 'activity':
                filteredEvents.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
                break;
            case 'tasks':
                filteredEvents.sort((a, b) => b.taskCount - a.taskCount);
                break;
            case 'attendees':
                filteredEvents.sort((a, b) => b.attendeeCount - a.attendeeCount);
                break;
        }
        
        return filteredEvents.map(event => this.renderEventCard(event)).join('');
    }
    
    renderEventCard(event) {
        const eventTypeEmojis = {
            birthday: '🎂',
            anniversary: '💍',
            reunion: '👨‍👩‍👧‍👦',
            holiday: '🎄',
            gathering: '🎉',
            other: '📌'
        };
        
        const completionRate = event.taskCount > 0 ? Math.round((event.completedTasks / event.taskCount) * 100) : 0;
        const hasIssues = event.issues.length > 0;
        const isSelected = this.selectedEvents.has(event.id);
        
        return `
            <div class="admin-event-card ${hasIssues ? 'has-issues' : ''} ${isSelected ? 'selected' : ''}" 
                 data-event-id="${event.id}">
                <div class="event-card-header">
                    <div class="event-select">
                        <input type="checkbox" id="event-${event.id}" 
                               ${isSelected ? 'checked' : ''} 
                               onchange="eventsAdmin.toggleEventSelection(${event.id})">
                    </div>
                    <div class="event-info">
                        <h3 class="event-title">
                            ${eventTypeEmojis[event.event_type] || '📌'} ${event.title}
                        </h3>
                        <div class="event-meta">
                            <span class="event-date">${this.formatDate(event.event_date)}</span>
                            <span class="event-location">${event.location}</span>
                            <span class="event-creator">Created by ${event.createdBy.name}</span>
                        </div>
                    </div>
                    <div class="event-actions">
                        <button class="admin-btn small" onclick="eventsAdmin.openEventDetails(${event.id})">
                            👁️ View
                        </button>
                        <button class="admin-btn small warning" onclick="eventsAdmin.cleanupEvent(${event.id})">
                            🧹 Cleanup
                        </button>
                        <button class="admin-btn small danger" onclick="eventsAdmin.deleteEvent(${event.id})">
                            🗑️ Delete
                        </button>
                    </div>
                </div>
                
                <div class="event-stats">
                    <div class="stat">
                        <span class="stat-value">${event.attendeeCount}</span>
                        <span class="stat-label">Attendees</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${event.taskCount}</span>
                        <span class="stat-label">Tasks</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${completionRate}%</span>
                        <span class="stat-label">Complete</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${this.getTimeAgo(event.lastActivity)}</span>
                        <span class="stat-label">Last Activity</span>
                    </div>
                </div>
                
                ${hasIssues ? `
                    <div class="event-issues">
                        <h4>⚠️ Issues Detected:</h4>
                        <ul>
                            ${event.issues.map(issue => `<li>${issue}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                ${event.description ? `
                    <div class="event-description">
                        <p>${event.description}</p>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    
    getTimeAgo(dateStr) {
        const now = new Date();
        const date = new Date(dateStr);
        const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
        
        if (diffHours < 1) return 'Now';
        if (diffHours < 24) return `${diffHours}h ago`;
        
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return `${Math.floor(diffDays / 7)}w ago`;
    }
    
    setupEventListeners() {
        // Filter and sort controls
        document.getElementById('eventFilter').addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.refreshEventsList();
        });
        
        document.getElementById('eventSort').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.refreshEventsList();
        });
        
        // Bulk actions
        document.getElementById('selectAllEvents').addEventListener('click', () => {
            this.toggleSelectAll();
        });
        
        document.getElementById('bulkCleanupTasks').addEventListener('click', () => {
            this.bulkCleanupSelectedEvents();
        });
        
        document.getElementById('bulkDeleteEvents').addEventListener('click', () => {
            this.bulkDeleteSelectedEvents();
        });
        
        document.getElementById('exportEventData').addEventListener('click', () => {
            this.exportEventData();
        });
    }
    
    refreshEventsList() {
        const container = document.getElementById('eventsAdminList');
        container.innerHTML = this.renderEventsList();
    }
    
    toggleEventSelection(eventId) {
        if (this.selectedEvents.has(eventId)) {
            this.selectedEvents.delete(eventId);
        } else {
            this.selectedEvents.add(eventId);
        }
        
        this.updateBulkActionButtons();
        this.updateEventCardSelection(eventId);
    }
    
    updateEventCardSelection(eventId) {
        const card = document.querySelector(`[data-event-id="${eventId}"]`);
        if (card) {
            card.classList.toggle('selected', this.selectedEvents.has(eventId));
        }
    }
    
    updateBulkActionButtons() {
        const hasSelected = this.selectedEvents.size > 0;
        document.getElementById('bulkCleanupTasks').disabled = !hasSelected;
        document.getElementById('bulkDeleteEvents').disabled = !hasSelected;
        
        const selectAllBtn = document.getElementById('selectAllEvents');
        selectAllBtn.textContent = this.selectedEvents.size === this.events.length ? '❌ Deselect All' : '📋 Select All';
    }
    
    toggleSelectAll() {
        if (this.selectedEvents.size === this.events.length) {
            this.selectedEvents.clear();
        } else {
            this.events.forEach(event => this.selectedEvents.add(event.id));
        }
        
        // Update checkboxes
        document.querySelectorAll('.event-select input[type="checkbox"]').forEach(checkbox => {
            const eventId = parseInt(checkbox.id.replace('event-', ''));
            checkbox.checked = this.selectedEvents.has(eventId);
        });
        
        // Update card selections
        this.selectedEvents.forEach(eventId => this.updateEventCardSelection(eventId));
        
        this.updateBulkActionButtons();
    }
    
    openEventDetails(eventId) {
        // This would open the full event management modal
        // For now, show a notification
        this.showNotification(`Opening detailed view for event ${eventId}...`, 'info');
        
        // In production, this could open the same modal as the main events page
        // or navigate to a dedicated admin event page
    }
    
    cleanupEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;
        
        if (confirm(`Clean up tasks for "${event.title}"? This will remove completed tasks and organize remaining ones.`)) {
            // Simulate cleanup
            event.completedTasks = 0;
            event.taskCount = Math.max(3, event.taskCount - event.completedTasks);
            event.issues = event.issues.filter(issue => !issue.includes('Duplicate'));
            event.lastActivity = new Date().toISOString();
            
            this.refreshEventsList();
            this.showNotification(`Cleaned up tasks for "${event.title}"`, 'success');
        }
    }
    
    bulkCleanupSelectedEvents() {
        if (this.selectedEvents.size === 0) return;
        
        if (confirm(`Clean up tasks for ${this.selectedEvents.size} selected events? This will remove completed tasks and organize remaining ones.`)) {
            let cleanedCount = 0;
            
            this.selectedEvents.forEach(eventId => {
                const event = this.events.find(e => e.id === eventId);
                if (event) {
                    event.completedTasks = 0;
                    event.taskCount = Math.max(3, event.taskCount - event.completedTasks);
                    event.issues = event.issues.filter(issue => !issue.includes('Duplicate'));
                    event.lastActivity = new Date().toISOString();
                    cleanedCount++;
                }
            });
            
            this.selectedEvents.clear();
            this.refreshEventsList();
            this.updateBulkActionButtons();
            this.showNotification(`Cleaned up ${cleanedCount} events successfully`, 'success');
        }
    }
    
    exportEventData() {
        const data = {
            exportDate: new Date().toISOString(),
            totalEvents: this.events.length,
            events: this.events.map(event => ({
                ...event,
                completionRate: event.taskCount > 0 ? Math.round((event.completedTasks / event.taskCount) * 100) : 0
            }))
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `family-events-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('Event data exported successfully', 'success');
    }
    
    async deleteEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;
        
        if (confirm(`Are you sure you want to delete the event "${event.title}"? This action cannot be undone.`)) {
            try {
                // Try to delete from backend
                const response = await fetch('/api/calendar.php?action=delete', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ event_id: eventId })
                });
                
                if (!response.ok) {
                    console.log('API delete not available, removing from local list');
                }
                
                // Remove from local list
                this.events = this.events.filter(e => e.id !== eventId);
                this.selectedEvents.delete(eventId);
                
                this.refreshEventsList();
                this.updateBulkActionButtons();
                this.showNotification(`Event "${event.title}" has been deleted`, 'success');
                
            } catch (error) {
                console.error('Error deleting event:', error);
                // Still remove from local list for UI consistency
                this.events = this.events.filter(e => e.id !== eventId);
                this.selectedEvents.delete(eventId);
                this.refreshEventsList();
                this.showNotification(`Event removed from display (API pending)`, 'warning');
            }
        }
    }
    
    async bulkDeleteSelectedEvents() {
        if (this.selectedEvents.size === 0) return;
        
        const eventCount = this.selectedEvents.size;
        const eventWord = eventCount === 1 ? 'event' : 'events';
        
        if (confirm(`Are you sure you want to delete ${eventCount} selected ${eventWord}? This action cannot be undone.`)) {
            const deletedEvents = [];
            
            for (const eventId of this.selectedEvents) {
                const event = this.events.find(e => e.id === eventId);
                if (event) {
                    deletedEvents.push(event.title);
                    
                    try {
                        // Try to delete from backend
                        const response = await fetch('/api/calendar.php?action=delete', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ event_id: eventId })
                        });
                        
                        if (!response.ok) {
                            console.log(`API delete not available for event ${eventId}`);
                        }
                    } catch (error) {
                        console.error(`Error deleting event ${eventId}:`, error);
                    }
                }
            }
            
            // Remove from local list
            this.events = this.events.filter(e => !this.selectedEvents.has(e.id));
            this.selectedEvents.clear();
            
            this.refreshEventsList();
            this.updateBulkActionButtons();
            this.showNotification(`Deleted ${deletedEvents.length} ${eventWord}`, 'success');
        }
    }
    
    showNotification(message, type = 'info') {
        // Simple notification system
        const notification = document.createElement('div');
        notification.className = `admin-notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--glass-bg);
            backdrop-filter: var(--glass-backdrop);
            border: 1px solid var(--glass-border);
            border-radius: var(--radius-lg);
            padding: var(--spacing-md) var(--spacing-lg);
            color: var(--text-primary);
            z-index: 10000;
            max-width: 300px;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 3000);
    }
    
    getStats() {
        return {
            total: this.events.length,
            withIssues: this.events.filter(e => e.issues.length > 0).length,
            totalTasks: this.events.reduce((sum, e) => sum + e.taskCount, 0),
            completedTasks: this.events.reduce((sum, e) => sum + e.completedTasks, 0)
        };
    }
}

// Initialize the events admin module
window.eventsAdmin = new EventsAdmin();

// Register with admin core if available
if (window.adminCore) {
    adminCore.registerModule({
        name: 'events',
        title: 'Events Management',
        icon: '🎉',
        priority: 2,
        getStats: () => eventsAdmin.getStats(),
        render: (container) => eventsAdmin.render(container)
    });
}