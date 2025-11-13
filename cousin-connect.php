<?php
require_once "config.php";
requireLogin();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cousin Connect - Reed & Weaver</title>
    <link rel="stylesheet" href="css/main.css">
</head>
<body>
    <nav class="top-nav">
        <div class="nav-wrap">
            <a href="index.php" class="logo">Reed & Weaver</a>
            <div class="nav-links">
                <a href="index.php">Home</a>
                <a href="recipes.php">Recipes</a>
                <a href="messages.php">Messages</a>
                <a href="calendar.php">Calendar</a>
                <a href="moments.php">Moments</a>
                <a href="directory.php">Directory</a>
                <a href="cousin-connect.php" class="active">Connect</a>
                <?php if (isAdmin()): ?>
                    <a href="admin.php">Admin</a>
                <?php endif; ?>
                <a href="logout.php">Logout</a>
            </div>
        </div>
    </nav>

    <main class="content-main">
        <section class="page-hero">
            <h1>Cousin Connect</h1>
            <p>Connect with family members open to engagement</p>
        </section>

        <section class="content-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h2>Your Connection Status</h2>
                <button onclick="toggleAvailability()" id="toggle-btn" class="btn secondary">
                    <span id="status-text">Set Available for Connection</span>
                </button>
            </div>
            
            <div id="your-status" class="status-card">
                <h3>Current Status: <span id="current-status">Not Available</span></h3>
                <p id="status-description">You're currently not marked as available for cousin connections. Click the button above to change your status.</p>
                
                <div class="interests-section">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
                        <h4>Your Interests</h4>
                        <button onclick="editInterests()" class="btn secondary" style="font-size: 0.9rem; padding: 0.5rem 1rem;">Edit Interests</button>
                    </div>
                    <p id="current-interests">No interests specified</p>
                </div>
            </div>
            
            <!-- Interests Edit Modal -->
            <div id="interests-modal" class="modal" style="display: none;">
                <div class="modal-content">
                    <h3>Edit Your Interests</h3>
                    <p>Select interests to help family members know what you'd like to connect about:</p>
                    <form id="interests-form">
                        <div class="interests-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; margin: 1rem 0;">
                            <label><input type="checkbox" value="family-history"> Family History</label>
                            <label><input type="checkbox" value="photos"> Photos & Memories</label>
                            <label><input type="checkbox" value="recipes"> Recipes & Cooking</label>
                            <label><input type="checkbox" value="travel"> Travel & Places</label>
                            <label><input type="checkbox" value="hobbies"> Hobbies & Crafts</label>
                            <label><input type="checkbox" value="mentoring"> Career & Mentoring</label>
                            <label><input type="checkbox" value="events"> Family Events</label>
                            <label><input type="checkbox" value="pen-pals"> Pen Pals & Chat</label>
                        </div>
                        <div class="modal-actions" style="margin-top: 1rem;">
                            <button type="submit" class="btn primary">Save Interests</button>
                            <button type="button" onclick="closeInterestsModal()" class="btn secondary">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        </section>

        <section class="content-section">
            <h2>Available Family Members</h2>
            <p style="margin-bottom: 2rem; color: var(--light-gray);">
                These family members have indicated they're open to connecting with cousins. 
                The green stamp shows they're available for outreach.
            </p>
            
            <div id="available-family" class="connect-grid">
                <!-- Available family members load here -->
            </div>
        </section>

        <section class="content-section">
            <h2>How Cousin Connect Works</h2>
            <div class="how-it-works">
                <div class="step">
                    <div class="step-number">1</div>
                    <h3>Set Your Status</h3>
                    <p>Mark yourself as available if you're open to connecting with family members</p>
                </div>
                <div class="step">
                    <div class="step-number">2</div>
                    <h3>See Who's Available</h3>
                    <p>Browse family members with the green "Available" stamp</p>
                </div>
                <div class="step">
                    <div class="step-number">3</div>
                    <h3>Send a Message</h3>
                    <p>Click "Connect" to send a message through the family message board</p>
                </div>
            </div>
        </section>

        <!-- Connection Message Modal -->
        <div id="connect-modal" class="modal">
            <div class="modal-content">
                <h3>Send Connection Message</h3>
                <form id="connect-form">
                    <input type="hidden" id="connect-to-id">
                    <p>Sending message to: <strong id="connect-to-name"></strong></p>
                    <textarea id="connect-message" placeholder="Hi! I saw you're available for cousin connections. I'd love to chat..." rows="4" required></textarea>
                    <button type="submit">Send Message</button>
                    <button type="button" onclick="closeModal()">Cancel</button>
                </form>
            </div>
        </div>
    </main>

    <footer>
        <p>Reed & Weaver Family Hub</p>
    </footer>

    <style>
        .status-card {
            background: var(--eggshell);
            padding: 1.5rem;
            border-radius: 8px;
            border-left: 4px solid var(--light-gray);
        }
        
        .status-card.available {
            border-color: #22c55e;
            background: #f0fdf4;
        }
        
        .connect-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
        }
        
        .connect-card {
            background: var(--white);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 1.5rem;
            position: relative;
            box-shadow: var(--shadow);
            transition: transform 0.3s;
        }
        
        .connect-card:hover {
            transform: translateY(-2px);
        }
        
        .available-stamp {
            position: absolute;
            top: -10px;
            right: -10px;
            background: #22c55e;
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 50px;
            font-size: 0.875rem;
            font-weight: bold;
            box-shadow: var(--shadow);
        }
        
        .connect-name {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: var(--black);
        }
        
        .connect-details {
            color: var(--light-gray);
            margin-bottom: 1rem;
        }
        
        .connect-details div {
            margin-bottom: 0.25rem;
        }
        
        .connect-actions {
            display: flex;
            gap: 0.5rem;
        }
        
        .btn-connect {
            background: #22c55e;
            color: white;
        }
        
        .btn-connect:hover {
            background: #16a34a;
        }
        
        .how-it-works {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 2rem;
            margin-top: 1.5rem;
        }
        
        .step {
            text-align: center;
        }
        
        .step-number {
            background: var(--black);
            color: var(--eggshell);
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            margin: 0 auto 1rem;
        }
        
        .step h3 {
            margin-bottom: 0.5rem;
        }
        
        .empty-state {
            text-align: center;
            padding: 3rem;
            color: var(--light-gray);
        }
        
        .empty-state h3 {
            margin-bottom: 1rem;
            color: var(--light-gray);
        }
    </style>

    <script>
        let isAvailable = false;
        let userInterests = '';
        let availableFamily = [];

        document.addEventListener('DOMContentLoaded', function() {
            loadAvailableFamily();
            loadUserStatus();
        });

        async function loadAvailableFamily() {
            try {
                const response = await fetch('/api/cousin-connect.php?action=available_family');
                const result = await response.json();
                
                if (result.success) {
                    availableFamily = result.family;
                    renderAvailableFamily();
                } else {
                    console.error('Failed to load available family:', result.error);
                }
            } catch (error) {
                console.error('Error loading available family:', error);
            }
        }
        
        function renderAvailableFamily() {
            const container = document.getElementById('available-family');
            
            if (availableFamily.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <h3>No family members are currently available</h3>
                        <p>Be the first to mark yourself as available for connections!</p>
                    </div>
                `;
            } else {
                container.innerHTML = availableFamily.map(member => `
                    <div class="connect-card">
                        <div class="available-stamp">Available</div>
                        <div class="connect-name">${member.display_name}</div>
                        <div class="connect-details">
                            <div><strong>Interests:</strong> ${member.cousin_connect_interests || 'No interests specified'}</div>
                            <div><strong>Available since:</strong> ${member.cousin_connect_since ? new Date(member.cousin_connect_since).toLocaleDateString() : 'Recently'}</div>
                        </div>
                        <div class="connect-actions">
                            <button onclick="initiateConnection(${member.id}, '${member.display_name}')" class="btn btn-connect">Connect</button>
                            <button onclick="viewProfile(${member.id})" class="btn secondary">View Profile</button>
                        </div>
                    </div>
                `).join('');
            }
        }

        async function loadUserStatus() {
            try {
                const response = await fetch('/api/cousin-connect.php?action=status');
                const result = await response.json();
                
                if (result.success && result.status) {
                    isAvailable = result.status.cousin_connect_available == 1;
                    userInterests = result.status.cousin_connect_interests || '';
                    updateStatusDisplay();
                } else {
                    console.error('Failed to load user status:', result.error);
                }
            } catch (error) {
                console.error('Error loading user status:', error);
            }
        }

        async function toggleAvailability() {
            try {
                const response = await fetch('/api/cousin-connect.php?action=toggle_availability', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        available: !isAvailable,
                        interests: userInterests
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    isAvailable = !isAvailable;
                    updateStatusDisplay();
                    showMessage(result.message, 'success');
                    console.log('Status updated:', result.updated_status);
                    loadAvailableFamily(); // Refresh the list
                } else {
                    showMessage('Failed to update status: ' + result.error, 'error');
                }
            } catch (error) {
                console.error('Error toggling availability:', error);
                showMessage('Network error - please try again', 'error');
            }
        }

        function updateStatusDisplay() {
            const statusText = document.getElementById('status-text');
            const currentStatus = document.getElementById('current-status');
            const statusDescription = document.getElementById('status-description');
            const statusCard = document.getElementById('your-status');
            const toggleBtn = document.getElementById('toggle-btn');
            
            if (isAvailable) {
                statusText.textContent = 'Set Unavailable';
                currentStatus.textContent = 'Available for Connection';
                statusDescription.textContent = 'You\'re marked as available for cousin connections. Other family members can reach out to you.';
                statusCard.classList.add('available');
                toggleBtn.classList.remove('secondary');
                toggleBtn.classList.add('btn-connect');
            } else {
                statusText.textContent = 'Set Available for Connection';
                currentStatus.textContent = 'Not Available';
                statusDescription.textContent = 'You\'re currently not marked as available for cousin connections. Click the button above to change your status.';
                statusCard.classList.remove('available');
                toggleBtn.classList.add('secondary');
                toggleBtn.classList.remove('btn-connect');
            }
            
            // Update interests display
            const currentInterests = document.getElementById('current-interests');
            if (userInterests) {
                const interestList = userInterests.split(',').map(i => i.trim()).filter(i => i).join(', ');
                currentInterests.textContent = interestList || 'No interests specified';
            } else {
                currentInterests.textContent = 'No interests specified';
            }
        }
        
        function editInterests() {
            // Pre-populate checkboxes with current interests
            const interestArray = userInterests ? userInterests.split(',').map(i => i.trim()) : [];
            const checkboxes = document.querySelectorAll('#interests-form input[type="checkbox"]');
            
            checkboxes.forEach(checkbox => {
                checkbox.checked = interestArray.includes(checkbox.value);
            });
            
            showModal('interests-modal');
        }
        
        function closeInterestsModal() {
            document.getElementById('interests-modal').style.display = 'none';
        }
        
        async function saveInterests() {
            const checkedBoxes = document.querySelectorAll('#interests-form input[type="checkbox"]:checked');
            const selectedInterests = Array.from(checkedBoxes).map(cb => cb.value).join(', ');
            
            try {
                const response = await fetch('/api/cousin-connect.php?action=toggle_availability', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        available: isAvailable,
                        interests: selectedInterests
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    userInterests = selectedInterests;
                    updateStatusDisplay();
                    closeInterestsModal();
                    showMessage('Interests updated successfully!', 'success');
                } else {
                    showMessage('Failed to update interests: ' + result.error, 'error');
                }
            } catch (error) {
                console.error('Error saving interests:', error);
                showMessage('Network error - please try again', 'error');
            }
        }

        function initiateConnection(memberId, memberName) {
            document.getElementById('connect-to-id').value = memberId;
            document.getElementById('connect-to-name').textContent = memberName;
            document.getElementById('connect-message').value = '';
            showModal('connect-modal');
        }

        function viewProfile(memberId) {
            // Could link to directory or expanded profile
            window.location.href = 'directory.php';
        }

        // Modal management
        function showModal(modalId) {
            const modal = document.getElementById(modalId);
            if (modalId === 'interests-modal') {
                modal.style.display = 'block';
            } else {
                modal.classList.add('active');
            }
        }

        function closeModal() {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('active');
                modal.style.display = 'none';
            });
        }

        // Form submission
        document.getElementById('connect-form').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const memberId = document.getElementById('connect-to-id').value;
            const memberName = document.getElementById('connect-to-name').textContent;
            const message = document.getElementById('connect-message').value;
            
            // In real app, this would post to message board with special "connection request" flag
            showMessage(`Connection message sent to ${memberName}!`, 'success');
            closeModal();
        });

        function showMessage(text, type = 'success') {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${type}`;
            messageDiv.textContent = text;
            
            document.body.insertBefore(messageDiv, document.body.firstChild);
            
            setTimeout(() => {
                messageDiv.remove();
            }, 5000);
        }
        
        // Set up interests form event listener
        document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('interests-form').addEventListener('submit', function(e) {
                e.preventDefault();
                saveInterests();
            });
        });
    </script>
</body>
</html>