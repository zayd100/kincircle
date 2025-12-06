// Messages Admin Module - Moderation for Board and Private Messages

class MessagesAdmin {
    constructor() {
        this.boardThreads = [];
        this.reportedMessages = [];
        this.blockedUsers = [];
        this.messageStats = {
            totalThreads: 0,
            activeThreads: 0,
            pendingReports: 0,
            deletedThreads: 0
        };
        
        this.init();
    }
    
    async init() {
        await this.loadData();
    }
    
    async loadData() {
        try {
            // Load data from API
            const response = await fetch('/api/admin/messages.php');
            const data = await response.json();
            this.boardThreads = data.boardThreads || [];
            this.reportedMessages = data.reportedMessages || [];
            this.updateStats();
            
        } catch (error) {
            console.log('Database not connected - using empty state for messages admin');
            this.boardThreads = [];
            this.reportedMessages = [];
            this.updateStats();
        }
    }
    
    
    updateStats() {
        this.messageStats = {
            totalThreads: this.boardThreads.length,
            activeThreads: this.boardThreads.filter(t => t.status === 'active').length,
            pendingReports: this.reportedMessages.filter(r => r.status === 'pending').length,
            deletedThreads: this.boardThreads.filter(t => t.status === 'deleted').length
        };
    }
    
    async getStats() {
        return [
            {
                label: 'Active Threads',
                value: this.messageStats.activeThreads
            },
            {
                label: 'Pending Reports',
                value: this.messageStats.pendingReports
            }
        ];
    }
    
    async render(container) {
        container.innerHTML = `
            <div class="messages-admin">
                <div class="tab-header">
                    <div class="header-info">
                        <h2>Message Board & Messaging Moderation</h2>
                        <p>Monitor and moderate board discussions and private messages</p>
                    </div>
                    <div class="header-actions">
                        <button class="btn-secondary" onclick="messagesAdmin.exportReport()">
                            📊 Export Report
                        </button>
                        <button class="btn-secondary" onclick="messagesAdmin.showSettings()">
                            ⚙️ Settings
                        </button>
                    </div>
                </div>

                <!-- Quick Stats -->
                <div class="admin-stats-grid">
                    <div class="stat-card">
                        <div class="stat-number">${this.messageStats.totalThreads}</div>
                        <div class="stat-label">Total Threads</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${this.messageStats.activeThreads}</div>
                        <div class="stat-label">Active Threads</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${this.messageStats.pendingReports}</div>
                        <div class="stat-label">Pending Reports</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${this.messageStats.deletedThreads}</div>
                        <div class="stat-label">Deleted Threads</div>
                    </div>
                </div>

                <!-- Moderation Tabs -->
                <div class="moderation-tabs">
                    <button class="mod-tab active" data-tab="reports">
                        🚨 Reports (${this.messageStats.pendingReports})
                    </button>
                    <button class="mod-tab" data-tab="threads">
                        💬 All Threads (${this.messageStats.totalThreads})
                    </button>
                    <button class="mod-tab" data-tab="users">
                        👥 User Management
                    </button>
                    <button class="mod-tab" data-tab="settings">
                        ⚙️ Moderation Settings
                    </button>
                </div>

                <!-- Tab Content -->
                <div class="mod-tab-content">
                    <div id="reports-tab" class="tab-pane active">
                        ${this.renderReportsTab()}
                    </div>
                    <div id="threads-tab" class="tab-pane">
                        ${this.renderThreadsTab()}
                    </div>
                    <div id="users-tab" class="tab-pane">
                        ${this.renderUsersTab()}
                    </div>
                    <div id="settings-tab" class="tab-pane">
                        ${this.renderSettingsTab()}
                    </div>
                </div>
            </div>
        `;
        
        this.setupTabSwitching();
    }
    
