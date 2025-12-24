// Memorials Admin Module

class MemorialsAdmin {
    constructor() {
        this.pendingMemorials = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
    }

    async init() {
        await this.loadPendingMemorials();
        this.render();
    }

    async loadPendingMemorials() {
        try {
            const response = await fetch('/api/admin/memorials.php?action=pending');
            const data = await response.json();

            if (data.success) {
                this.pendingMemorials = data.memorials || [];
            } else {
                console.error('Failed to load pending memorials:', data.error);
                this.pendingMemorials = [];
            }
        } catch (error) {
            console.error('Error loading pending memorials:', error);
            this.pendingMemorials = [];
        }
    }

    render() {
        const content = document.getElementById('adminModuleContent');

        if (this.pendingMemorials.length === 0) {
            content.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🕊️</div>
                    <h3>No Pending Memorials</h3>
                    <p>All memorial submissions have been reviewed</p>
                </div>
            `;
            return;
        }

        content.innerHTML = `
            <div class="memorials-admin-container">
                <div class="admin-header">
                    <h2>Pending Memorial Submissions</h2>
                    <div class="count-badge">${this.pendingMemorials.length} pending</div>
                </div>

                <div class="memorials-grid">
                    ${this.pendingMemorials.map(memorial => this.renderMemorialCard(memorial)).join('')}
                </div>
            </div>
        `;
    }

    renderMemorialCard(memorial) {
        const submittedDate = new Date(memorial.submitted_at).toLocaleDateString();
        const photos = memorial.photos || [];
        const photoPreview = photos.length > 0
            ? `<img src="${photos[0].url}" alt="${memorial.name}"><div class="photo-count">${photos.length} photo${photos.length !== 1 ? 's' : ''}</div>`
            : `<div class="no-photo">🕊️</div>`;

        return `
            <div class="memorial-card" data-id="${memorial.id}">
                <div class="memorial-photo-preview">
                    ${photoPreview}
                </div>
                <div class="memorial-details">
                    <h3 class="memorial-name">${this.escapeHtml(memorial.name)}</h3>
                    <div class="memorial-dates">
                        ${memorial.birth_date ? `<span>Born: ${this.escapeHtml(memorial.birth_date)}</span>` : ''}
                        ${memorial.death_date ? `<span>Passed: ${this.escapeHtml(memorial.death_date)}</span>` : ''}
                    </div>
                    <div class="memorial-text-preview">
                        ${this.escapeHtml(memorial.memorial_text.substring(0, 150))}${memorial.memorial_text.length > 150 ? '...' : ''}
                    </div>
                    <div class="memorial-meta">
                        <span class="submitted-by">Submitted by: ${this.escapeHtml(memorial.submitted_by_name)}</span>
                        <span class="submitted-date">${submittedDate}</span>
                    </div>
                    <div class="memorial-actions">
                        <button class="btn-view" onclick="memorialsAdmin.viewMemorial(${memorial.id})">
                            👁️ View Full
                        </button>
                        <button class="btn-approve" onclick="memorialsAdmin.approveMemorial(${memorial.id})">
                            ✓ Approve
                        </button>
                        <button class="btn-reject" onclick="memorialsAdmin.rejectMemorial(${memorial.id})">
                            ✕ Reject
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    viewMemorial(id) {
        const memorial = this.pendingMemorials.find(m => m.id === id);
        if (!memorial) return;

        const photos = memorial.photos || [];
        const photoDisplay = photos.length > 0
            ? `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                ${photos.map(p => `<img src="${p.url}" alt="${memorial.name}" style="width: 100%; border-radius: 8px;">`).join('')}
            </div>`
            : '';

        showModal('Memorial Preview', `
            <div class="memorial-preview">
                ${photoDisplay}
                <h2 style="margin-bottom: 0.5rem;">${this.escapeHtml(memorial.name)}</h2>
                <div style="color: var(--text-muted); margin-bottom: 1rem;">
                    ${memorial.birth_date ? `<div>Born: ${this.escapeHtml(memorial.birth_date)}</div>` : ''}
                    ${memorial.death_date ? `<div>Passed: ${this.escapeHtml(memorial.death_date)}</div>` : ''}
                </div>
                <div style="line-height: 1.6; white-space: pre-wrap;">
                    ${this.escapeHtml(memorial.memorial_text)}
                </div>
                <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--glass-border); color: var(--text-muted); font-size: 0.9rem;">
                    Submitted by ${this.escapeHtml(memorial.submitted_by_name)} on ${new Date(memorial.submitted_at).toLocaleDateString()}
                </div>
            </div>
        `);
    }

    async approveMemorial(id) {
        if (!confirm('Approve this memorial? It will be published to the memorial page.')) {
            return;
        }

        try {
            const response = await fetch('/api/admin/memorials.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'approve',
                    id: id
                })
            });

            const result = await response.json();

            if (result.success) {
                showMessage('Memorial approved and published', 'success');
                await this.loadPendingMemorials();
                this.render();

                // Update the pending count
                if (window.loadAdminStats) {
                    window.loadAdminStats();
                }
            } else {
                showMessage(result.error || 'Failed to approve memorial', 'error');
            }
        } catch (error) {
            console.error('Error approving memorial:', error);
            showMessage('Error approving memorial', 'error');
        }
    }

    async rejectMemorial(id) {
        const notes = prompt('Rejection reason (optional - will be sent to submitter):');
        if (notes === null) return; // User cancelled

        try {
            const response = await fetch('/api/admin/memorials.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'reject',
                    id: id,
                    notes: notes
                })
            });

            const result = await response.json();

            if (result.success) {
                showMessage('Memorial rejected', 'success');
                await this.loadPendingMemorials();
                this.render();

                // Update the pending count
                if (window.loadAdminStats) {
                    window.loadAdminStats();
                }
            } else {
                showMessage(result.error || 'Failed to reject memorial', 'error');
            }
        } catch (error) {
            console.error('Error rejecting memorial:', error);
            showMessage('Error rejecting memorial', 'error');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when loaded as admin module
let memorialsAdmin;
if (typeof initializeAdminModule !== 'undefined') {
    memorialsAdmin = new MemorialsAdmin();
    memorialsAdmin.init();
}
