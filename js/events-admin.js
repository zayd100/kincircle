// Events Admin Module
// Unified with other admin modules pattern

class EventsAdmin {
    constructor() {
        this.pendingEvents = [];
        this.approvedEvents = [];
        this.dataLoaded = false;
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

    async loadData() {
        try {
            const response = await fetch('/api/calendar.php?action=admin_events');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.pendingEvents = Array.isArray(data.pending) ? data.pending : [];
                    this.approvedEvents = Array.isArray(data.approved) ? data.approved : [];
                } else {
                    console.error('Events API error:', data.error);
                    this.pendingEvents = [];
                    this.approvedEvents = [];
                }
            } else {
                console.log('Events API returned status:', response.status);
                this.pendingEvents = [];
                this.approvedEvents = [];
            }
        } catch (error) {
            console.error('Error loading events:', error);
            this.pendingEvents = [];
            this.approvedEvents = [];
        }
    }

    async getStats() {
        return [
            { label: 'Pending Events', value: this.pendingEvents.length }
        ];
    }

    async render(container) {
        await this.loadData();
        this.dataLoaded = true;

        container.innerHTML = `
            <div class="events-admin-panel">
                <div class="section-header">
                    <h3>🎉 Events Management</h3>
                    <div class="header-actions">
                        <button onclick="eventsAdmin.refresh()" class="btn btn-secondary">
                            🔄 Refresh
                        </button>
                    </div>
                </div>

                <div class="events-stats" style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
                    <div class="stat-card" style="background: var(--glass-bg); padding: 1rem; border-radius: 8px; text-align: center; min-width: 120px;">
                        <div class="stat-number" style="font-size: 1.5rem; font-weight: bold; color: var(--primary);">${this.pendingEvents.length}</div>
                        <div class="stat-label" style="font-size: 0.875rem; color: var(--light-gray);">Pending Review</div>
                    </div>
                    <div class="stat-card" style="background: var(--glass-bg); padding: 1rem; border-radius: 8px; text-align: center; min-width: 120px;">
                        <div class="stat-number" style="font-size: 1.5rem; font-weight: bold; color: var(--primary);">${this.approvedEvents.length}</div>
                        <div class="stat-label" style="font-size: 0.875rem; color: var(--light-gray);">Calendar Events</div>
                    </div>
                    <div class="stat-card" style="background: var(--glass-bg); padding: 1rem; border-radius: 8px; text-align: center; min-width: 120px;">
                        <div class="stat-number" style="font-size: 1.5rem; font-weight: bold; color: var(--primary);">${this.getUpcomingCount()}</div>
                        <div class="stat-label" style="font-size: 0.875rem; color: var(--light-gray);">Upcoming</div>
                    </div>
                </div>

                ${this.pendingEvents.length > 0 ? `
                    <div class="pending-section" style="margin-bottom: 2rem;">
                        <h4 style="margin-bottom: 1rem; color: var(--black);">📋 Pending Event Submissions</h4>
                        <div class="pending-list" id="pendingEventsList">
                            ${this.renderPendingEvents()}
                        </div>
                    </div>
                ` : ''}

                <div class="approved-section">
                    <h4 style="margin-bottom: 1rem; color: var(--black);">📅 Calendar Events</h4>
                    <div class="events-list" id="approvedEventsList">
                        ${this.renderApprovedEvents()}
                    </div>
                </div>
            </div>
        `;
    }

    getUpcomingCount() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return this.approvedEvents.filter(e => this.parseLocalDate(e.event_date) >= today).length;
    }

    renderPendingEvents() {
        if (this.pendingEvents.length === 0) {
            return `<p style="color: var(--light-gray); text-align: center; padding: 1rem;">No pending events to review.</p>`;
        }

        return this.pendingEvents.map(event => {
            const eventDate = event.event_date ? this.parseLocalDate(event.event_date).toLocaleDateString() : 'No date';
            const submittedDate = event.submitted_at ? new Date(event.submitted_at).toLocaleDateString() : '';

            return `
                <div class="event-card pending" data-id="${event.id}" style="background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
                        <div class="event-info" style="flex: 1; min-width: 200px;">
                            <h4 style="margin: 0 0 0.5rem 0; color: var(--black);">
                                <span style="background: #f59e0b; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; margin-right: 0.5rem;">PENDING</span>
                                ${this.escapeHtml(event.title)}
                            </h4>
                            <div style="font-size: 0.875rem; color: var(--light-gray);">
                                <span>📅 ${eventDate}</span>
                                ${event.submitted_by_name ? `<span style="margin-left: 1rem;">👤 Submitted by ${this.escapeHtml(event.submitted_by_name)}</span>` : ''}
                                ${submittedDate ? `<span style="margin-left: 1rem;">🕐 ${submittedDate}</span>` : ''}
                            </div>
                            ${event.description ? `<p style="margin: 0.5rem 0 0 0; color: var(--light-gray); font-size: 0.875rem;">${this.escapeHtml(event.description)}</p>` : ''}
                        </div>
                        <div class="event-actions" style="display: flex; gap: 0.5rem;">
                            <button onclick="eventsAdmin.approveEvent(${event.id}, '${this.escapeHtml(event.title).replace(/'/g, "\\'")}')" class="btn btn-primary btn-sm">
                                ✅ Approve
                            </button>
                            <button onclick="eventsAdmin.rejectEvent(${event.id}, '${this.escapeHtml(event.title).replace(/'/g, "\\'")}')" class="btn btn-danger btn-sm">
                                ❌ Reject
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderApprovedEvents() {
        if (this.approvedEvents.length === 0) {
            return `
                <div class="empty-state" style="text-align: center; padding: 2rem; color: var(--light-gray);">
                    <p>📅 No events on the calendar yet.</p>
                </div>
            `;
        }

        // Sort by date, upcoming first
        const sorted = [...this.approvedEvents].sort((a, b) =>
            this.parseLocalDate(a.event_date) - this.parseLocalDate(b.event_date)
        );

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return sorted.map(event => {
            const eventDate = this.parseLocalDate(event.event_date);
            const dateStr = eventDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
            const isPast = eventDate < today;
            const isToday = eventDate.toDateString() === today.toDateString();

            return `
                <div class="event-card" data-id="${event.id}" style="background: var(--glass-bg); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; margin-bottom: 0.75rem; ${isPast ? 'opacity: 0.6;' : ''}">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                        <div class="event-info" style="flex: 1; min-width: 200px;">
                            <h4 style="margin: 0 0 0.25rem 0; color: var(--black);">
                                ${isToday ? '<span style="background: var(--primary); color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; margin-right: 0.5rem;">TODAY</span>' : ''}
                                ${isPast ? '<span style="background: var(--light-gray); color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; margin-right: 0.5rem;">PAST</span>' : ''}
                                ${this.escapeHtml(event.title)}
                            </h4>
                            <div style="font-size: 0.875rem; color: var(--light-gray);">
                                <span>📅 ${dateStr}</span>
                                ${event.created_by_name ? `<span style="margin-left: 1rem;">👤 ${this.escapeHtml(event.created_by_name)}</span>` : ''}
                            </div>
                            ${event.description ? `<p style="margin: 0.5rem 0 0 0; color: var(--light-gray); font-size: 0.875rem;">${this.escapeHtml(event.description)}</p>` : ''}
                        </div>
                        <div class="event-actions">
                            <button onclick="eventsAdmin.deleteEvent(${event.id}, '${this.escapeHtml(event.title).replace(/'/g, "\\'")}')" class="btn btn-danger btn-sm" title="Delete">
                                🗑️
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    async refresh() {
        await this.loadData();
        const container = document.getElementById('moduleContent');
        if (container) {
            await this.render(container);
        }
        this.showMessage('Events refreshed', 'success');
    }

    async approveEvent(eventId, eventTitle) {
        if (!confirm(`Approve "${eventTitle}" and add to the calendar?`)) {
            return;
        }

        try {
            const response = await fetch('/api/approve-event.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event_id: eventId })
            });

            const result = await response.json();

            if (result.success) {
                // Remove from pending, will appear in approved on refresh
                this.pendingEvents = this.pendingEvents.filter(e => e.id != eventId);
                await this.refresh();
                this.showMessage(`"${eventTitle}" approved and added to calendar`, 'success');
            } else {
                throw new Error(result.error || 'Approval failed');
            }
        } catch (error) {
            console.error('Approve error:', error);
            this.showMessage('Failed to approve event: ' + error.message, 'error');
        }
    }

    async rejectEvent(eventId, eventTitle) {
        const reason = prompt(`Reason for rejecting "${eventTitle}" (optional):`);
        if (reason === null) return; // User cancelled

        try {
            const response = await fetch('/api/reject-event.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event_id: eventId, reason: reason })
            });

            const result = await response.json();

            if (result.success) {
                this.pendingEvents = this.pendingEvents.filter(e => e.id != eventId);
                await this.refresh();
                this.showMessage(`"${eventTitle}" rejected`, 'success');
            } else {
                throw new Error(result.error || 'Rejection failed');
            }
        } catch (error) {
            console.error('Reject error:', error);
            this.showMessage('Failed to reject event: ' + error.message, 'error');
        }
    }

    async deleteEvent(eventId, eventTitle) {
        if (!confirm(`Delete "${eventTitle}" from the calendar?\n\nThis cannot be undone.`)) {
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
                this.approvedEvents = this.approvedEvents.filter(e => e.id != eventId);
                await this.refresh();
                this.showMessage(`"${eventTitle}" deleted`, 'success');
            } else {
                throw new Error(result.error || 'Delete failed');
            }
        } catch (error) {
            console.error('Delete error:', error);
            this.showMessage('Failed to delete event: ' + error.message, 'error');
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showMessage(text, type = 'info') {
        const colors = {
            success: { bg: '#f0fdf4', text: '#166534' },
            error: { bg: '#fef2f2', text: '#991b1b' },
            info: { bg: '#f0f9ff', text: '#1e40af' },
            warning: { bg: '#fffbeb', text: '#92400e' }
        };
        const color = colors[type] || colors.info;

        const msg = document.createElement('div');
        msg.style.cssText = `
            position: fixed;
            top: 2rem;
            right: 2rem;
            background: ${color.bg};
            color: ${color.text};
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            font-weight: 500;
        `;
        msg.textContent = text;
        document.body.appendChild(msg);

        setTimeout(() => msg.remove(), 4000);
    }
}

// Create instance
const eventsAdmin = new EventsAdmin();

// Register with admin core
function registerEventsModule() {
    if (window.adminCore) {
        adminCore.registerModule({
            name: 'events',
            title: 'Events Management',
            icon: '🎉',
            priority: 5,
            getStats: () => eventsAdmin.getStats(),
            render: (container) => eventsAdmin.render(container)
        });
    }
}

if (window.adminCore) {
    registerEventsModule();
} else {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(registerEventsModule, 200);
    });
}
