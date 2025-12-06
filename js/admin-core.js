// Admin Dashboard Core - Module Loader

class AdminCore {
    constructor() {
        this.modules = [];
        this.activeModule = null;
        this.stats = {};
        this.loadedScripts = new Set();
        
        // Make adminCore globally available immediately
        window.adminCore = this;
        
        this.init();
    }
    
    async init() {
        await this.loadModules();
        // Give modules time to register
        setTimeout(() => {
            this.renderDashboard();
        }, 500);
    }
    
    async loadModules() {
        // Define available modules
        const moduleConfigs = [
            {
                name: 'photos',
                title: 'Photo Moderation',
                icon: '📸',
                path: 'js/photos-admin.js',
                priority: 1
            },
            {
                name: 'messages',
                title: 'Message Moderation',
                icon: '💬',
                path: 'js/messages-admin.js',
                priority: 2
            },
            {
                name: 'calendar',
                title: 'Calendar Events',
                icon: '📅',
                path: 'js/calendar-admin.js',
                priority: 3
            },
            {
                name: 'media',
                title: 'Media Management',
                icon: '🎬',
                path: 'js/media-admin.js?v=' + Date.now(),
                priority: 4
            },
            {
                name: 'events',
                title: 'Events Management',
                icon: '🎉',
                path: 'js/events-admin.js',
                priority: 5
            },
            {
                name: 'recipes',
                title: 'Recipe Management',
                icon: '🍝',
                path: 'js/recipes-admin.js',
                priority: 6
            },
            {
                name: 'users',
                title: 'User Management',
                icon: '👥',
                path: 'js/users-admin.js',
                priority: 7
            }
        ];
        
        // Load modules in priority order
        for (const config of moduleConfigs.sort((a, b) => a.priority - b.priority)) {
            try {
                await this.loadModule(config);
                // Give each module time to register
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.warn(`Failed to load module ${config.name}:`, error);
                // Create placeholder for missing modules
                this.modules.push({
                    ...config,
                    loaded: false,
                    error: error.message
                });
            }
        }
    }
    
    async loadModule(config) {
        // Skip if already loaded
        if (this.loadedScripts.has(config.path)) {
            return;
        }
        
        try {
            // Dynamically import module
            const moduleScript = document.createElement('script');
            moduleScript.src = config.path;
            
            return new Promise((resolve, reject) => {
                moduleScript.onload = () => {
                    this.loadedScripts.add(config.path);
                    console.log(`✅ Loaded module: ${config.name}`);
                    resolve();
                };
                moduleScript.onerror = () => {
                    reject(new Error(`Failed to load script: ${config.path}`));
                };
                document.head.appendChild(moduleScript);
            });
        } catch (error) {
            throw new Error(`Module load error: ${error.message}`);
        }
    }
    
    registerModule(moduleInstance) {
        // Called by modules to register themselves
        console.log(`📝 Registering module: ${moduleInstance.name}`);
        
        // Remove any existing module with same name
        this.modules = this.modules.filter(m => m.name !== moduleInstance.name);
        
        this.modules.push({
            ...moduleInstance,
            loaded: true
        });
        
        // If this is the first module or has highest priority, make it active
        if (!this.activeModule || moduleInstance.priority < this.activeModule.priority) {
            this.activeModule = moduleInstance;
        }
        
        console.log(`✅ Module registered: ${moduleInstance.name} (${this.modules.length} total)`);
    }
    
    async renderDashboard() {
        this.renderModuleNavigation();
        this.renderActiveModule();
        // Don't render stats on initial load - PHP already provides accurate counts
        // Stats will be refreshed when modules load data or after actions
    }

    async refreshStats() {
        await this.renderStats();
    }
    
    async renderStats() {
        const statsContainer = document.getElementById('adminStats');
        if (!statsContainer) return;

        // Try to get actual stats from modules
        for (const module of this.modules.filter(m => m.loaded)) {
            try {
                if (module.getStats) {
                    const moduleStats = await module.getStats();

                    // Update stat cards with module data
                    if (Array.isArray(moduleStats)) {
                        moduleStats.forEach(stat => {
                            // Only update if we have a valid value (including 0, but not undefined or null)
                            if (stat.value !== undefined && stat.value !== null && typeof stat.value === 'number') {
                                // Find the matching stat card
                                let card = null;

                                // Try to match by label
                                if (stat.label.toLowerCase().includes('photo') && !stat.label.toLowerCase().includes('media')) {
                                    card = statsContainer.querySelector('.stat-card.pending .stat-number');
                                } else if (stat.label.toLowerCase().includes('media')) {
                                    card = statsContainer.querySelector('.stat-card.media .stat-number');
                                } else if (stat.label.toLowerCase().includes('memorial')) {
                                    card = statsContainer.querySelector('.stat-card.memorials .stat-number');
                                } else if (stat.label.toLowerCase().includes('report')) {
                                    card = statsContainer.querySelector('.stat-card.reports .stat-number');
                                } else if (stat.label.toLowerCase().includes('user')) {
                                    card = statsContainer.querySelector('.stat-card.users .stat-number');
                                } else if (stat.label.toLowerCase().includes('event')) {
                                    card = statsContainer.querySelector('.stat-card.events .stat-number');
                                }

                                // Update the card if found
                                if (card) {
                                    card.textContent = stat.value;
                                }
                            }
                        });
                    }
                }
            } catch (error) {
                console.warn(`Error getting stats from ${module.name}:`, error);
            }
        }
    }
    