    renderReportsTab() {
        if (this.reportedMessages.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-icon">✅</div>
                    <h3>No Pending Reports</h3>
                    <p>All content is currently in good standing</p>
                </div>
            `;
        }
        
        return `
            <div class="reports-list">
                ${this.reportedMessages.map(report => this.renderReportCard(report)).join('')}
            </div>
        `;
    }
    
    renderReportCard(report) {
        return `
            <div class="report-card ${report.reportCount > 2 ? 'urgent' : ''}">
                <div class="report-header">
                    <div class="report-type">
                        <span class="type-badge ${report.type}">${report.type === 'thread' ? '💬' : '📨'}</span>
                        <span>${report.type === 'thread' ? 'Board Thread' : 'Private Message'}</span>
                    </div>
                    <div class="report-urgency">
                        <span class="urgency-indicator ${report.reportCount > 2 ? 'high' : 'medium'}"></span>
                        <span>${report.reportCount || 1} report(s)</span>
                    </div>
                </div>
                
                <div class="report-content">
                    <h4>${report.contentTitle}</h4>
                    <div class="report-details">
                        <div class="report-detail-row">
                            <span class="report-detail-label">Reported by:</span>
                            <span class="report-detail-value">${report.reportedBy.name}</span>
                        </div>
                        <div class="report-detail-row">
                            <span class="report-detail-label">Reason:</span>
                            <span class="report-detail-value">${this.formatReasonBadge(report.reason)}</span>
                        </div>
                        <div class="report-detail-row">
                            <span class="report-detail-label">Date:</span>
                            <span class="report-detail-value">${this.formatDate(report.reportedAt)}</span>
                        </div>
                        <div class="report-detail-row">
                            <span class="report-detail-label">Description:</span>
                            <span class="report-detail-value">${report.description}</span>
                        </div>
                    </div>
                </div>
                
                <div class="report-actions">
                    <button class="btn-view" onclick="messagesAdmin.viewReportedContent(${report.id})">
                        👁️ View Content
                    </button>
                    <button class="btn-approve" onclick="messagesAdmin.dismissReport(${report.id})">
                        ✅ Dismiss Report
                    </button>
                    <button class="btn-warning" onclick="messagesAdmin.warnUser(${report.id})">
                        ⚠️ Warn User
                    </button>
                    <button class="btn-danger" onclick="messagesAdmin.removeContent(${report.id})">
                        🗑️ Remove Content
                    </button>
                </div>
            </div>
        `;
    }
    
    formatReasonBadge(reason) {
        const reasons = {
            inappropriate: '🚫 Inappropriate',
            spam: '📧 Spam',
            harassment: '😠 Harassment',
            offtopic: '🎯 Off-topic',
            other: '❓ Other'
        };
        return reasons[reason] || reason;
    }
    
    renderThreadsTab() {
        return `
            <div class="threads-management">
                <div class="thread-filters">
                    <select id="threadStatusFilter" onchange="messagesAdmin.filterThreads()">
                        <option value="all">All Threads</option>
                        <option value="active">Active</option>
                        <option value="locked">Locked</option>
                        <option value="reported">Reported</option>
                    </select>
                    <input type="text" id="threadSearch" placeholder="Search threads..." onkeyup="messagesAdmin.searchThreads()">
                </div>
                
                <div class="threads-list">
                    ${this.boardThreads.map(thread => this.renderThreadRow(thread)).join('')}
                </div>
            </div>
        `;
    }
    
    renderThreadRow(thread) {
        return `
            <div class="thread-row ${thread.status === 'reported' ? 'reported' : ''}">
                <div class="thread-info">
                    <div class="thread-title">
                        ${thread.isPinned ? '📌' : ''}
                        ${thread.isLocked ? '🔒' : ''}
                        <strong>${thread.title}</strong>
                    </div>
                    <div class="thread-meta">
                        <span class="category-badge ${thread.category}">${thread.category}</span>
                        <span>by ${thread.author.name}</span>
                        <span>•</span>
                        <span>${thread.replyCount} replies</span>
                        <span>•</span>
                        <span>${this.formatDate(thread.createdAt)}</span>
                        ${thread.reportCount > 0 ? `<span class="report-indicator">🚨 ${thread.reportCount} reports</span>` : ''}
                    </div>
                </div>
                
                <div class="thread-actions">
                    <button class="action-btn" onclick="messagesAdmin.toggleThreadPin(${thread.id})" title="${thread.isPinned ? 'Unpin' : 'Pin'}">${thread.isPinned ? '📌' : '📍'}</button>
                    <button class="action-btn" onclick="messagesAdmin.toggleThreadLock(${thread.id})" title="${thread.isLocked ? 'Unlock' : 'Lock'}">${thread.isLocked ? '🔓' : '🔒'}</button>
                    <button class="action-btn danger" onclick="messagesAdmin.deleteThread(${thread.id})" title="Delete Thread">🗑️</button>
                </div>
            </div>
        `;
    }
    
    renderUsersTab() {
        return `
            <div class="user-management">
                <div class="section-header">
                    <h3>User Communication Management</h3>
                </div>
                
                <div class="user-actions-grid">
                    <div class="action-card">
                        <div class="action-icon">🔇</div>
                        <h4>Mute User</h4>
                        <p>Temporarily prevent user from posting</p>
                        <button class="btn-warning" onclick="messagesAdmin.showMuteUser()">Manage Mutes</button>
                    </div>
                    
                    <div class="action-card">
                        <div class="action-icon">🚫</div>
                        <h4>Block User</h4>
                        <p>Prevent user from sending private messages</p>
                        <button class="btn-danger" onclick="messagesAdmin.showBlockUser()">Manage Blocks</button>
                    </div>
                    
                    <div class="action-card">
                        <div class="action-icon">⚠️</div>
                        <h4>Warning System</h4>
                        <p>Send official warnings to users</p>
                        <button class="btn-secondary" onclick="messagesAdmin.showWarnings()">View Warnings</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderSettingsTab() {
        return `
            <div class="moderation-settings">
                <div class="settings-section">
                    <h3>Content Moderation</h3>
                    <div class="setting-group">
                        <label>
                            <input type="checkbox" checked> Auto-moderate inappropriate language
                        </label>
                        <label>
                            <input type="checkbox" checked> Require approval for new user posts
                        </label>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h3>Private Messaging</h3>
                    <div class="setting-group">
                        <label>
                            <input type="checkbox" checked> Allow private messaging between all family members
                        </label>
                        <label>
                            <input type="checkbox" checked> Enable message encryption
                        </label>
                    </div>
                </div>
                
                <div class="settings-actions">
                    <button class="btn-primary" onclick="messagesAdmin.saveSettings()">
                        💾 Save Settings
                    </button>
                </div>
            </div>
        `;
    }
    
    setupTabSwitching() {
        const tabs = document.querySelectorAll('.mod-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }
    
    switchTab(tabName) {
        // Update tab appearance
        document.querySelectorAll('.mod-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Show corresponding content
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }
    
    formatDate(date) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
    }
    
    // Moderation Actions
    async dismissReport(reportId) {
        if (confirm('Are you sure you want to dismiss this report?')) {
            const report = this.reportedMessages.find(r => r.id === reportId);
            report.status = 'dismissed';
            this.showNotification('Report dismissed', 'success');
            this.render(document.querySelector('.messages-admin').parentElement);
        }
    }
    
    async warnUser(reportId) {
        const report = this.reportedMessages.find(r => r.id === reportId);
        const warning = prompt(`Send warning to user about: ${report.contentTitle}\n\nEnter warning message:`);
        
        if (warning) {
            this.showNotification(`Warning sent to user`, 'success');
            report.status = 'warned';
            this.render(document.querySelector('.messages-admin').parentElement);
        }
    }
    
    async removeContent(reportId) {
        if (confirm('Are you sure you want to remove this content? This action cannot be undone.')) {
            const report = this.reportedMessages.find(r => r.id === reportId);
            report.status = 'removed';
            this.showNotification('Content removed', 'success');
            this.render(document.querySelector('.messages-admin').parentElement);
        }
    }
    
    async toggleThreadPin(threadId) {
        const thread = this.boardThreads.find(t => t.id === threadId);
        const newPinState = !thread.isPinned;

        try {
            const response = await fetch('/api/messages.php?action=pin', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: threadId, is_pinned: newPinState ? 1 : 0 })
            });

            const result = await response.json();

            if (result.success) {
                thread.isPinned = newPinState;
                this.showNotification(`Thread ${newPinState ? 'pinned' : 'unpinned'}`, 'success');
                this.render(document.querySelector('.messages-admin').parentElement);
            } else {
                throw new Error(result.error || 'Failed to pin thread');
            }
        } catch (error) {
            console.error('Error pinning thread:', error);
            this.showNotification('Failed to pin thread: ' + error.message, 'error');
        }
    }

    async toggleThreadLock(threadId) {
        const thread = this.boardThreads.find(t => t.id === threadId);
        const newLockState = !thread.isLocked;

        try {
            const response = await fetch('/api/messages.php?action=lock', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: threadId, is_locked: newLockState ? 1 : 0 })
            });

