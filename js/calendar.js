// Family Time Machine Calendar - Where memories meet the future
// A masterpiece of interactive calendar design

class FamilyTimeMachine {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = null;
        this.selectedEventType = 'other';
        this.events = {};
        this.hoverTimeout = null;
        this.isAnimating = false;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadCalendar();
        this.updateTimeNavigation();
        
        // Load events from database
        this.loadEvents();
        
        // Beautiful entrance animation
        setTimeout(() => {
            this.showCalendar();
        }, 1000);
    }

    async loadEvents() {
        try {
            // Use PHP data if available, otherwise initialize empty calendar
            if (window.calendarData) {
                console.log('Loading calendar data:', window.calendarData);
                
                // Initialize with empty data if no events
                this.events = {};
                this.userCommitments = window.calendarData.userCommitments || [];
                this.commitmentCounts = window.calendarData.commitmentCounts || {};
                
                if (window.calendarData.events && window.calendarData.events.length > 0) {
            this.events = {};
            this.userCommitments = window.calendarData.userCommitments || [];
            this.commitmentCounts = window.calendarData.commitmentCounts || {};
            
            window.calendarData.events.forEach(event => {
                const dateKey = event.event_date;
                if (!this.events[dateKey]) {
                    this.events[dateKey] = [];
                }
                
                this.events[dateKey].push({
                        id: event.id,
                        title: event.title,
                        type: event.event_type || event.type || 'other',
                        description: event.description || '',
                        status: event.status || 'approved'
                    });
                });
                
                }
                
                // Always refresh the calendar display (with or without events)
                this.loadCalendar();
            } else {
                console.warn('No calendar data available, using empty calendar');
                this.events = {};
                this.userCommitments = [];
                this.commitmentCounts = {};
                this.loadCalendar();
            }
        } catch (error) {
            console.error('Failed to load events from database:', error);
            this.showMessage('Failed to load events. Please refresh the page.', 'error');
            
            // Keep events as empty object for fallback
            this.events = {};
        }
    }
    
    
    setupEventListeners() {
        // Time navigation
        document.getElementById('prevYear').addEventListener('click', () => this.navigateYear(-1));
        document.getElementById('nextYear').addEventListener('click', () => this.navigateYear(1));
        document.getElementById('prevMonth').addEventListener('click', () => this.navigateMonth(-1));
        document.getElementById('nextMonth').addEventListener('click', () => this.navigateMonth(1));
        document.getElementById('todayButton').addEventListener('click', () => this.goToToday());
        
        // Decade navigation
        document.querySelectorAll('.decade-button').forEach(button => {
            button.addEventListener('click', (e) => this.jumpToDecade(e.target.dataset.decade));
        });
        
        // Event type selection in modal
        document.querySelectorAll('.event-type-option').forEach(option => {
            option.addEventListener('click', (e) => this.selectEventType(e.target.dataset.type));
        });
        
        // Modal close on background click
        document.getElementById('dayModal').addEventListener('click', (e) => {
            if (e.target.id === 'dayModal') {
                this.closeDayModal();
            }
        });
        
        // Close button click - unified system handles this automatically
        const closeButton = document.getElementById('closeModal');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.closeDayModal();
            });
        }
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }
    
    showCalendar() {
        const grid = document.getElementById('calendarGrid');
        
        grid.style.display = 'grid';
        grid.style.opacity = '0';
        grid.style.transform = 'translateY(20px)';
        
        // Reveal calendar with beautiful animation
        setTimeout(() => {
            grid.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            grid.style.opacity = '1';
            grid.style.transform = 'translateY(0)';
            
            // Animate calendar days in sequence
            this.animateCalendarDays();
        }, 50);
    }
    
    animateCalendarDays() {
        const days = document.querySelectorAll('.calendar-day:not(.calendar-header-day)');
        days.forEach((day, index) => {
            day.style.opacity = '0';
            day.style.transform = 'scale(0.8)';
            day.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            
            setTimeout(() => {
                day.style.opacity = '1';
                day.style.transform = 'scale(1)';
            }, index * 30);
        });
    }
    
    loadCalendar() {
        const grid = document.getElementById('calendarGrid');
        grid.innerHTML = '';
        
        // Add day headers
        const dayHeaders = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        dayHeaders.forEach(day => {
            const header = document.createElement('div');
            header.className = 'calendar-header-day';
            header.textContent = day;
            grid.appendChild(header);
        });
        
        // Get calendar data
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();
        
        // Previous month overflow days
        const prevMonth = new Date(year, month - 1, 0);
        const prevMonthDays = prevMonth.getDate();
        
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const day = prevMonthDays - i;
            const dayElement = this.createDayElement(
                new Date(year, month - 1, day), 
                day, 
                true // other month
            );
            grid.appendChild(dayElement);
        }
        
        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = this.createDayElement(
                new Date(year, month, day), 
                day, 
                false
            );
            grid.appendChild(dayElement);
        }
        
        // Next month overflow days
        const totalCells = grid.children.length - 7; // Subtract headers
        const remainingCells = 42 - totalCells; // 6 rows × 7 days
        
        for (let day = 1; day <= remainingCells; day++) {
            const dayElement = this.createDayElement(
                new Date(year, month + 1, day), 
                day, 
                true // other month
            );
            grid.appendChild(dayElement);
        }
    }
    
    createDayElement(date, dayNumber, isOtherMonth) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        if (isOtherMonth) {
            dayElement.classList.add('other-month');
        }
        
        // Check if this is today
        const today = new Date();
        if (date.toDateString() === today.toDateString()) {
            dayElement.classList.add('today');
        }
        
        const dateString = this.formatDateKey(date);
        const dayEvents = this.events[dateString] || [];
        
        // Create day structure
        dayElement.innerHTML = `
            <div class="day-number">${dayNumber}</div>
            <div class="day-events" id="events-${dateString}">
                ${this.renderDayEvents(dayEvents)}
            </div>
            ${dayEvents.length > 0 ? '<div class="memory-badge"></div>' : ''}
        `;
        
        // Add event listeners
        dayElement.addEventListener('click', () => this.openDayModal(date));
        // Hover effects disabled to prevent flicker issue
        // this.setupHoverEffects(dayElement, date);
        
        return dayElement;
    }
    
    renderDayEvents(events) {
        if (events.length === 0) return '';
        
        const maxVisible = 3;
        const visibleEvents = events.slice(0, maxVisible);
        const hiddenCount = events.length - maxVisible;
        
        let html = visibleEvents.map(event => {
            const emoji = this.getEventEmoji(event.type);
            return `<div class="event-indicator event-${event.type}" title="${event.title}">
                ${emoji} ${event.title}
            </div>`;
        }).join('');
        
        if (hiddenCount > 0) {
            html += `<div class="event-overflow">+${hiddenCount} more</div>`;
        }
        
        return html;
    }
    
    // Hover content previews removed - clean calendar implementation
    
    openDayModal(date) {
        this.selectedDate = date;
        const dateString = this.formatDateKey(date);
        const events = this.events[dateString] || [];
        
        // Update modal content
        document.getElementById('modalDate').textContent = date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        document.getElementById('modalDayName').textContent = date.toLocaleDateString('en-US', { 
            weekday: 'long' 
        });
        
        // Render events with "Go to Event" buttons
        const eventsContainer = document.getElementById('modalEvents');
        if (events.length > 0) {
            eventsContainer.innerHTML = `
                <h3>Events on this day:</h3>
                ${events.map(event => `
                    <div class="modal-event">
                        <div class="modal-event-icon">${this.getEventEmoji(event.type)}</div>
                        <div class="modal-event-content">
                            <h3>${event.title}</h3>
                            <p>${event.description || 'No description available'}</p>
                            <div class="event-actions">
                                <button class="btn btn-primary" onclick="familyCalendar.goToEvent('${event.id}')">
                                    🎉 Go to Event
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            `;
        } else {
            eventsContainer.innerHTML = '<h3>No events on this day</h3><p>Add the first event below!</p>';
        }
        
        // Clear form
        this.clearEventForm();
        
        // Show modal using unified system
        if (window.unifiedModal) {
            window.unifiedModal.open('dayModal', {
                focusElement: '#eventTitle'
            });
        } else {
            // Fallback for immediate loading
            const modal = document.getElementById('dayModal');
            modal.classList.add('active');
            setTimeout(() => {
                document.getElementById('eventTitle').focus();
            }, 300);
        }
    }
    
    closeDayModal() {
        if (window.unifiedModal) {
            window.unifiedModal.close('dayModal');
        } else {
            // Fallback
            const modal = document.getElementById('dayModal');
            modal.classList.remove('active');
        }
        this.selectedDate = null;
    }
    
    goToEvent(eventId) {
        // Navigate to events page with the specific event
        window.location.href = `events.php?event=${eventId}`;
    }
    
    selectEventType(type) {
        // MORIARTY DEFENSE: Null safety for missing DOM elements
        document.querySelectorAll('.event-type-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        const targetElement = document.querySelector(`[data-type="${type}"]`);
        if (targetElement) {
            targetElement.classList.add('selected');
        }
        
        this.selectedEventType = type;
        const eventTypeSelect = document.getElementById('eventType');
        if (eventTypeSelect) {
            eventTypeSelect.value = type;
        }
    }
    
    clearEventForm() {
        document.getElementById('eventTitle').value = '';
        document.getElementById('eventDescription').value = '';
        document.getElementById('eventRecurring').value = 'none';
        this.selectEventType('other');
    }
    
    async submitEvent() {
        const title = document.getElementById('eventTitle').value.trim();
        const description = document.getElementById('eventDescription').value.trim();
        const recurring = document.getElementById('eventRecurring').value;
        
        if (!title) {
            this.showMessage('Please enter an event title', 'error');
            return;
        }
        
        // Use selected date or fall back to today
        let dateToUse = this.selectedDate;
        
        // If no date is selected, check if there's a date input field
        const dateInput = document.getElementById('eventDate');
        if (!dateToUse && dateInput && dateInput.value) {
            dateToUse = new Date(dateInput.value);
        }
        
        // Final fallback to today
        if (!dateToUse) {
            dateToUse = new Date();
            this.showMessage('No date selected, using today\'s date', 'warning');
        }
        
        const eventData = {
            title: title,
            date: this.formatDateKey(dateToUse),
            description: description
        };
        
        try {
            // Show loading state
            const submitBtn = document.querySelector('.btn-primary');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Submitting...';
            submitBtn.disabled = true;
            
            const response = await fetch('/api/calendar.php?action=add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(eventData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showMessage('Event submitted for review! ✨', 'success');
                this.closeDayModal();
                
                // Add to local events for immediate feedback
                const dateString = this.formatDateKey(dateToUse);
                if (!this.events[dateString]) {
                    this.events[dateString] = [];
                }
                this.events[dateString].push({
                    title: title,
                    type: this.selectedEventType,
                    description: description,
                    status: 'pending'
                });
                
                // Refresh the calendar day
                this.refreshCalendarDay(dateToUse);
            } else {
                this.showMessage(result.error || 'Submission failed', 'error');
            }
            
            // Restore button
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            
        } catch (error) {
            console.error('Submission error:', error);
            this.showMessage('Network error during submission', 'error');
        }
    }
    
    refreshCalendarDay(date) {
        const dateString = this.formatDateKey(date);
        const eventsContainer = document.getElementById(`events-${dateString}`);
        
        if (eventsContainer) {
            const events = this.events[dateString] || [];
            eventsContainer.innerHTML = this.renderDayEvents(events);
            
            // Add subtle animation to show the change
            eventsContainer.style.transform = 'scale(1.05)';
            eventsContainer.style.transition = 'transform 0.3s ease';
            
            setTimeout(() => {
                eventsContainer.style.transform = 'scale(1)';
            }, 300);
        }
    }
    
    navigateMonth(direction) {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        this.updateTimeNavigation();
        
        // Smooth transition animation
        const grid = document.getElementById('calendarGrid');
        grid.style.transform = `translateX(${direction > 0 ? '-' : ''}20px)`;
        grid.style.opacity = '0.7';
        
        setTimeout(() => {
            this.loadCalendar();
            
            grid.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            grid.style.transform = 'translateX(0)';
            grid.style.opacity = '1';
            
            setTimeout(() => {
                grid.style.transition = '';
                this.isAnimating = false;
                this.animateCalendarDays();
            }, 400);
        }, 200);
    }
    
    navigateYear(direction) {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        this.currentDate.setFullYear(this.currentDate.getFullYear() + direction);
        this.updateTimeNavigation();
        this.updateDecadeSelection();
        
        // Dramatic year transition
        const grid = document.getElementById('calendarGrid');
        grid.style.transform = `scale(0.95) translateY(${direction > 0 ? '-' : ''}30px)`;
        grid.style.opacity = '0.5';
        
        setTimeout(() => {
            this.loadCalendar();
            
            grid.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            grid.style.transform = 'scale(1) translateY(0)';
            grid.style.opacity = '1';
            
            setTimeout(() => {
                grid.style.transition = '';
                this.isAnimating = false;
                this.animateCalendarDays();
            }, 600);
        }, 300);
    }
    
    jumpToDecade(decade) {
        if (this.isAnimating) return;
        
        const targetYear = parseInt(decade);
        if (targetYear === Math.floor(this.currentDate.getFullYear() / 10) * 10) return;
        
        this.isAnimating = true;
        this.currentDate.setFullYear(targetYear);
        this.updateTimeNavigation();
        this.updateDecadeSelection();
        
        // Epic time travel animation
        const grid = document.getElementById('calendarGrid');
        const container = document.querySelector('.calendar-container');
        
        // Create time warp effect
        container.style.transform = 'perspective(1000px) rotateY(10deg) scale(0.9)';
        container.style.filter = 'blur(2px)';
        grid.style.opacity = '0.3';
        
        setTimeout(() => {
            this.loadCalendar();
            
            container.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            container.style.transform = 'perspective(1000px) rotateY(0deg) scale(1)';
            container.style.filter = 'blur(0px)';
            grid.style.transition = 'opacity 0.8s ease';
            grid.style.opacity = '1';
            
            setTimeout(() => {
                container.style.transition = '';
                container.style.transform = '';
                container.style.filter = '';
                grid.style.transition = '';
                this.isAnimating = false;
                this.animateCalendarDays();
            }, 800);
        }, 400);
    }
    
    goToToday() {
        if (this.isAnimating) return;
        
        const today = new Date();
        const wasCurrentMonth = this.currentDate.getMonth() === today.getMonth() && 
                               this.currentDate.getFullYear() === today.getFullYear();
        
        if (wasCurrentMonth) {
            // Just highlight today with a pulse
            const todayElement = document.querySelector('.today');
            if (todayElement) {
                todayElement.style.animation = 'none';
                setTimeout(() => {
                    todayElement.style.animation = 'todayPulse 1s ease-in-out 3';
                }, 10);
            }
            return;
        }
        
        this.currentDate = new Date(today);
        this.updateTimeNavigation();
        this.updateDecadeSelection();
        
        // Magical "return home" animation
        this.isAnimating = true;
        const grid = document.getElementById('calendarGrid');
        
        grid.style.transform = 'scale(1.1)';
        grid.style.filter = 'brightness(1.2)';
        grid.style.opacity = '0.8';
        
        setTimeout(() => {
            this.loadCalendar();
            
            grid.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            grid.style.transform = 'scale(1)';
            grid.style.filter = 'brightness(1)';
            grid.style.opacity = '1';
            
            setTimeout(() => {
                grid.style.transition = '';
                this.isAnimating = false;
                this.animateCalendarDays();
            }, 600);
        }, 200);
    }
    
    updateTimeNavigation() {
        const currentPeriod = document.getElementById('currentPeriod');
        currentPeriod.textContent = this.currentDate.toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
        });
    }
    
    updateDecadeSelection() {
        const currentDecade = Math.floor(this.currentDate.getFullYear() / 10) * 10;
        
        document.querySelectorAll('.decade-button').forEach(button => {
            button.classList.remove('active');
            if (parseInt(button.dataset.decade) === currentDecade) {
                button.classList.add('active');
            }
        });
    }
    
    handleKeyboard(e) {
        if (document.getElementById('dayModal').classList.contains('active')) {
            if (e.key === 'Escape') {
                this.closeDayModal();
            }
            return;
        }
        
        switch (e.key) {
            case 'ArrowLeft':
                this.navigateMonth(-1);
                break;
            case 'ArrowRight':
                this.navigateMonth(1);
                break;
            case 'ArrowUp':
                this.navigateYear(-1);
                break;
            case 'ArrowDown':
                this.navigateYear(1);
                break;
            case 'Home':
                this.goToToday();
                break;
        }
    }
    
    getEventEmoji(type) {
        const emojiMap = {
            birthday: '🎂',
            anniversary: '💍',
            reunion: '👨‍👩‍👧‍👦',
            holiday: '🎉',
            gathering: '🏠',
            other: '📅'
        };
        return emojiMap[type] || '📅';
    }

    // Parse a YYYY-MM-DD date string as LOCAL time (not UTC)
    // This prevents the off-by-one-day bug in western time zones
    parseLocalDate(dateStr) {
        if (!dateStr) return new Date();
        // If it's already a Date object, return it
        if (dateStr instanceof Date) return dateStr;
        // If it includes time info, parse normally
        if (dateStr.includes('T') || dateStr.includes(' ')) {
            return new Date(dateStr);
        }
        // For date-only strings like "2025-12-05", parse as local midnight
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    }

    formatDateKey(date) {
        if (!date) {
            console.error('formatDateKey called with null/undefined date');
            return new Date().toISOString().split('T')[0]; // Return today's date as fallback
        }
        return date.getFullYear() + '-' + 
               String(date.getMonth() + 1).padStart(2, '0') + '-' + 
               String(date.getDate()).padStart(2, '0');
    }
    
    showMessage(text, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = text;
        messageDiv.style.cssText = `
            position: fixed;
            top: 2rem;
            right: 2rem;
            background: ${type === 'error' ? '#fee2e2' : type === 'success' ? '#f0fdf4' : '#f0f9ff'};
            color: ${type === 'error' ? '#991b1b' : type === 'success' ? '#166534' : '#1e40af'};
            padding: 1rem 2rem;
            border-radius: 12px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            z-index: 2000;
            animation: slideInMessage 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            font-weight: 500;
            border: 1px solid ${type === 'error' ? '#fecaca' : type === 'success' ? '#bbf7d0' : '#bfdbfe'};
        `;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.style.animation = 'slideOutMessage 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            setTimeout(() => {
                messageDiv.remove();
            }, 400);
        }, 4000);
    }
}

// Global functions for HTML onclick handlers
function closeDayModal() {
    familyCalendar.closeDayModal();
}

function clearEventForm() {
    familyCalendar.clearEventForm();
}

function submitEvent() {
    familyCalendar.submitEvent();
}

// Add message animations
const messageStyles = document.createElement('style');
messageStyles.textContent = `
    @keyframes slideInMessage {
        from {
            transform: translateX(100%) translateY(-10px);
            opacity: 0;
        }
        to {
            transform: translateX(0) translateY(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutMessage {
        from {
            transform: translateX(0) translateY(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%) translateY(-10px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(messageStyles);

// Initialize the magical calendar
let familyCalendar;
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing calendar...');
    try {
        familyCalendar = new FamilyTimeMachine();
        console.log('Calendar initialized successfully:', familyCalendar);
    } catch (error) {
        console.error('Error initializing calendar:', error);
    }
});

// Add some finishing touches for a premium feel
document.addEventListener('DOMContentLoaded', () => {
    // Smooth scrolling for any anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Add a subtle parallax effect to the background
    let ticking = false;
    
    function updateParallax() {
        const scrolled = window.pageYOffset;
        const parallax = document.body;
        const speed = scrolled * 0.5;
        
        parallax.style.backgroundPosition = `center ${speed}px`;
        ticking = false;
    }
    
    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }
    
    window.addEventListener('scroll', requestTick);
});