    renderModuleNavigation() {
        const modulesContainer = document.getElementById('adminModules');
        
        if (this.modules.length === 0) {
            modulesContainer.innerHTML = `
                <div class="loading-state">
                    <h3>Loading admin modules...</h3>
                    <p>Please wait while we load the moderation tools.</p>
                </div>
            `;
            return;
        }
        
        const navHtml = `
            <div class="module-tabs">
                ${this.modules.map(module => `
                    <button class="module-tab ${module.name === this.activeModule?.name ? 'active' : ''} ${!module.loaded ? 'disabled' : ''}" 
                            onclick="adminCore.switchModule('${module.name}')"
                            ${!module.loaded ? 'disabled' : ''}>
                        <span class="module-icon">${module.icon}</span>
                        <span class="module-title">${module.title}</span>
                        ${!module.loaded ? '<span class="module-error">⚠️</span>' : ''}
                    </button>
                `).join('')}
            </div>
            <div class="module-content" id="moduleContent">
                <!-- Active module content will be rendered here -->
            </div>
        `;
        
        modulesContainer.innerHTML = navHtml;
    }
    
    async switchModule(moduleName) {
        const module = this.modules.find(m => m.name === moduleName);
        
        if (!module || !module.loaded) {
            this.showMessage(`Module "${moduleName}" not available`, 'error');
            return;
        }
        
        console.log(`🔄 Switching to module: ${moduleName}`);
        
        // Update active module
        this.activeModule = module;
        
        // Update tab appearance
        document.querySelectorAll('.module-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        const activeTab = document.querySelector(`[onclick*="${moduleName}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        // Render module content
        await this.renderActiveModule();
    }
    
    async renderActiveModule() {
        const contentContainer = document.getElementById('moduleContent');
        
        if (!this.activeModule || !this.activeModule.loaded) {
            contentContainer.innerHTML = `
                <div class="module-placeholder">
                    <h3>No module selected</h3>
                    <p>Select a module from the tabs above to start moderating content.</p>
                </div>
            `;
            return;
        }
        
        console.log(`📦 Rendering module: ${this.activeModule.name}`);
        
        try {
            if (this.activeModule.render) {
                await this.activeModule.render(contentContainer);
                console.log(`✅ Module rendered: ${this.activeModule.name}`);
            } else {
                contentContainer.innerHTML = `
                    <div class="module-placeholder">
                        <h3>${this.activeModule.title}</h3>
                        <p>Module loaded but no render function available</p>
                        <p>This usually means the module needs to be updated to work with the admin core.</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error(`Error rendering module ${this.activeModule.name}:`, error);
            contentContainer.innerHTML = `
                <div class="module-error">
                    <h3>⚠️ Module Error</h3>
                    <p>Failed to render ${this.activeModule.title}</p>
                    <details>
                        <summary>Error Details</summary>
                        <pre>${error.message}</pre>
                    </details>
                </div>
            `;
        }
    }
    
    showMessage(text, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `admin-message ${type}`;
        messageDiv.textContent = text;
        messageDiv.style.cssText = `
            position: fixed;
            top: 5rem;
            right: 2rem;
            background: var(--glass-bg);
            backdrop-filter: var(--glass-backdrop);
            border: 2px solid ${type === 'error' ? '#ef4444' : type === 'success' ? '#22c55e' : 'var(--primary)'};
            color: ${type === 'error' ? '#dc2626' : type === 'success' ? '#059669' : 'var(--primary)'};
            padding: 1rem 1.5rem;
            border-radius: var(--radius-lg);
            box-shadow: var(--glass-shadow-hover);
            z-index: 9999;
            animation: slideIn 0.3s ease;
            font-weight: 600;
            font-size: 0.9rem;
            max-width: 350px;
            word-wrap: break-word;
        `;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

// Global admin core instance
let adminCore;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    adminCore = new AdminCore();
});

// Add slide-in animation
const style = document.createElement('style');
style.textContent = `
    .admin-stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 2rem;
        margin-bottom: 3rem;
    }
    
    .module-tabs {
        display: flex;
        flex-wrap: wrap;
        border-bottom: 2px solid var(--border);
        margin-bottom: 2rem;
        gap: 0.5rem;
    }
    
    .module-tab {
        background: none;
        border: none;
        padding: 1rem 2rem;
        font-size: 1rem;
        font-weight: 600;
        color: var(--light-gray);
        cursor: pointer;
        border-bottom: 3px solid transparent;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        border-radius: 8px 8px 0 0;
    }
    
    .module-tab:hover:not(.disabled) {
        color: var(--black);
        background: var(--eggshell);
    }
    
    .module-tab.active {
        color: var(--black);
        border-bottom-color: var(--black);
        background: var(--white);
    }
    
    .module-tab.disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    .module-error {
        color: #dc2626;
        font-size: 0.8rem;
    }
    
    .module-content {
        min-height: 400px;
    }
    
    .module-placeholder,
    .module-error {
        text-align: center;
        padding: 3rem;
        color: var(--light-gray);
    }
    
    .module-error {
        background: #fef2f2;
        border-radius: 8px;
        color: #991b1b;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);