            const result = await response.json();

            if (result.success) {
                thread.isLocked = newLockState;
                this.showNotification(`Thread ${newLockState ? 'locked' : 'unlocked'}`, 'success');
                this.render(document.querySelector('.messages-admin').parentElement);
            } else {
                throw new Error(result.error || 'Failed to lock thread');
            }
        } catch (error) {
            console.error('Error locking thread:', error);
            this.showNotification('Failed to lock thread: ' + error.message, 'error');
        }
    }
    
    async deleteThread(threadId) {
        if (confirm('Are you sure you want to delete this thread? This action cannot be undone.')) {
            try {
                // Actually delete from database via API
                const response = await fetch('/api/messages.php', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: threadId })
                });

                const result = await response.json();

                if (result.success) {
                    // Remove from local array
                    this.boardThreads = this.boardThreads.filter(t => t.id !== threadId);
                    this.showNotification('Thread deleted successfully', 'success');
                    this.updateStats();
                    this.render(document.querySelector('.messages-admin').parentElement);
                } else {
                    throw new Error(result.error || 'Failed to delete thread');
                }
            } catch (error) {
                console.error('Error deleting thread:', error);
                this.showNotification('Failed to delete thread: ' + error.message, 'error');
            }
        }
    }
    
    showNotification(message, type = 'info') {
        if (window.adminCore) {
            adminCore.showMessage(message, type);
        }
    }
    
    // Placeholder methods for additional functionality
    exportReport() { this.showNotification('Export functionality coming soon', 'info'); }
    showSettings() { this.switchTab('settings'); }
    filterThreads() { this.showNotification('Filtering threads...', 'info'); }
    searchThreads() { this.showNotification('Searching threads...', 'info'); }
    viewReportedContent(id) { this.showNotification(`Opening reported content ${id}...`, 'info'); }
    showMuteUser() { this.showNotification('Mute management coming soon', 'info'); }
    showBlockUser() { this.showNotification('Block management coming soon', 'info'); }
    showWarnings() { this.showNotification('Warning system coming soon', 'info'); }
    saveSettings() { this.showNotification('Settings saved', 'success'); }
}

