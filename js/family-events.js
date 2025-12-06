// Family Events - Clean production version
// No mock data, real API only

class FamilyEventsManager {
    constructor() {
        this.events = [];
        this.filteredEvents = [];
        this.currentView = 'list';
        this.currentFilter = {
            type: '',
            time: 'upcoming',
            committed: false
        };
        this.currentPage = 1;
        this.eventsPerPage = 10;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadEvents();

        // Entrance animation
        setTimeout(() => {
            this.showEventsContainer();
        }, 500);
    }

    // Parse a YYYY-MM-DD date string as LOCAL time (not UTC)
    // This prevents the off-by-one-day bug in western time zones
    parseLocalDate(dateStr) {
        if (!dateStr) return new Date();
        if (dateStr instanceof Date) return dateStr;
        if (dateStr.includes('T') || dateStr.includes(' ')) {
            return new Date(dateStr);
        }
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    }

    getCurrentUser() {
        // Use actual logged-in user from PHP
        if (window.currentUser) {
            return {
                id: window.currentUser.id,
                name: window.currentUser.displayName || 'User',
                isAdmin: window.currentUser.isAdmin || false
            };
        }
        return { id: null, name: 'Guest', isAdmin: false };
    }

    setupEventListeners() {
        // Add event button
        const addEventBtn = document.getElementById('addEventBtn');
        if (addEventBtn) {
            addEventBtn.addEventListener('click', () => this.openAddEventModal());
        }

        // Filter button
        const filterBtn = document.getElementById('filterBtn');
        if (filterBtn) {
            filterBtn.addEventListener('click', () => this.toggleFilterPanel());
        }

        // View toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchView(e.target.dataset.view));
        });

        // Quick filter buttons
        document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
                e.target.closest('.filter-btn').classList.add('active');
                const filterType = e.target.closest('.filter-btn').dataset.filter;
                this.setQuickFilter(filterType);
            });
        });

        // Filter controls
        const typeFilter = document.getElementById('typeFilter');
        const timeFilter = document.getElementById('timeFilter');
        const committedFilter = document.getElementById('committedFilter');

        if (typeFilter) typeFilter.addEventListener('change', () => this.applyFilters());
        if (timeFilter) timeFilter.addEventListener('change', () => this.applyFilters());
        if (committedFilter) committedFilter.addEventListener('change', () => this.applyFilters());

        // Modal controls
        const closeAddModal = document.getElementById('closeAddModal');
        const cancelAddEvent = document.getElementById('cancelAddEvent');
        if (closeAddModal) closeAddModal.addEventListener('click', () => this.closeAddEventModal());
        if (cancelAddEvent) cancelAddEvent.addEventListener('click', () => this.closeAddEventModal());

        // Add event form
        const addEventForm = document.getElementById('addEventForm');
        if (addEventForm) {
            addEventForm.addEventListener('submit', (e) => this.handleAddEvent(e));
        }

        // Keyboard shortcut
        document.addEventListener('keydown', (e) => {
            if (e.key === 'n' && e.ctrlKey) {
                e.preventDefault();
                this.openAddEventModal();
            }
        });
    }

    async loadEvents() {
        try {
            const response = await fetch('/api/calendar.php?action=getEvents');
            const result = await response.json();

            if (result.success) {
                this.events = result.events.map(event => ({
                    ...event,
                    committed: window.eventsData?.userCommitments?.includes(event.id) || false
                }));
            } else {
                this.events = [];
            }
        } catch (error) {
            console.error('Error loading events:', error);
            // Fallback to PHP data if available
            if (window.eventsData && window.eventsData.events) {
                this.events = window.eventsData.events.map(event => ({
                    ...event,
                    committed: window.eventsData?.userCommitments?.includes(event.id) || false
                }));
            } else {
                this.events = [];
            }
        }

        this.applyFilters();
        this.updateStats();
    }

    setQuickFilter(filterType) {
        this.currentFilter = {
            type: '',
            time: 'upcoming',
            committed: false
        };

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

        const timeFilter = document.getElementById('timeFilter');
        const committedFilter = document.getElementById('committedFilter');
        if (timeFilter) timeFilter.value = this.currentFilter.time;
        if (committedFilter) committedFilter.checked = this.currentFilter.committed;

        this.applyFilters();
    }

    applyFilters() {
        let filtered = [...this.events];

        // Type filter
        const typeFilter = document.getElementById('typeFilter');
        if (typeFilter && typeFilter.value) {
            filtered = filtered.filter(event => event.event_type === typeFilter.value);
        }

        // Time filter
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const timeFilter = document.getElementById('timeFilter');
        const timeValue = timeFilter ? timeFilter.value : this.currentFilter.time;

        switch (timeValue) {
            case 'upcoming':
                filtered = filtered.filter(event => this.parseLocalDate(event.event_date) >= today);
                break;
            case 'thisweek':
                const nextWeek = new Date(today);
                nextWeek.setDate(today.getDate() + 7);
                filtered = filtered.filter(event => {
                    const eventDate = this.parseLocalDate(event.event_date);
                    return eventDate >= today && eventDate <= nextWeek;
                });
                break;
            case 'thismonth':
                const nextMonth = new Date(today);
                nextMonth.setMonth(today.getMonth() + 1);
                filtered = filtered.filter(event => {
                    const eventDate = this.parseLocalDate(event.event_date);
                    return eventDate >= today && eventDate <= nextMonth;
                });
                break;
            case 'thisyear':
                const nextYear = new Date(today);
                nextYear.setFullYear(today.getFullYear() + 1);
                filtered = filtered.filter(event => {
                    const eventDate = this.parseLocalDate(event.event_date);
                    return eventDate >= today && eventDate <= nextYear;
                });
                break;
        }

        // Committed filter
        const committedFilter = document.getElementById('committedFilter');
        if (committedFilter && committedFilter.checked) {
            filtered = filtered.filter(event => event.committed);
        }

        // Sort by date
        filtered.sort((a, b) => this.parseLocalDate(a.event_date) - this.parseLocalDate(b.event_date));

        this.filteredEvents = filtered;
        this.currentPage = 1;
        this.renderEvents();
    }

    updateStats() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const upcomingCount = this.events.filter(event =>
            this.parseLocalDate(event.event_date) >= today
        ).length;

        const thisMonthCount = this.events.filter(event => {
            const eventDate = this.parseLocalDate(event.event_date);
            return eventDate.getMonth() === now.getMonth() &&
                   eventDate.getFullYear() === now.getFullYear();
        }).length;

        const committedCount = this.events.filter(event => event.committed).length;

        const upcomingEl = document.getElementById('upcomingCount');
        const thisMonthEl = document.getElementById('thisMonthCount');
        const committedEl = document.getElementById('committedCount');
        const tasksEl = document.getElementById('tasksCount');

        if (upcomingEl) upcomingEl.textContent = upcomingCount;
        if (thisMonthEl) thisMonthEl.textContent = thisMonthCount;
        if (committedEl) committedEl.textContent = committedCount;
        if (tasksEl) tasksEl.textContent = '0'; // Tasks feature not implemented
    }

    renderEvents() {
        const container = document.getElementById('eventsContainer');
        if (!container) return;

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
        const groupedEvents = {};
        pageEvents.forEach(event => {
            const dateStr = event.event_date;
            if (!groupedEvents[dateStr]) {
                groupedEvents[dateStr] = [];
            }
            groupedEvents[dateStr].push(event);
        });

        let html = '';

        for (const [dateStr, events] of Object.entries(groupedEvents)) {
            const date = this.parseLocalDate(dateStr);
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

        const currentUser = this.getCurrentUser();
        const canEdit = currentUser.isAdmin || event.created_by === currentUser.id;

        return `
            <div class="event-card ${event.committed ? 'committed' : ''}" data-event-id="${event.id}">
                <div class="event-header">
                    <div class="event-title-section">
                        <h3 class="event-title">
                            <span class="event-type-emoji">${eventTypeEmojis[event.event_type] || '📌'}</span>
                            ${this.escapeHtml(event.title)}
                        </h3>
                        ${event.description ? `<p class="event-description">${this.escapeHtml(event.description)}</p>` : ''}
                        ${event.created_by_name ? `<div class="event-meta"><span>Added by ${this.escapeHtml(event.created_by_name)}</span></div>` : ''}
                    </div>
                    <div class="event-actions">
                        <button class="event-btn ${event.committed ? 'committed' : 'primary'}"
                                onclick="familyEvents.toggleCommitment(${event.id})">
                            ${event.committed ? '✓ Attending' : '💖 Attend'}
                        </button>
                        ${canEdit ? `
                            <button class="event-btn" onclick="familyEvents.deleteEvent(${event.id}, '${this.escapeHtml(event.title).replace(/'/g, "\\'")}')">
                                🗑️
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
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

    async toggleCommitment(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        const newCommitment = !event.committed;

        try {
            const response = await fetch('/api/calendar.php?action=commitment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event_id: eventId,
                    committed: newCommitment
                })
            });

            const result = await response.json();

            if (result.success) {
                event.committed = newCommitment;
                this.renderEvents();
                this.updateStats();
                this.showNotification(
                    newCommitment ? 'You\'re attending this event!' : 'Removed from your list',
                    'success'
                );
            } else {
                throw new Error(result.error || 'Failed to update');
            }
        } catch (error) {
            console.error('Commitment update error:', error);
            // Update locally anyway for better UX
            event.committed = newCommitment;
            this.renderEvents();
            this.updateStats();
        }
    }

    async deleteEvent(eventId, eventTitle) {
        if (!confirm(`Delete "${eventTitle}"?\n\nThis cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch('/api/calendar.php?action=delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event_id: eventId })
            });

            const result = await response.json();

            if (result.success) {
                this.events = this.events.filter(e => e.id !== eventId);
                this.applyFilters();
                this.updateStats();
                this.showNotification('Event deleted', 'success');
            } else {
                throw new Error(result.error || 'Delete failed');
            }
        } catch (error) {
            console.error('Delete error:', error);
            this.showNotification('Failed to delete event', 'error');
        }
    }

    renderEventsTimeline(container) {
        if (this.filteredEvents.length === 0) {
            container.innerHTML = `
                <div class="events-empty">
                    <div class="empty-icon">📅</div>
                    <h3>No events to show</h3>
                    <p>Add some events to see them in the timeline!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="timeline-container">
                <div class="timeline-events">
                    ${this.filteredEvents.slice(0, 20).map(event => `
                        <div class="timeline-event">
                            <div class="timeline-date">${this.formatDateShort(this.parseLocalDate(event.event_date))}</div>
                            <div class="timeline-content">
                                <h4>${this.escapeHtml(event.title)}</h4>
                                <p>${this.getRelativeDate(this.parseLocalDate(event.event_date))}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderPagination() {
        const totalPages = Math.ceil(this.filteredEvents.length / this.eventsPerPage);
        const pagination = document.getElementById('pagination');
        if (!pagination) return;

        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let html = `
            <button class="page-btn" ${this.currentPage === 1 ? 'disabled' : ''}
                    onclick="familyEvents.goToPage(${this.currentPage - 1})">
                ← Previous
            </button>
        `;

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

    // Modal management
    openAddEventModal() {
        if (window.unifiedModal) {
            window.unifiedModal.open('addEventModal');
        } else {
            const modal = document.getElementById('addEventModal');
            if (modal) modal.style.display = 'flex';
        }
        // Set default date to today
        const dateInput = document.getElementById('eventDate');
        if (dateInput) {
            const today = new Date();
            dateInput.value = today.getFullYear() + '-' +
                String(today.getMonth() + 1).padStart(2, '0') + '-' +
                String(today.getDate()).padStart(2, '0');
        }
    }

    closeAddEventModal() {
        if (window.unifiedModal) {
            window.unifiedModal.close('addEventModal');
        } else if (window.queuedModal) {
            window.queuedModal.close('addEventModal');
        } else {
            const modal = document.getElementById('addEventModal');
            if (modal) modal.style.display = 'none';
        }
    }

    async handleAddEvent(e) {
        e.preventDefault();

        const titleEl = document.getElementById('eventTitle');
        const dateEl = document.getElementById('eventDate');
        const descEl = document.getElementById('eventDescription');

        const eventData = {
            title: titleEl ? titleEl.value : '',
            date: dateEl ? dateEl.value : '',
            description: descEl ? descEl.value : ''
        };

        if (!eventData.title || !eventData.date) {
            this.showNotification('Please fill in title and date', 'error');
            return;
        }

        try {
            const response = await fetch('/api/calendar.php?action=add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventData)
            });

            const result = await response.json();

            if (result.success) {
                await this.loadEvents();
                this.closeAddEventModal();
                e.target.reset();
                this.showNotification('Event submitted for review!', 'success');
            } else {
                throw new Error(result.error || 'Failed to add event');
            }
        } catch (error) {
            console.error('Error adding event:', error);
            this.showNotification('Error: ' + error.message, 'error');
        }
    }

    toggleFilterPanel() {
        const panel = document.getElementById('filterPanel');
        if (panel) panel.classList.toggle('active');
    }

    switchView(view) {
        this.currentView = view;
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`[data-view="${view}"]`);
        if (activeBtn) activeBtn.classList.add('active');
        this.renderEvents();
    }

    showEventsContainer() {
        const loading = document.querySelector('.events-loading');
        const container = document.getElementById('eventsContainer');

        if (loading) loading.style.display = 'none';

        if (container) {
            container.style.opacity = '0';
            container.style.transform = 'translateY(20px)';

            setTimeout(() => {
                container.style.transition = 'all 0.5s ease';
                container.style.opacity = '1';
                container.style.transform = 'translateY(0)';
            }, 100);
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#f0fdf4' : type === 'error' ? '#fef2f2' : '#f0f9ff'};
            color: ${type === 'success' ? '#166534' : type === 'error' ? '#991b1b' : '#1e40af'};
            border: 1px solid ${type === 'success' ? '#bbf7d0' : type === 'error' ? '#fecaca' : '#bfdbfe'};
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-weight: 500;
            max-width: 300px;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 4000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.familyEvents = new FamilyEventsManager();
});
