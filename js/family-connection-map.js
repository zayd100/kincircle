// Family Connection Map - Interactive D3.js Visualization

class FamilyConnectionMap {
    constructor(containerId, options = {}) {
        this.container = d3.select(`#${containerId}`);
        this.width = options.width || 800;
        this.height = options.height || 600;
        this.nodes = [];
        this.links = [];
        this.simulation = null;
        
        this.init();
    }
    
    init() {
        // Create SVG container
        this.svg = this.container
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('class', 'family-connection-map');
        
        // Create zoom behavior
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                this.g.attr('transform', event.transform);
            });
        
        this.svg.call(this.zoom);
        
        // Main group for zoom/pan
        this.g = this.svg.append('g');
        
        // Create arrow markers for directed relationships
        this.createArrowMarkers();
        
        // Initialize force simulation
        this.simulation = d3.forceSimulation()
            .force('link', d3.forceLink().id(d => d.id).distance(150))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collision', d3.forceCollide().radius(40));
    }
    
    createArrowMarkers() {
        const defs = this.svg.append('defs');
        
        // Different arrow types for different relationships
        const relationshipTypes = [
            { id: 'parent', color: '#4A90E2' },
            { id: 'child', color: '#7ED321' },
            { id: 'sibling', color: '#F5A623' },
            { id: 'spouse', color: '#D0021B' }
        ];
        
        relationshipTypes.forEach(type => {
            defs.append('marker')
                .attr('id', `arrow-${type.id}`)
                .attr('viewBox', '0 -5 10 10')
                .attr('refX', 25)
                .attr('refY', 0)
                .attr('markerWidth', 6)
                .attr('markerHeight', 6)
                .attr('orient', 'auto')
                .append('path')
                .attr('d', 'M0,-5L10,0L0,5')
                .attr('fill', type.color);
        });
    }
    
    async loadConnectionData() {
        try {
            const response = await fetch('/api/family-relationships.php?action=connection_map');
            const data = await response.json();
            
            if (data.success) {
                this.nodes = data.nodes || [];
                this.links = data.edges || [];
                this.renderMap();
            }
        } catch (error) {
            console.error('Error loading connection map:', error);
            this.showError('Failed to load family connections');
        }
    }
    
    renderMap() {
        // Clear existing elements
        this.g.selectAll('*').remove();
        
        if (this.nodes.length === 0) {
            this.showEmptyState();
            return;
        }
        
        // Create links
        this.linkElements = this.g.selectAll('.link')
            .data(this.links)
            .enter()
            .append('line')
            .attr('class', 'link')
            .attr('stroke', d => this.getRelationshipColor(d.relationship))
            .attr('stroke-width', 2)
            .attr('marker-end', d => `url(#arrow-${d.relationship})`);
        
        // Create nodes
        this.nodeElements = this.g.selectAll('.node')
            .data(this.nodes)
            .enter()
            .append('g')
            .attr('class', 'node')
            .call(d3.drag()
                .on('start', this.dragStarted.bind(this))
                .on('drag', this.dragged.bind(this))
                .on('end', this.dragEnded.bind(this)));
        
        // Add circles for nodes
        this.nodeElements
            .append('circle')
            .attr('r', 25)
            .attr('fill', '#4A90E2')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);
        
        // Add labels
        this.nodeElements
            .append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '.35em')
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
            .attr('fill', 'white')
            .text(d => this.truncateName(d.name));
        
        // Add tooltips
        this.nodeElements
            .append('title')
            .text(d => d.name);
        
        // Update simulation
        this.simulation.nodes(this.nodes);
        this.simulation.force('link').links(this.links);
        this.simulation.alpha(1).restart();
        
        // Add tick handler
        this.simulation.on('tick', () => {
            this.linkElements
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            
            this.nodeElements
                .attr('transform', d => `translate(${d.x},${d.y})`);
        });
        
        // Add legend
        this.createLegend();
    }
    
    createLegend() {
        const legend = this.svg.append('g')
            .attr('class', 'legend')
            .attr('transform', 'translate(20, 20)');
        
        const relationships = [
            { type: 'parent', label: 'Parent', color: '#4A90E2' },
            { type: 'child', label: 'Child', color: '#7ED321' },
            { type: 'sibling', label: 'Sibling', color: '#F5A623' },
            { type: 'spouse', label: 'Spouse', color: '#D0021B' }
        ];
        
        const legendItems = legend.selectAll('.legend-item')
            .data(relationships)
            .enter()
            .append('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(0, ${i * 20})`);
        
        legendItems.append('line')
            .attr('x1', 0)
            .attr('x2', 15)
            .attr('y1', 0)
            .attr('y2', 0)
            .attr('stroke', d => d.color)
            .attr('stroke-width', 2);
        
        legendItems.append('text')
            .attr('x', 20)
            .attr('y', 4)
            .attr('font-size', '12px')
            .text(d => d.label);
    }
    
    getRelationshipColor(relationship) {
        const colors = {
            'parent': '#4A90E2',
            'child': '#7ED321',
            'sibling': '#F5A623',
            'spouse': '#D0021B'
        };
        return colors[relationship] || '#999';
    }
    
    truncateName(name) {
        return name.length > 10 ? name.substring(0, 8) + '...' : name;
    }
    
    showEmptyState() {
        this.g.append('text')
            .attr('x', this.width / 2)
            .attr('y', this.height / 2)
            .attr('text-anchor', 'middle')
            .attr('font-size', '18px')
            .attr('fill', '#666')
            .text('No family connections yet');
        
        this.g.append('text')
            .attr('x', this.width / 2)
            .attr('y', this.height / 2 + 30)
            .attr('text-anchor', 'middle')
            .attr('font-size', '14px')
            .attr('fill', '#999')
            .text('Start claiming relationships to build your family map');
    }
    
    showError(message) {
        this.g.append('text')
            .attr('x', this.width / 2)
            .attr('y', this.height / 2)
            .attr('text-anchor', 'middle')
            .attr('font-size', '16px')
            .attr('fill', '#D0021B')
            .text(message);
    }
    
    // Drag behavior
    dragStarted(event, d) {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }
    
    dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }
    
    dragEnded(event, d) {
        if (!event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
    
    // Public methods
    refresh() {
        this.loadConnectionData();
    }
    
    centerOnNode(nodeId) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (node) {
            const transform = d3.zoomIdentity
                .translate(this.width / 2 - node.x, this.height / 2 - node.y)
                .scale(1);
            
            this.svg.transition()
                .duration(750)
                .call(this.zoom.transform, transform);
        }
    }
    
    highlightConnections(nodeId) {
        // Highlight all connections to/from a specific node
        this.nodeElements
            .style('opacity', d => d.id === nodeId ? 1 : 0.3);
        
        this.linkElements
            .style('opacity', d => d.source.id === nodeId || d.target.id === nodeId ? 1 : 0.1);
    }
    
    resetHighlight() {
        this.nodeElements.style('opacity', 1);
        this.linkElements.style('opacity', 1);
    }
}

