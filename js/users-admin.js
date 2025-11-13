// Users Admin Module - Family Member Management & Registration Approval
// Where family connections are approved and directory is auto-populated

class UsersAdmin {
    constructor() {
        this.pendingUsers = [];
        this.activeUsers = [];
        this.userStats = {
            totalUsers: 0,
            pendingApprovals: 0,
            activeThisMonth: 0,
            cousinConnectActive: 0
        };
        
        this.init();
    }
    
    async init() {
        await this.loadData();
        this.registerWithAdminCore();
    }
    
    registerWithAdminCore() {
        // Register with admin core when ready
        if (window.adminCore) {
            adminCore.registerModule({
                name: 'users',
                title: 'Family Management',
                icon: '👥',
                priority: 4,
                getStats: () => this.getStats(),
                render: (container) => this.render(container)
            });
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    if (window.adminCore) {
                        adminCore.registerModule({
                            name: 'users',
                            title: 'Family Management',
                            icon: '👥',
                            priority: 4,
                            getStats: () => this.getStats(),
                            render: (container) => this.render(container)
                        });
                    }
                }, 200);
            });
        }
    }
    
    async loadData() {
        try {
            // Load data from unified PHP admin (no API dependency)
            console.log('Loading user data via unified PHP system');
            
            // Use PHP data passed from admin-unified.php
            if (window.adminData) {
                this.pendingUsers = window.adminData.pending_users || [];
                this.activeUsers = window.adminData.active_users || [];
                console.log('Loaded from unified admin:', this.pendingUsers.length, 'pending,', this.activeUsers.length, 'active');
            } else {
                // Fallback: load via hidden forms (unified approach)
                await this.loadViaUnifiedForms();
            }
            
            this.updateStats();
        } catch (error) {
            console.error('Error loading user data:', error);
            console.log('Database not connected - using empty state for users admin');
            this.pendingUsers = [];
            this.activeUsers = [];
            this.updateStats();
        }
    }
    
    async loadViaUnifiedForms() {
        // Create temporary forms to fetch data via unified PHP system
        const pendingForm = new FormData();
        pendingForm.append('action', 'get_pending');
        
        const activeForm = new FormData();
        activeForm.append('action', 'get_active');
        
        try {
            const pendingResponse = await fetch('admin-unified.php', {
                method: 'POST',
                body: pendingForm
            });
            
            const activeResponse = await fetch('admin-unified.php', {
                method: 'POST', 
                body: activeForm
            });
            
            // Parse responses (will add these handlers to admin-unified.php)
            this.pendingUsers = [];
            this.activeUsers = [];
        } catch (error) {
            console.log('Unified forms not yet implemented, using empty data');
            this.pendingUsers = [];
            this.activeUsers = [];
        }
    }
    
    
    
    updateStats() {
        this.userStats = {
            totalUsers: this.activeUsers.length,
            pendingApprovals: this.pendingUsers.filter(u => u.status === 'pending').length,
            activeThisMonth: this.activeUsers.filter(u => {
                const loginDate = new Date(u.last_login);
                const monthAgo = new Date();
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                return loginDate > monthAgo;
            }).length,
            cousinConnectActive: this.activeUsers.filter(u => u.cousin_connect_available).length
        };
    }
    
    getStats() {
        return {
            'Pending Approvals': this.userStats.pendingApprovals,
            'Active Users': this.userStats.totalUsers,
            'Cousin Connect': this.userStats.cousinConnectActive,
            'Active This Month': this.userStats.activeThisMonth
        };
    }
    
    render(container) {
        container.innerHTML = `
            <div class="admin-section">
                <div class="section-header">
                    <h2>Family Member Management</h2>
                    <p>Manage user registrations and admin privileges</p>
                </div>
                
                <div class="redirect-card" style="
                    background: var(--glass-bg);
                    border: 1px solid var(--glass-border);
                    border-radius: var(--radius-lg);
                    padding: 2rem;
                    margin: 2rem 0;
                ">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                        <button class="btn primary" onclick="window.location.href='approve_pending_users.php'" style="
                            padding: 1.5rem;
                            font-size: 1.1rem;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            gap: 0.5rem;
                        ">
                            <span style="font-size: 2rem;">✅</span>
                            <span>Approve Pending Users</span>
                            <span style="font-size: 0.9rem; opacity: 0.8;">Review new registrations</span>
                        </button>
                        
                        <button class="btn secondary" onclick="window.location.href='admin_user_management.php'" style="
                            padding: 1.5rem;
                            font-size: 1.1rem;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            gap: 0.5rem;
                        ">
                            <span style="font-size: 2rem;">👥</span>
                            <span>Manage Active Users</span>
                            <span style="font-size: 0.9rem; opacity: 0.8;">Admin privileges & user list</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderPendingUsers() {
        if (this.pendingUsers.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-icon">✅</div>
                    <h3>No pending approvals</h3>
                    <p>All family member registrations have been processed.</p>
                </div>
            `;
        }
        
        return `
            <div class="pending-users">
                ${this.pendingUsers.map(user => `
                    <div class="user-card pending-card" data-user-id="${user.id}">
                        <div class="user-header">
                            <div class="user-info">
                                <h3>${user.display_name}</h3>
                                <div class="user-meta">
                                    <span class="username">@${user.username}</span>
                                    <span class="connection-type">${this.formatConnectionType(user.family_connection)}</span>
                                    <span class="submit-date">${new Date(user.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div class="user-actions">
                                <button class="btn btn-approve" onclick="usersAdmin.approveUser(${user.id})">
                                    <span>✅</span> Approve
                                </button>
                                <button class="btn btn-reject" onclick="usersAdmin.rejectUser(${user.id})">
                                    <span>❌</span> Reject
                                </button>
                            </div>
                        </div>
                        
                        <div class="user-details">
                            <div class="contact-info">
                                <div class="info-item">
                                    <strong>Email:</strong> ${user.email}
                                </div>
                                ${user.phone ? `<div class="info-item"><strong>Phone:</strong> ${user.phone}</div>` : ''}
                            </div>
                            
                            <div class="relationship-note">
                                <strong>Family Connection:</strong>
                                <p>${user.relationship_note}</p>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    renderActiveUsers() {
        return `
            <div class="active-users">
                <div class="users-grid">
                    ${this.activeUsers.map(user => `
                        <div class="user-card active-card">
                            <div class="user-header">
                                <div class="user-info">
                                    <h3>${user.display_name}</h3>
                                    <div class="user-meta">
                                        <span class="username">@${user.username}</span>
                                        ${user.is_admin ? '<span class="admin-badge">Admin</span>' : ''}
                                        ${user.cousin_connect_available ? '<span class="cousin-connect-badge">Cousin Connect</span>' : ''}
                                    </div>
                                </div>
                                <div class="user-actions">
                                    <button class="btn secondary" onclick="usersAdmin.editUser(${user.id})">
                                        <span>✏️</span> Edit
                                    </button>
                                </div>
                            </div>
                            
                            <div class="user-details">
                                <div class="contact-info">
                                    <div class="info-item">
                                        <strong>Email:</strong> ${user.email}
                                    </div>
                                    ${user.phone ? `<div class="info-item"><strong>Phone:</strong> ${user.phone}</div>` : ''}
                                    <div class="info-item">
                                        <strong>Joined:</strong> ${new Date(user.created_at).toLocaleDateString()}
                                    </div>
                                    <div class="info-item">
                                        <strong>Last Login:</strong> ${user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                                    </div>
                                </div>
                                
                                ${user.cousin_connect_interests ? `
                                    <div class="cousin-connect-info">
                                        <strong>Interests:</strong> ${user.cousin_connect_interests}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    renderCousinConnectUsers() {
        const cousinConnectUsers = this.activeUsers.filter(u => u.cousin_connect_available);
        
        if (cousinConnectUsers.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-icon">🤝</div>
                    <h3>No active cousin connect users</h3>
                    <p>No family members have opted into cousin connect yet.</p>
                </div>
            `;
        }
        
        return `
            <div class="cousin-connect-users">
                <div class="users-grid">
                    ${cousinConnectUsers.map(user => `
                        <div class="user-card cousin-connect-card">
                            <div class="available-stamp">Available</div>
                            <div class="user-header">
                                <div class="user-info">
                                    <h3>${user.display_name}</h3>
                                    <div class="user-meta">
                                        <span class="username">@${user.username}</span>
                                        <span class="available-since">Available since ${new Date(user.cousin_connect_since || user.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="user-details">
                                <div class="contact-info">
                                    <div class="info-item">
                                        <strong>Email:</strong> ${user.email}
                                    </div>
                                    ${user.phone ? `<div class="info-item"><strong>Phone:</strong> ${user.phone}</div>` : ''}
                                </div>
                                
                                <div class="interests-info">
                                    <strong>Interests:</strong> ${user.cousin_connect_interests || 'Not specified'}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    formatConnectionType(connection) {
        const types = {
            'reed': 'Reed Family',
            'weaver': 'Weaver Family',
            'married-in': 'Married In',
            'other': 'Other Connection'
        };
        return types[connection] || connection;
    }
    
    setupEventListeners() {
        // Tab switching is handled by onclick in the HTML
    }
    
    showTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });
        
        // Show selected tab
        document.getElementById(`${tabName}-tab`).classList.add('active');
        event.target.classList.add('active');
    }
    
    async approveUser(userId) {
        try {
            // Use unified PHP form submission instead of API
            const formData = new FormData();
            formData.append('action', 'approve');
            formData.append('pending_id', userId);
            
            const response = await fetch('admin-unified.php', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                this.showMessage('User approved successfully! They will be automatically added to the family directory.', 'success');
                // Reload the page to show updated data
                window.location.reload();
            } else {
                this.showMessage('Error approving user. Please try again.', 'error');
            }
        } catch (error) {
            this.showMessage('Error approving user. Please try again.', 'error');
            console.error('Approval error:', error);
        }
    }
    
    async rejectUser(userId) {
        const reason = prompt('Please provide a reason for rejection (optional):');
        if (reason === null) return; // User cancelled
        
        try {
            // Use unified PHP form submission instead of API
            const formData = new FormData();
            formData.append('action', 'reject');
            formData.append('pending_id', userId);
            formData.append('reason', reason || 'No reason provided');
            
            const response = await fetch('admin-unified.php', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                this.showMessage('User registration rejected.', 'success');
                // Reload the page to show updated data
                window.location.reload();
            } else {
                this.showMessage('Error rejecting user. Please try again.', 'error');
            }
        } catch (error) {
            this.showMessage('Error rejecting user. Please try again.', 'error');
            console.error('Rejection error:', error);
        }
    }
    
    async refreshData() {
        await this.loadData();
        // Re-render using the current container
        const container = document.getElementById('moduleContent');
        if (container) this.render(container);
        this.showMessage('Data refreshed successfully!', 'success');
    }
    
    exportUsers() {
        const data = {
            active_users: this.activeUsers,
            pending_users: this.pendingUsers,
            stats: this.userStats,
            exported_at: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `family-users-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showMessage('User data exported successfully!', 'success');
    }
    
    editUser(userId) {
        this.showMessage('User editing functionality coming soon!', 'info');
    }
    
    showMessage(text, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `admin-message ${type}`;
        messageDiv.textContent = text;
        
        // Find the module content container
        const container = document.getElementById('moduleContent');
        if (container && container.firstChild) {
            container.insertBefore(messageDiv, container.firstChild);
        } else {
            // Fallback to admin modules container
            const modulesContainer = document.getElementById('adminModules');
            if (modulesContainer) {
                modulesContainer.insertBefore(messageDiv, modulesContainer.firstChild);
            }
        }
        
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

// Initialize the module
const usersAdmin = new UsersAdmin();