// Initialize the messages admin and make it globally accessible
window.messagesAdmin = new MessagesAdmin();

// Register with admin core when it's ready
if (window.adminCore) {
    adminCore.registerModule({
        name: 'messages',
        title: 'Message Moderation',
        icon: '💬',
        priority: 2,
        getStats: () => window.messagesAdmin.getStats(),
        render: (container) => window.messagesAdmin.render(container)
    });
} else {
    // Wait for admin core to load
    document.addEventListener('DOMContentLoaded', () => {
        if (window.adminCore) {
            adminCore.registerModule({
                name: 'messages',
                title: 'Message Moderation',
                icon: '💬',
                priority: 2,
                getStats: () => window.messagesAdmin.getStats(),
                render: (container) => window.messagesAdmin.render(container)
            });
        }
    });
}

// CSS for messages admin styling
const messagesAdminStyle = document.createElement('style');
messagesAdminStyle.textContent = `
    .messages-admin { max-width: 1200px; color: #1f2937; }
    .messages-admin h2, .messages-admin h3 { color: #111827; }
    .messages-admin p { color: #6b7280; }
    .admin-section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 2px solid #e5e7eb; }
    .header-info h2 { color: #111827; margin-bottom: 0.25rem; }
    .header-info p { color: #6b7280; }
    .stats-overview { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
    .admin-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
    .admin-stats-grid .stat-card { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.5rem; text-align: center; }
    .admin-stats-grid .stat-number { font-size: 2.5rem; font-weight: 700; color: #111827; margin-bottom: 0.5rem; }
    .admin-stats-grid .stat-label { color: #6b7280; font-size: 0.875rem; font-weight: 500; }
    .moderation-tabs { display: flex; border-bottom: 2px solid #e5e7eb; margin-bottom: 2rem; gap: 0.5rem; }
    .mod-tab { background: none; border: none; padding: 1rem 1.5rem; font-weight: 600; color: #6b7280; cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.3s ease; }
    .mod-tab:hover { color: #374151; background: #f9fafb; }
    .mod-tab.active { color: #3b82f6; border-bottom-color: #3b82f6; background: #f8fafc; }
    .tab-pane { display: none; }
    .tab-pane.active { display: block; }
    .report-card { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem; color: #1f2937; }
    .report-card.urgent { border-left: 4px solid #ef4444; background: #fef2f2; }
    .report-header, .report-content { color: #1f2937; }
    .report-content h4 { color: #111827; }
    .report-detail-label { color: #6b7280; font-weight: 500; }
    .report-detail-value { color: #374151; }
    .report-actions { display: flex; gap: 0.75rem; margin-top: 1rem; flex-wrap: wrap; }
    .report-actions button { padding: 0.5rem 1rem; border: none; border-radius: 6px; font-size: 0.875rem; font-weight: 600; cursor: pointer; }
    .btn-view { background: #f3f4f6; color: #374151; }
    .btn-approve { background: #d1fae5; color: #065f46; }
    .btn-warning { background: #fef3c7; color: #92400e; }
    .btn-danger { background: #fee2e2; color: #991b1b; }
    .thread-row { display: flex; justify-content: space-between; align-items: center; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 0.5rem; background: white; color: #1f2937; }
    .thread-row.reported { border-left: 4px solid #ef4444; background: #fef2f2; }
    .thread-info { flex: 1; min-width: 0; }
    .thread-title { color: #1f2937; font-weight: 600; margin-bottom: 0.5rem; }
    .thread-actions { display: flex; gap: 0.5rem; }
    .action-btn { background: white; border: 1px solid #e5e7eb; padding: 0.5rem; border-radius: 6px; cursor: pointer; color: #374151; }
    .action-btn:hover { background: #f9fafb; }
    .action-btn.danger:hover { background: #fee2e2; border-color: #ef4444; color: #991b1b; }
    .user-actions-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
    .action-card { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.5rem; text-align: center; color: #1f2937; }
    .action-card h4 { color: #111827; margin: 0.5rem 0; }
    .action-card p { color: #6b7280; }
    .action-icon { font-size: 2rem; margin-bottom: 1rem; }
    .settings-section { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; color: #1f2937; }
    .settings-section h3 { color: #111827; margin-bottom: 1rem; }
    .setting-group { display: flex; flex-direction: column; gap: 0.75rem; }
    .setting-group label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
    .empty-state { text-align: center; padding: 3rem; color: #6b7280; }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; }
    .urgency-indicator { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 0.5rem; }
    .urgency-indicator.high { background: #ef4444; }
    .urgency-indicator.medium { background: #f59e0b; }
    .type-badge { background: #e5e7eb; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.875rem; font-weight: 600; }
    .category-badge { background: #e5e7eb; padding: 0.125rem 0.5rem; border-radius: 8px; font-size: 0.75rem; font-weight: 600; }
    .report-indicator { color: #ef4444; font-weight: 600; }
    .thread-meta { font-size: 0.875rem; color: #6b7280; margin-top: 0.5rem; }
    .thread-filters { display: flex; gap: 1rem; margin-bottom: 1.5rem; align-items: center; }
    .thread-filters select, .thread-filters input { padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; }
`;
document.head.appendChild(messagesAdminStyle);