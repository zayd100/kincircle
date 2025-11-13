// Family Events - Where Coordination Meets Magic
// The impossible event management system

class FamilyEventsManager {
    constructor() {
        this.events = [];
        this.filteredEvents = [];
        this.currentView = 'list';
        this.currentFilter = {
            type: '',
            time: 'upcoming',
            committed: false,
            tasks: false
        };
        this.currentPage = 1;
        this.eventsPerPage = 10;
        this.currentUser = this.getCurrentUser();
        this.currentEventTasks = null;
        this.draggedTask = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadEvents();
        this.updateStats();
        
        // Beautiful entrance animation
        setTimeout(() => {
            this.showEventsContainer();
        }, 1000);
    }
    
    getCurrentUser() {
        // In production, get from session/localStorage
        return {
            id: 1,
            name: 'Sarah Reed',
            email: 'sarah@reedweaver.family',
            isAdmin: true,
            isModerator: true,
            initials: 'SR'
        };
    }
    
    setupEventListeners() {
        // Action bar controls
        document.getElementById('addEventBtn').addEventListener('click', () => this.openAddEventModal());
        
        // Settings button
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                if (window.unifiedModal) {
                    window.unifiedModal.open('settingsModal');
                } else {
                    console.error('Settings modal: Unified modal system not available');
                }
            });
        }
        document.getElementById('filterBtn').addEventListener('click', () => this.toggleFilterPanel());
        
        // View toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchView(e.target.dataset.view));
        });
        
        // Quick filter buttons
        document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove active from all filter buttons
                document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
                // Add active to clicked button
                e.target.closest('.filter-btn').classList.add('active');
                
                // Set filter based on data-filter attribute
                const filterType = e.target.closest('.filter-btn').dataset.filter;
                this.setQuickFilter(filterType);
            });
        });
        
        // Filter controls
        document.getElementById('typeFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('timeFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('committedFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('tasksFilter').addEventListener('change', () => this.applyFilters());
        
        // Modal controls
        document.getElementById('closeTaskModal').addEventListener('click', () => this.closeTaskModal());
        document.getElementById('closeAddModal').addEventListener('click', () => this.closeAddEventModal());
        document.getElementById('cancelAddEvent').addEventListener('click', () => this.closeAddEventModal());
        
        // Add event form
        document.getElementById('addEventForm').addEventListener('submit', (e) => this.handleAddEvent(e));
        
        // LEGACY EVENT HANDLERS REMOVED - UNIFIED MODAL SYSTEM HANDLES ALL EVENTS
        // (Click outside, ESC key, close buttons all handled by unified-modal.js)
        
        // Keep only non-modal keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'n' && e.ctrlKey) {
                e.preventDefault();
                this.openAddEventModal();
            }
        });
    }
    
    async loadEvents() {
        // Load events from API (all approved events)
        try {
            const response = await fetch('/api/calendar.php?action=getEvents');
            const result = await response.json();
            
            if (result.success) {
                this.events = result.events.map(event => this.enrichEventData(event));
            } else {
                this.events = [];
            }
        } catch (error) {
            console.error('Error loading events:', error);
            // Fallback to PHP data if available
            if (window.eventsData && window.eventsData.events) {
                this.events = window.eventsData.events.map(event => this.enrichEventData(event));
            } else {
                this.events = [];
            }
        }
        
        this.applyFilters();
    }
    
    async loadEventsFromServer() {
        try {
            // Load all approved events from API
            const response = await fetch('/api/calendar.php?action=getEvents');
            const result = await response.json();
            
            if (result.success) {
                this.events = result.events.map(event => this.enrichEventData(event));
                this.applyFilters();
            }
        } catch (error) {
            console.error('Error loading events from server:', error);
        }
    }
    
    enrichEventData(event) {
        // Use real data from PHP/database
        return {
            ...event,
            committed: window.eventsData?.userCommitments?.includes(event.id) || false,
            attendees: [], // Would be populated from database
            taskCount: 0, // Would be populated from database
            tasks: [] // Would be populated from database
        };
    }
    
    generateMockEvents() {
        const eventTypes = {
            birthday: { emoji: '🎂', color: '#f59e0b' },
            anniversary: { emoji: '💍', color: '#ec4899' },
            reunion: { emoji: '👨‍👩‍👧‍👦', color: '#6366f1' },
            holiday: { emoji: '🎄', color: '#10b981' },
            gathering: { emoji: '🎉', color: '#f97316' },
            other: { emoji: '📌', color: '#06b6d4' }
        };
        
        const events = [];
        const today = new Date();
        
        // Generate events for the next year
        for (let i = -30; i < 365; i++) {
            if (Math.random() > 0.92) { // ~8% chance per day
                const eventDate = new Date(today);
                eventDate.setDate(today.getDate() + i);
                
                const types = Object.keys(eventTypes);
                const type = types[Math.floor(Math.random() * types.length)];
                
                const event = {
                    id: events.length + 1,
                    title: this.generateEventTitle(type),
                    event_date: eventDate.toISOString().split('T')[0],
                    description: this.generateEventDescription(type),
                    event_type: type,
                    created_by: 1,
                    location: this.generateLocation(),
                    committed: Math.random() > 0.6,
                    attendees: this.generateMockAttendees(),
                    taskCount: Math.floor(Math.random() * 20),
                    tasks: this.generateMockTasks(events.length + 1)
                };
                
                events.push(event);
            }
        }
        
        return events.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
    }
    
    generateEventTitle(type) {
        const titles = {
            birthday: ['Sarah\'s Birthday', 'Uncle Mike\'s 50th', 'Grandma\'s 85th', 'Tommy\'s Sweet 16'],
            anniversary: ['Mom & Dad\'s Anniversary', 'Golden Anniversary', 'Wedding Anniversary'],
            reunion: ['Annual Family Reunion', 'Reed Family Gathering', 'Summer Reunion'],
            holiday: ['Christmas Dinner', 'Thanksgiving', 'Easter Brunch', 'New Year\'s Party'],
            gathering: ['Summer BBQ', 'Game Night', 'Movie Night', 'Potluck Dinner'],
            other: ['Graduation Party', 'Housewarming', 'Book Club', 'Charity Event']
        };
        
        const typeList = titles[type] || titles.other;
        return typeList[Math.floor(Math.random() * typeList.length)];
    }
    
    generateEventDescription(type) {
        const descriptions = {
            birthday: 'Join us for a birthday celebration with family and friends!',
            anniversary: 'Celebrating another year of love and family.',
            reunion: 'Our annual family gathering with food, games, and memories.',
            holiday: 'Traditional holiday celebration with the whole family.',
            gathering: 'Casual family get-together for food and fun.',
            other: 'Special family event - more details to follow!'
        };
        
        return descriptions[type] || descriptions.other;
    }
    
    generateLocation() {
        const locations = [
            'Reed Family Home',
            'Weaver Residence',
            'Community Center',
            'Local Park',
            'Uncle Mike\'s Backyard',
            'Grandma\'s House',
            'Church Hall',
            'Beach House'
        ];
        
        return locations[Math.floor(Math.random() * locations.length)];
    }
    
    generateMockAttendees() {
        const familyMembers = [
            { name: 'Sarah Reed', initials: 'SR' },
            { name: 'Mike Weaver', initials: 'MW' },
            { name: 'Jenny Smith', initials: 'JS' },
            { name: 'Tom Reed', initials: 'TR' },
            { name: 'Lisa Johnson', initials: 'LJ' },
            { name: 'Dave Wilson', initials: 'DW' }
        ];
        
        const count = Math.floor(Math.random() * 6) + 2;
        const shuffled = [...familyMembers].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }
    
    generateMockTasks(eventId) {
        const taskTemplates = [
            { title: 'Book venue', priority: 'high', status: 'todo' },
            { title: 'Send invitations', priority: 'high', status: 'todo' },
            { title: 'Plan menu', priority: 'medium', status: 'in-progress' },
            { title: 'Buy decorations', priority: 'medium', status: 'todo' },
            { title: 'Order cake', priority: 'high', status: 'todo' },
            { title: 'Set up tables', priority: 'low', status: 'todo' },
            { title: 'Prepare playlist', priority: 'low', status: 'in-progress' },
            { title: 'Coordinate rides', priority: 'medium', status: 'todo' },
            { title: 'Buy gifts', priority: 'medium', status: 'done' },
            { title: 'Clean house', priority: 'low', status: 'todo' }
        ];
        
        const count = Math.floor(Math.random() * 8) + 2;
        const shuffled = [...taskTemplates].sort(() => 0.5 - Math.random());
        
        return shuffled.slice(0, count).map((task, index) => ({
            id: `${eventId}-${index}`,
            title: task.title,
            description: '',
            priority: task.priority,
            status: task.status,
            assignedTo: Math.random() > 0.5 ? this.currentUser.id : Math.floor(Math.random() * 5) + 1,
            dueDate: this.getRandomFutureDate(),
            createdAt: new Date().toISOString()
        }));
    }
    
    getRandomFutureDate() {
        const days = Math.floor(Math.random() * 30) + 1;
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    }
    
    setQuickFilter(filterType) {
        // Reset all filters to defaults
        this.currentFilter = {
            type: '',
            time: 'upcoming',
            committed: false,
            tasks: false
        };
        
        // Set the specific filter based on button clicked
        switch (filterType) {
            case 'all':
                this.currentFilter.time = 'all';
                break;
            case 'thisMonth':
                this.currentFilter.time = 'thismonth';
                break;
            case 'attending':
                this.currentFilter.committed = true;
                this.currentFilter.time = 'upcoming';
                break;
        }
        
        // Update the dropdown filters to match
        document.getElementById('timeFilter').value = this.currentFilter.time;
        document.getElementById('committedFilter').checked = this.currentFilter.committed;
        
        this.applyFilters();
    }
    
    applyFilters() {
        let filtered = [...this.events];
        
        // Type filter
        if (this.currentFilter.type) {
            filtered = filtered.filter(event => event.event_type === this.currentFilter.type);
        }
        
        // Time filter
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        switch (this.currentFilter.time) {
            case 'upcoming':
                filtered = filtered.filter(event => new Date(event.event_date) >= today);
                break;
            case 'thisweek':
                const nextWeek = new Date(today);
                nextWeek.setDate(today.getDate() + 7);
                filtered = filtered.filter(event => {
                    const eventDate = new Date(event.event_date);
                    return eventDate >= today && eventDate <= nextWeek;
                });
                break;
            case 'thismonth':
                const nextMonth = new Date(today);
                nextMonth.setMonth(today.getMonth() + 1);
                filtered = filtered.filter(event => {
                    const eventDate = new Date(event.event_date);
                    return eventDate >= today && eventDate <= nextMonth;
                });
                break;
            case 'thisyear':
                const nextYear = new Date(today);
                nextYear.setFullYear(today.getFullYear() + 1);
                filtered = filtered.filter(event => {
                    const eventDate = new Date(event.event_date);
                    return eventDate >= today && eventDate <= nextYear;
                });
                break;
        }
        
        // Committed filter
        if (this.currentFilter.committed) {
            filtered = filtered.filter(event => event.committed);
        }
        
        // Tasks filter
        if (this.currentFilter.tasks) {
            filtered = filtered.filter(event => 
                event.tasks && event.tasks.some(task => task.assignedTo === this.currentUser.id)
            );
        }
        
        this.filteredEvents = filtered;
        this.currentPage = 1;
        this.renderEvents();
        this.updateStats();
    }
    
    updateStats() {
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const upcomingCount = this.events.filter(event => 
            new Date(event.event_date) >= now
        ).length;
        
        const thisMonthCount = this.events.filter(event => {
            const eventDate = new Date(event.event_date);
            return eventDate.getMonth() === now.getMonth() && 
                   eventDate.getFullYear() === now.getFullYear();
        }).length;
        
        const committedCount = this.events.filter(event => event.committed).length;
        
        const tasksCount = this.events.reduce((total, event) => {
            if (!event.tasks) return total;
            return total + event.tasks.filter(task => 
                task.assignedTo === this.currentUser.id && task.status !== 'done'
            ).length;
        }, 0);
        
        document.getElementById('upcomingCount').textContent = upcomingCount;
        document.getElementById('thisMonthCount').textContent = thisMonthCount;
        document.getElementById('committedCount').textContent = committedCount;
        document.getElementById('tasksCount').textContent = tasksCount;
    }
    
    renderEvents() {
        const container = document.getElementById('eventsContainer');
        
        if (this.currentView === 'list') {
            this.renderEventsList(container);
        } else {
            this.renderEventsTimeline(container);
        }
        
        this.renderPagination();
    }
    
    renderEventsList(container) {
        const startIndex = (this.currentPage - 1) * this.eventsPerPage;
        const endIndex = startIndex + this.eventsPerPage;
        const pageEvents = this.filteredEvents.slice(startIndex, endIndex);
        
        if (pageEvents.length === 0) {
            container.innerHTML = `
                <div class="events-empty">
                    <div class="empty-icon">📅</div>
                    <h3>No events found</h3>
                    <p>Try adjusting your filters or add a new event to get started.</p>
                </div>
            `;
            return;
        }
        
        // Group events by date
        const groupedEvents = this.groupEventsByDate(pageEvents);
        
        let html = '';
        
        for (const [dateStr, events] of Object.entries(groupedEvents)) {
            const date = new Date(dateStr);
            const relativeDate = this.getRelativeDate(date);
            
            html += `
                <div class="event-group">
                    <div class="event-date-header">
                        <div class="date-badge">${this.formatDateShort(date)}</div>
                        <div class="date-info">
                            <div class="date-full">${this.formatDateFull(date)}</div>
                            <div class="date-relative">${relativeDate}</div>
                        </div>
                    </div>
                    <div class="events-list">
                        ${events.map(event => this.renderEventCard(event)).join('')}
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
        
        // Add event listeners
        this.attachEventListeners();
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
        
        const attendeesHtml = event.attendees.slice(0, 4).map(attendee => `
            <div class="attendee-avatar" title="${attendee.name}">
                ${attendee.initials}
            </div>
        `).join('');
        
        const moreAttendees = event.attendees.length > 4 ? 
            `<span class="attendee-count">+${event.attendees.length - 4} more</span>` : '';
        
        return `
            <div class="event-card ${event.committed ? 'committed' : ''}" data-event-id="${event.id}">
                <div class="event-header">
                    <div class="event-title-section">
                        <h3 class="event-title">
                            <span class="event-type-emoji">${eventTypeEmojis[event.event_type] || '📌'}</span>
                            ${event.title}
                        </h3>
                        <div class="event-meta">
                            <div class="event-meta-item">
                                <span>📍</span> ${event.location || 'Location TBD'}
                            </div>
                            <div class="event-meta-item">
                                <span>👥</span> ${event.attendees.length} attending
                            </div>
                        </div>
                    </div>
                    <div class="event-actions">
                        <button class="event-btn ${event.committed ? 'committed' : 'primary'}" 
                                onclick="familyEvents.toggleCommitment(${event.id})">
                            ${event.committed ? '✓ Attending' : '💖 Attend'}
                        </button>
                        <button class="event-btn" onclick="familyEvents.openTaskModal(${event.id})">
                            📋 Tasks
                            ${event.taskCount > 0 ? `<span class="task-count">${event.taskCount}</span>` : ''}
                        </button>
                        ${this.canEditEvent(event) ? `
                            <button class="event-btn edit-btn" onclick="familyEvents.openEditEventModal(${event.id})" title="Edit Event">
                                ✏️ Edit
                            </button>
                        ` : ''}
                    </div>
                </div>
                
                ${event.description ? `<p class="event-description">${event.description}</p>` : ''}
                
                <div class="event-attendees">
                    <div class="attendee-avatars">
                        ${attendeesHtml}
                    </div>
                    ${moreAttendees}
                </div>
            </div>
        `;
    }
    
    groupEventsByDate(events) {
        const grouped = {};
        
        events.forEach(event => {
            const dateStr = event.event_date;
            if (!grouped[dateStr]) {
                grouped[dateStr] = [];
            }
            grouped[dateStr].push(event);
        });
        
        return grouped;
    }
    
    formatDateShort(date) {
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
        });
    }
    
    formatDateFull(date) {
        return date.toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long', 
            day: 'numeric' 
        });
    }
    
    getRelativeDate(date) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const eventDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        
        const diffTime = eventDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays === -1) return 'Yesterday';
        if (diffDays > 0) return `In ${diffDays} days`;
        return `${Math.abs(diffDays)} days ago`;
    }
    
    attachEventListeners() {
        // Already handled in onclick attributes for simplicity
        // In production, would use proper event delegation
    }
    
    toggleCommitment(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (event) {
            event.committed = !event.committed;
            
            // Update in filtered events too
            const filteredEvent = this.filteredEvents.find(e => e.id === eventId);
            if (filteredEvent) {
                filteredEvent.committed = event.committed;
            }
            
            // Update UI
            this.renderEvents();
            this.updateStats();
            
            // Send to server (mock for now)
            this.updateEventCommitment(eventId, event.committed);
        }
    }
    
    canEditEvent(event) {
        // Users can edit events if they are:
        // 1. The creator of the event
        // 2. An admin/moderator
        return this.currentUser.isAdmin || 
               this.currentUser.isModerator || 
               event.createdBy === this.currentUser.id ||
               event.created_by === this.currentUser.id;
    }
    
    async updateEventCommitment(eventId, committed) {
        try {
            const response = await fetch('/api/calendar.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'updateCommitment',
                    eventId: eventId,
                    userId: this.currentUser.id,
                    committed: committed
                })
            });
            
            const result = await response.json();
            if (!result.success) {
                console.error('Failed to update commitment:', result.error);
            }
        } catch (error) {
            console.log('Mock commitment update for event:', eventId, 'committed:', committed);
        }
    }
    
    openTaskModal(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;
        
        this.currentEventTasks = event;
        document.getElementById('taskModalTitle').textContent = `${event.title} - Tasks`;
        
        this.renderTaskModal();
        // USE UNIVERSAL QUEUE SYSTEM - NO MORE RACE CONDITIONS
        window.queuedModal.open('taskModal');
        
        // Animate modal entrance
        const modal = document.querySelector('.task-modal');
        modal.style.transform = 'scale(0.8)';
        modal.style.opacity = '0';
        
        setTimeout(() => {
            modal.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            modal.style.transform = 'scale(1)';
            modal.style.opacity = '1';
        }, 10);
    }
    
    renderTaskModal() {
        const modalBody = document.querySelector('.task-modal-body');
        
        if (!this.currentEventTasks.tasks || this.currentEventTasks.tasks.length === 0) {
            modalBody.innerHTML = `
                <div class="task-empty">
                    <div class="empty-icon">📋</div>
                    <h3>No tasks yet</h3>
                    <p>Start organizing this event by adding some tasks!</p>
                    <button class="btn btn-primary" onclick="familyEvents.addTask('todo')">
                        Add First Task
                    </button>
                </div>
            `;
            return;
        }
        
        // Group tasks by status
        const taskGroups = {
            'todo': this.currentEventTasks.tasks.filter(t => t.status === 'todo'),
            'in-progress': this.currentEventTasks.tasks.filter(t => t.status === 'in-progress'),
            'done': this.currentEventTasks.tasks.filter(t => t.status === 'done')
        };
        
        modalBody.innerHTML = `
            <div class="kanban-container">
                <div class="kanban-header">
                    <div class="board-selector">
                        <div class="board-tab active">Main Board</div>
                        <div class="board-tab">Planning</div>
                        <div class="board-tab">Day Of</div>
                    </div>
                    <div class="kanban-actions">
                        <button class="btn btn-secondary" onclick="familyEvents.addTaskBoard()">
                            ➕ Add Board
                        </button>
                        <button class="btn btn-primary" onclick="familyEvents.addTask('todo')">
                            ➕ Add Task
                        </button>
                        ${this.currentUser.isAdmin || this.currentUser.isModerator ? `
                            <button class="btn btn-admin" onclick="familyEvents.openTaskCleanupModal()">
                                🧹 Cleanup Tasks
                            </button>
                            <button class="btn btn-admin" onclick="familyEvents.toggleAdminMode()">
                                👁️ Admin View
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div class="kanban-board">
                    ${this.renderKanbanColumn('todo', 'To Do', taskGroups.todo, '📝')}
                    ${this.renderKanbanColumn('in-progress', 'In Progress', taskGroups['in-progress'], '⚡')}
                    ${this.renderKanbanColumn('done', 'Done', taskGroups.done, '✅')}
                </div>
            </div>
        `;
        
        this.setupDragAndDrop();
    }
    
    renderKanbanColumn(status, title, tasks, emoji) {
        return `
            <div class="kanban-column" data-status="${status}">
                <div class="column-header">
                    <div class="column-title">
                        <span>${emoji}</span> ${title}
                    </div>
                    <div class="column-count">${tasks.length}</div>
                </div>
                <div class="column-tasks" ondrop="familyEvents.dropTask(event)" ondragover="familyEvents.allowDrop(event)">
                    ${tasks.map(task => this.renderTaskCard(task)).join('')}
                </div>
                <div class="add-task-form">
                    <input type="text" 
                           class="quick-add-input" 
                           placeholder="Add a task..." 
                           onkeypress="if(event.key==='Enter') familyEvents.quickAddTask('${status}', this.value); this.value='';">
                </div>
            </div>
        `;
    }
    
    renderTaskCard(task) {
        const priorityColors = {
            high: '#ef4444',
            medium: '#f59e0b',
            low: '#10b981'
        };
        
        const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'done';
        const isAdminMode = this.adminModeEnabled || false;
        
        return `
            <div class="task-card ${isAdminMode ? 'admin-mode' : ''}" 
                 draggable="true" 
                 data-task-id="${task.id}"
                 ondragstart="familyEvents.dragTask(event)">
                <div class="task-header">
                    <div class="task-title" ${isAdminMode ? `contenteditable="true" onblur="familyEvents.updateTaskTitle('${task.id}', this.textContent)"` : ''}>${task.title}</div>
                    <div class="task-controls">
                        <div class="task-priority" style="background: ${priorityColors[task.priority]}"></div>
                        ${isAdminMode ? `
                            <button class="task-action-btn" onclick="familyEvents.editTaskDetails('${task.id}')" title="Edit Task">
                                ✏️
                            </button>
                            <button class="task-action-btn delete-btn" onclick="familyEvents.deleteTask('${task.id}')" title="Delete Task">
                                🗑️
                            </button>
                        ` : ''}
                    </div>
                </div>
                ${task.description ? `<div class="task-description" ${isAdminMode ? `contenteditable="true" onblur="familyEvents.updateTaskDescription('${task.id}', this.textContent)"` : ''}>${task.description}</div>` : ''}
                <div class="task-meta">
                    <div class="task-assignee">
                        <div class="assignee-avatar">SR</div>
                        <span>Sarah</span>
                    </div>
                    <div class="task-due ${isOverdue ? 'overdue' : ''}">
                        ${this.formatTaskDate(task.dueDate)}
                    </div>
                </div>
                ${isAdminMode ? `
                    <div class="task-admin-info">
                        <small>Created: ${new Date(task.createdAt).toLocaleDateString()}</small>
                        ${task.lastModified ? `<small>Modified: ${new Date(task.lastModified).toLocaleDateString()}</small>` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    formatTaskDate(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays === -1) return 'Yesterday';
        if (diffDays > 0) return `${diffDays}d`;
        return `${Math.abs(diffDays)}d ago`;
    }
    
    setupDragAndDrop() {
        // Drag and drop functionality for tasks
    }
    
    dragTask(event) {
        this.draggedTask = event.target.dataset.taskId;
        event.target.classList.add('dragging');
    }
    
    allowDrop(event) {
        event.preventDefault();
        event.currentTarget.classList.add('drag-over');
    }
    
    dropTask(event) {
        event.preventDefault();
        event.currentTarget.classList.remove('drag-over');
        
        const newStatus = event.currentTarget.closest('.kanban-column').dataset.status;
        const taskId = this.draggedTask;
        
        if (taskId && newStatus) {
            this.updateTaskStatus(taskId, newStatus);
        }
        
        // Clean up
        document.querySelectorAll('.task-card').forEach(card => {
            card.classList.remove('dragging');
        });
        this.draggedTask = null;
    }
    
    updateTaskStatus(taskId, newStatus) {
        const task = this.currentEventTasks.tasks.find(t => t.id === taskId);
        if (task) {
            task.status = newStatus;
            this.renderTaskModal();
            
            // Update server (mock for now)
            console.log('Updated task status:', taskId, 'to', newStatus);
        }
    }
    
    quickAddTask(status, title) {
        if (!title.trim()) return;
        
        const newTask = {
            id: Date.now().toString(),
            title: title.trim(),
            description: '',
            priority: 'medium',
            status: status,
            assignedTo: this.currentUser.id,
            dueDate: this.getRandomFutureDate(),
            createdAt: new Date().toISOString()
        };
        
        this.currentEventTasks.tasks.push(newTask);
        this.currentEventTasks.taskCount = this.currentEventTasks.tasks.length;
        
        this.renderTaskModal();
        this.renderEvents(); // Update main view
    }
    
    // Modal management
    closeTaskModal() {
        // USE UNIVERSAL QUEUE SYSTEM - NO MORE RACE CONDITIONS
        window.queuedModal.close('taskModal');
        this.currentEventTasks = null;
    }
    
    closeAddEventModal() {
        // USE UNIVERSAL QUEUE SYSTEM - NO MORE RACE CONDITIONS
        window.queuedModal.close('addEventModal');
    }
    
    closeAllModals() {
        // USE UNIVERSAL QUEUE SYSTEM - NO MORE RACE CONDITIONS
        window.queuedModal.closeAll();
    }
    
    // Filter and view controls
    toggleFilterPanel() {
        const panel = document.getElementById('filterPanel');
        panel.classList.toggle('active');
    }
    
    switchView(view) {
        this.currentView = view;
        
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        
        this.renderEvents();
    }
    
    showEventsContainer() {
        const loading = document.querySelector('.events-loading');
        const container = document.getElementById('eventsContainer');
        
        if (loading) {
            loading.style.display = 'none';
        }
        
        container.style.opacity = '0';
        container.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            container.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';
        }, 100);
    }
    
    renderEventsTimeline(container) {
        // Placeholder timeline view until full implementation
        container.innerHTML = `
            <div class="timeline-container">
                <div class="timeline-header">
                    <h2>Timeline View</h2>
                    <p>Visual timeline coming soon! For now, here's a list of upcoming events:</p>
                </div>
                <div class="timeline-events">
                    ${this.filteredEvents.slice(0, 10).map(event => `
                        <div class="timeline-event">
                            <div class="timeline-date">${this.formatDateShort(new Date(event.event_date))}</div>
                            <div class="timeline-content">
                                <h4>${event.title}</h4>
                                <p>${event.location || 'Location TBD'}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
                ${this.filteredEvents.length === 0 ? `
                    <div class="events-empty">
                        <div class="empty-icon">📅</div>
                        <h3>No events in timeline</h3>
                        <p>Add some events to see them here!</p>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    renderPagination() {
        const totalPages = Math.ceil(this.filteredEvents.length / this.eventsPerPage);
        const pagination = document.getElementById('pagination');
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        let html = '';
        
        // Previous button
        html += `
            <button class="page-btn" ${this.currentPage === 1 ? 'disabled' : ''} 
                    onclick="familyEvents.goToPage(${this.currentPage - 1})">
                ← Previous
            </button>
        `;
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                html += `
                    <button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                            onclick="familyEvents.goToPage(${i})">
                        ${i}
                    </button>
                `;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                html += '<span class="page-ellipsis">...</span>';
            }
        }
        
        // Next button
        html += `
            <button class="page-btn" ${this.currentPage === totalPages ? 'disabled' : ''} 
                    onclick="familyEvents.goToPage(${this.currentPage + 1})">
                Next →
            </button>
        `;
        
        pagination.innerHTML = html;
    }
    
    goToPage(page) {
        this.currentPage = page;
        this.renderEvents();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // Add Event Modal Functions
    openAddEventModal() {
        // Use unified modal system
        if (window.unifiedModal) {
            window.unifiedModal.open('addEventModal');
        } else {
            // Fallback to old method
            document.getElementById('addEventModal').style.display = 'flex';
        }
        // Set default date to today
        document.getElementById('eventDate').value = new Date().toISOString().split('T')[0];
    }
    
    async handleAddEvent(e) {
        e.preventDefault();
        
        const eventData = {
            title: document.getElementById('eventTitle').value,
            date: document.getElementById('eventDate').value, // Changed to 'date' to match API
            description: document.getElementById('eventDescription').value
        };
        
        if (!eventData.title || !eventData.date) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        console.log('Adding new event:', eventData);
        
        try {
            // Actually submit to the API
            const response = await fetch('/api/calendar.php?action=add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(eventData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Reload events from server to show the new event
                await this.loadEventsFromServer();
                this.closeAddEventModal();
                
                // Reset form
                e.target.reset();
                
                // Show success message
                this.showNotification('Event added successfully!', 'success');
            } else {
                throw new Error(result.error || 'Failed to add event');
            }
            
        } catch (error) {
            console.error('Error adding event:', error);
            this.showNotification('Error adding event: ' + error.message, 'error');
        }
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: var(--spacing-sm);">
                <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
                <span>${message}</span>
            </div>
        `;
        
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
            animation: slideInRight 0.3s ease-out;
            max-width: 300px;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease-out';
                setTimeout(() => {
                    if (notification.parentNode) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }
        }, 3000);
    }
    
    addTaskBoard() {
        console.log('Adding new task board - placeholder for future implementation');
        this.showNotification('Multiple boards coming soon!', 'info');
    }
    
    addTask(status) {
        const title = prompt('Enter task title:');
        if (title && title.trim()) {
            this.quickAddTask(status, title);
        }
    }
    
    // =============== ADMIN & MODERATOR FUNCTIONS ===============
    
    toggleAdminMode() {
        this.adminModeEnabled = !this.adminModeEnabled;
        this.renderTaskModal();
        
        const button = document.querySelector('[onclick="familyEvents.toggleAdminMode()"]');
        if (button) {
            button.textContent = this.adminModeEnabled ? '👁️ Normal View' : '👁️ Admin View';
            button.classList.toggle('active', this.adminModeEnabled);
        }
        
        this.showNotification(
            this.adminModeEnabled ? 'Admin mode enabled - Tasks are now editable' : 'Admin mode disabled',
            'info'
        );
    }
    
    openEditEventModal(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;
        
        // Create edit modal
        const modal = document.createElement('div');
        modal.className = 'modal-backdrop';
        modal.id = 'editEventModal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>✏️ Edit Event</h2>
                    <button class="modal-close" onclick="familyEvents.closeEditEventModal()">✕</button>
                </div>
                <form id="editEventForm" class="event-form">
                    <div class="form-group">
                        <label for="editEventTitle">Event Title</label>
                        <input type="text" id="editEventTitle" class="form-input" value="${event.title}" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editEventDate">Date</label>
                            <input type="date" id="editEventDate" class="form-input" value="${event.event_date}" required>
                        </div>
                        <div class="form-group">
                            <label for="editEventType">Type</label>
                            <select id="editEventType" class="form-select" required>
                                <option value="birthday" ${event.event_type === 'birthday' ? 'selected' : ''}>🎂 Birthday</option>
                                <option value="anniversary" ${event.event_type === 'anniversary' ? 'selected' : ''}>💍 Anniversary</option>
                                <option value="reunion" ${event.event_type === 'reunion' ? 'selected' : ''}>👨‍👩‍👧‍👦 Reunion</option>
                                <option value="holiday" ${event.event_type === 'holiday' ? 'selected' : ''}>🎄 Holiday</option>
                                <option value="gathering" ${event.event_type === 'gathering' ? 'selected' : ''}>🎉 Gathering</option>
                                <option value="other" ${event.event_type === 'other' ? 'selected' : ''}>📌 Other</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="editEventDescription">Description</label>
                        <textarea id="editEventDescription" class="form-textarea" rows="3">${event.description || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="editEventLocation">Location</label>
                        <input type="text" id="editEventLocation" class="form-input" value="${event.location || ''}">
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="familyEvents.closeEditEventModal()">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Setup form handler
        document.getElementById('editEventForm').addEventListener('submit', (e) => this.handleEditEvent(e, eventId));
        
        // Open modal using unified system
        if (window.unifiedModal) {
            window.unifiedModal.open('editEventModal', {
                focusElement: '#editEventTitle'
            });
        }
    }
    
    closeEditEventModal() {
        if (window.unifiedModal) {
            window.unifiedModal.close('editEventModal');
        }
        const modal = document.getElementById('editEventModal');
        if (modal) {
            modal.remove();
        }
    }
    
    async handleEditEvent(e, eventId) {
        e.preventDefault();
        
        const formData = {
            title: document.getElementById('editEventTitle').value,
            event_date: document.getElementById('editEventDate').value,
            event_type: document.getElementById('editEventType').value,
            description: document.getElementById('editEventDescription').value,
            location: document.getElementById('editEventLocation').value
        };
        
        try {
            // Update event in local array
            const eventIndex = this.events.findIndex(e => e.id === eventId);
            if (eventIndex !== -1) {
                this.events[eventIndex] = {
                    ...this.events[eventIndex],
                    ...formData,
                    lastModified: new Date().toISOString(),
                    modifiedBy: this.currentUser.id
                };
            }
            
            // Send to server (mock for now)
            console.log('Updating event:', eventId, formData);
            
            // Close modal and refresh display
            this.closeEditEventModal();
            this.renderEvents();
            this.showNotification('Event updated successfully!', 'success');
            
        } catch (error) {
            console.error('Error updating event:', error);
            this.showNotification('Failed to update event. Please try again.', 'error');
        }
    }
    
    // Event admin modal removed - use admin panel instead
    
    updateTaskTitle(taskId, newTitle) {
        if (!this.currentEventTasks) return;
        
        const task = this.currentEventTasks.tasks.find(t => t.id === taskId);
        if (task && newTitle.trim() !== task.title) {
            task.title = newTitle.trim();
            task.lastModified = new Date().toISOString();
            this.showNotification('Task title updated', 'success');
        }
    }
    
    updateTaskDescription(taskId, newDescription) {
        if (!this.currentEventTasks) return;
        
        const task = this.currentEventTasks.tasks.find(t => t.id === taskId);
        if (task) {
            task.description = newDescription.trim();
            task.lastModified = new Date().toISOString();
            this.showNotification('Task description updated', 'success');
        }
    }
    
    editTaskDetails(taskId) {
        const task = this.currentEventTasks.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        const modal = document.createElement('div');
        modal.className = 'modal-backdrop task-edit-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>✏️ Edit Task</h2>
                    <button class="modal-close" onclick="this.closest('.modal-backdrop').remove()">✕</button>
                </div>
                <form onsubmit="familyEvents.saveTaskChanges('${taskId}', event)">
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Title</label>
                            <input type="text" id="editTaskTitle" value="${task.title}" class="form-input" required>
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <textarea id="editTaskDescription" class="form-textarea" rows="3">${task.description || ''}</textarea>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Priority</label>
                                <select id="editTaskPriority" class="form-select">
                                    <option value="low" ${task.priority === 'low' ? 'selected' : ''}>🟢 Low</option>
                                    <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>🟡 Medium</option>
                                    <option value="high" ${task.priority === 'high' ? 'selected' : ''}>🔴 High</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Due Date</label>
                                <input type="date" id="editTaskDueDate" value="${task.dueDate}" class="form-input">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Status</label>
                            <select id="editTaskStatus" class="form-select">
                                <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>📝 To Do</option>
                                <option value="in-progress" ${task.status === 'in-progress' ? 'selected' : ''}>⚡ In Progress</option>
                                <option value="done" ${task.status === 'done' ? 'selected' : ''}>✅ Done</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-backdrop').remove()">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    saveTaskChanges(taskId, event) {
        event.preventDefault();
        
        const task = this.currentEventTasks.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        task.title = document.getElementById('editTaskTitle').value;
        task.description = document.getElementById('editTaskDescription').value;
        task.priority = document.getElementById('editTaskPriority').value;
        task.dueDate = document.getElementById('editTaskDueDate').value;
        task.status = document.getElementById('editTaskStatus').value;
        task.lastModified = new Date().toISOString();
        
        this.renderTaskModal();
        document.querySelector('.task-edit-modal').remove();
        this.showNotification('Task updated successfully', 'success');
    }
    
    deleteTask(taskId) {
        if (!confirm('Are you sure you want to delete this task? This cannot be undone.')) return;
        
        if (!this.currentEventTasks) return;
        
        const taskIndex = this.currentEventTasks.tasks.findIndex(t => t.id === taskId);
        if (taskIndex > -1) {
            this.currentEventTasks.tasks.splice(taskIndex, 1);
            this.currentEventTasks.taskCount = this.currentEventTasks.tasks.length;
            this.renderTaskModal();
            this.renderEvents(); // Update main view
            this.showNotification('Task deleted', 'success');
        }
    }
    
    bulkDeleteTasks(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event || !event.tasks) return;
        
        const completedTasks = event.tasks.filter(t => t.status === 'done');
        if (completedTasks.length === 0) {
            this.showNotification('No completed tasks to clean up', 'info');
            return;
        }
        
        if (!confirm(`Delete ${completedTasks.length} completed tasks? This cannot be undone.`)) return;
        
        event.tasks = event.tasks.filter(t => t.status !== 'done');
        event.taskCount = event.tasks.length;
        
        if (this.currentEventTasks && this.currentEventTasks.id === eventId) {
            this.currentEventTasks.tasks = event.tasks;
            this.renderTaskModal();
        }
        
        this.renderEvents();
        this.showNotification(`${completedTasks.length} completed tasks cleaned up`, 'success');
    }
    
    resetTaskAssignments(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event || !event.tasks) return;
        
        if (!confirm('Reset all task assignments? This will unassign all tasks.')) return;
        
        event.tasks.forEach(task => {
            task.assignedTo = null;
            task.lastModified = new Date().toISOString();
        });
        
        if (this.currentEventTasks && this.currentEventTasks.id === eventId) {
            this.renderTaskModal();
        }
        
        this.showNotification('All task assignments reset', 'success');
    }
    
    duplicateTasksFromTemplate(eventId) {
        const templates = [
            'Send invitations',
            'Book venue',
            'Plan menu',
            'Buy decorations',
            'Set up tables',
            'Prepare music playlist',
            'Coordinate transportation',
            'Take photos',
            'Clean up after event'
        ];
        
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;
        
        if (!confirm(`Add ${templates.length} common event tasks to this event?`)) return;
        
        templates.forEach((taskTitle, index) => {
            const newTask = {
                id: `${eventId}-template-${Date.now()}-${index}`,
                title: taskTitle,
                description: '',
                priority: 'medium',
                status: 'todo',
                assignedTo: null,
                dueDate: this.getRandomFutureDate(),
                createdAt: new Date().toISOString()
            };
            
            event.tasks.push(newTask);
        });
        
        event.taskCount = event.tasks.length;
        
        if (this.currentEventTasks && this.currentEventTasks.id === eventId) {
            this.currentEventTasks.tasks = event.tasks;
            this.renderTaskModal();
        }
        
        this.renderEvents();
        this.showNotification(`${templates.length} template tasks added`, 'success');
    }
    
    deleteAllTasks(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event || !event.tasks) return;
        
        if (!confirm(`Delete ALL ${event.tasks.length} tasks for this event? This cannot be undone!`)) return;
        
        event.tasks = [];
        event.taskCount = 0;
        
        if (this.currentEventTasks && this.currentEventTasks.id === eventId) {
            this.currentEventTasks.tasks = [];
            this.renderTaskModal();
        }
        
        this.renderEvents();
        this.showNotification('All tasks deleted', 'success');
    }
    
    deleteEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;
        
        if (!confirm(`Delete the event "${event.title}"? This will remove the event and all its tasks permanently!`)) return;
        
        const eventIndex = this.events.findIndex(e => e.id === eventId);
        if (eventIndex > -1) {
            this.events.splice(eventIndex, 1);
            this.applyFilters();
            
            // Close any open modals for this event
            document.querySelectorAll('.admin-event-modal').forEach(modal => modal.remove());
            
            this.showNotification('Event deleted', 'success');
        }
    }
    
    saveEventChanges(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;
        
        event.title = document.getElementById('adminEventTitle').value;
        event.event_date = document.getElementById('adminEventDate').value;
        event.event_type = document.getElementById('adminEventType').value;
        event.description = document.getElementById('adminEventDescription').value;
        event.location = document.getElementById('adminEventLocation').value;
        
        this.applyFilters();
        document.querySelector('.admin-event-modal').remove();
        this.showNotification('Event updated successfully', 'success');
    }
    
}

// Initialize the family events manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.familyEvents = new FamilyEventsManager();
});

// Make it available globally
window.FamilyEventsManager = FamilyEventsManager;