// Relationship Management Interface
class RelationshipManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.availableUsers = [];
        this.myRelationships = [];
        
        this.init();
    }
    
    async init() {
        await this.loadAvailableUsers();
        await this.loadMyRelationships();
        this.render();
    }
    
    async loadAvailableUsers() {
        try {
            // Get all users who could be claimed as relatives
            const response = await fetch('/api/family/members.php');
            const data = await response.json();
            
            if (data.success) {
                this.availableUsers = data.members || [];
            }
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }
    
    async loadMyRelationships() {
        try {
            const response = await fetch('/api/family-relationships.php?action=my_relationships');
            const data = await response.json();
            
            if (data.success) {
                this.myRelationships = data.relationships || [];
            }
        } catch (error) {
            console.error('Error loading relationships:', error);
        }
    }
    
    render() {
        this.container.innerHTML = `
            <div class="relationship-manager">
                <div class="relationship-tabs">
                    <button class="tab-btn active" data-tab="claim">Claim Relationships</button>
                    <button class="tab-btn" data-tab="manage">Manage Claims</button>
                    <button class="tab-btn" data-tab="claims-about-me">Claims About Me</button>
                </div>
                
                <div class="tab-content">
                    <div id="claim-tab" class="tab-pane active">
                        ${this.renderClaimInterface()}
                    </div>
                    <div id="manage-tab" class="tab-pane">
                        ${this.renderManageInterface()}
                    </div>
                    <div id="claims-about-me-tab" class="tab-pane">
                        ${this.renderClaimsAboutMeInterface()}
                    </div>
                </div>
            </div>
        `;
        
        this.setupEventListeners();
    }
    
    renderClaimInterface() {
        return `
            <div class="claim-relationship">
                <h3>Claim Family Relationships</h3>
                <p>Claim direct relationships with family members. They can accept or decline.</p>
                
                <div class="claim-form">
                    <div class="form-group">
                        <label>Select Person:</label>
                        <select id="claimPersonSelect" class="form-select">
                            <option value="">Choose a family member...</option>
                            ${this.availableUsers.map(user => 
                                `<option value="${user.id}">${user.display_name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Relationship:</label>
                        <select id="claimRelationshipSelect" class="form-select">
                            <option value="">Choose relationship...</option>
                            <option value="parent">They are my parent</option>
                            <option value="child">They are my child</option>
                            <option value="sibling">They are my sibling</option>
                            <option value="spouse">They are my spouse</option>
                        </select>
                    </div>
                    
                    <button id="claimRelationshipBtn" class="btn btn-primary" disabled>
                        Claim Relationship
                    </button>
                </div>
            </div>
        `;
    }
    
    renderManageInterface() {
        if (this.myRelationships.length === 0) {
            return `
                <div class="empty-state">
                    <h3>No Relationships Claimed</h3>
                    <p>You haven't claimed any relationships yet.</p>
                </div>
            `;
        }
        
        return `
            <div class="manage-relationships">
                <h3>Your Claimed Relationships</h3>
                <div class="relationships-list">
                    ${this.myRelationships.map(rel => this.renderRelationshipCard(rel)).join('')}
                </div>
            </div>
        `;
    }
    
    renderRelationshipCard(relationship) {
        const status = relationship.active ? 'active' : 'revoked';
        
        return `
            <div class="relationship-card ${status}">
                <div class="relationship-info">
                    <h4>${relationship.other_person_name}</h4>
                    <span class="relationship-type">${this.formatRelationship(relationship.relationship)}</span>
                    <span class="relationship-date">Claimed ${this.formatDate(relationship.created_at)}</span>
                </div>
                <div class="relationship-status">
                    ${relationship.active ? 
                        '<span class="status-badge active">Active</span>' :
                        '<span class="status-badge revoked">Revoked</span>'
                    }
                </div>
            </div>
        `;
    }
    
    renderClaimsAboutMeInterface() {
        return `
            <div class="claims-about-me">
                <h3>Claims Made About You</h3>
                <p>Other family members have claimed these relationships with you:</p>
                <div id="claimsAboutMeList">
                    Loading...
                </div>
            </div>
        `;
    }
    
    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });
        
        // Claim form validation
        const personSelect = document.getElementById('claimPersonSelect');
        const relationshipSelect = document.getElementById('claimRelationshipSelect');
        const claimBtn = document.getElementById('claimRelationshipBtn');
        
        [personSelect, relationshipSelect].forEach(select => {
            select.addEventListener('change', () => {
                claimBtn.disabled = !personSelect.value || !relationshipSelect.value;
            });
        });
        
        // Claim relationship button
        claimBtn.addEventListener('click', () => {
            this.claimRelationship(personSelect.value, relationshipSelect.value);
        });
    }
    
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update tab panes
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `${tabName}-tab`);
        });
        
        // Load data for specific tabs
        if (tabName === 'claims-about-me') {
            this.loadClaimsAboutMe();
        }
    }
    
    async claimRelationship(personId, relationship) {
        try {
            const response = await fetch('/api/family-relationships.php?action=claim_relationship', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    claimed_user_id: parseInt(personId),
                    relationship: relationship
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('Relationship claimed successfully!');
                this.loadMyRelationships();
                this.render();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error claiming relationship:', error);
            alert('Failed to claim relationship');
        }
    }
    
    async loadClaimsAboutMe() {
        try {
            const response = await fetch('/api/family-relationships.php?action=claims_about_me');
            const data = await response.json();
            
            const container = document.getElementById('claimsAboutMeList');
            
            if (data.success && data.claims.length > 0) {
                container.innerHTML = data.claims.map(claim => `
                    <div class="claim-card">
                        <div class="claim-info">
                            <strong>${claim.claimer_name}</strong> claims you as their <strong>${this.formatRelationship(claim.relationship)}</strong>
                            <span class="claim-date">${this.formatDate(claim.created_at)}</span>
                        </div>
                        <button class="btn btn-danger btn-sm" onclick="relationshipManager.revokeClaim(${claim.id})">
                            Revoke
                        </button>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<p>No claims have been made about you.</p>';
            }
        } catch (error) {
            console.error('Error loading claims:', error);
        }
    }
    
    async revokeClaim(relationshipId) {
        if (!confirm('Are you sure you want to revoke this relationship claim?')) return;
        
        try {
            const response = await fetch('/api/family-relationships.php?action=revoke_relationship', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ relationship_id: relationshipId })
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('Relationship revoked successfully');
                this.loadClaimsAboutMe();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error revoking claim:', error);
            alert('Failed to revoke relationship');
        }
    }
    
    formatRelationship(relationship) {
        const formats = {
            'parent': 'Parent',
            'child': 'Child',
            'sibling': 'Sibling',
            'spouse': 'Spouse'
        };
        return formats[relationship] || relationship;
    }
    
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString();
    }
}

// Export classes
window.FamilyConnectionMap = FamilyConnectionMap;
window.RelationshipManager = RelationshipManager;