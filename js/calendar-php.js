// Calendar functionality for Reed & Weaver with PHP backend

let currentDate = new Date();
let currentEvents = {};

async function initCalendar() {
    await generateCalendar(currentDate);
    await updateUpcomingEvents();
}

async function changeMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    await generateCalendar(currentDate);
    await updateUpcomingEvents();
}

async function generateCalendar(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // PHP expects 1-based months
    
    // Update month display
    document.getElementById('calendar-month').textContent = 
        date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    try {
        // Load events for this month
        const response = await fetch(`/api/calendar.php?action=events&year=${year}&month=${month}`);
        const data = await response.json();
        
        if (data.success) {
            currentEvents = data.events;
        } else {
            console.error('Error loading calendar events:', data.error);
            currentEvents = {};
        }
    } catch (error) {
        console.error('Error loading calendar events:', error);
        currentEvents = {};
    }
    
    // Get first day of month and number of days
    const firstDay = new Date(year, date.getMonth(), 1);
    const lastDay = new Date(year, date.getMonth() + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const calendarGrid = document.getElementById('calendar-grid');
    calendarGrid.innerHTML = '';
    
    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day header';
        header.textContent = day;
        header.style.fontWeight = 'bold';
        header.style.background = '#f3f4f6';
        calendarGrid.appendChild(header);
    });
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day other-month';
        calendarGrid.appendChild(emptyDay);
    }
    
    // Add days of the month
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        
        const dayDate = new Date(year, date.getMonth(), day);
        const dateString = formatDateForEvents(dayDate);
        
        // Check if this day has events
        if (currentEvents[dateString]) {
            dayElement.classList.add('has-event');
            const eventTitles = currentEvents[dateString].map(e => e.title).join(', ');
            dayElement.title = eventTitles;
        }
        
        // Highlight today
        if (dayDate.toDateString() === today.toDateString()) {
            dayElement.classList.add('today');
        }
        
        // Add click handler for day
        dayElement.addEventListener('click', () => showDayEvents(dayDate));
        
        calendarGrid.appendChild(dayElement);
    }
}

async function updateUpcomingEvents() {
    try {
        const response = await fetch('/api/calendar.php?action=upcoming');
        const data = await response.json();
        
        if (data.success) {
            const eventList = document.getElementById('event-list');
            const today = new Date();
            
            if (data.events.length === 0) {
                eventList.innerHTML = '<li>No upcoming events</li>';
            } else {
                eventList.innerHTML = data.events.map(event => {
                    const eventDate = new Date(event.event_date);
                    const daysDiff = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
                    const timeString = daysDiff === 0 ? 'Today' : 
                                     daysDiff === 1 ? 'Tomorrow' : 
                                     `${daysDiff} days`;
                    
                    return `<li>${escapeHtml(event.title)} - ${eventDate.getDate()}${getDaySuffix(eventDate.getDate())} (${timeString})</li>`;
                }).join('');
            }
        } else {
            document.getElementById('event-list').innerHTML = '<li>Error loading events</li>';
        }
    } catch (error) {
        console.error('Error loading upcoming events:', error);
        document.getElementById('event-list').innerHTML = '<li>Error loading events</li>';
    }
}

function showDayEvents(date) {
    const dateString = formatDateForEvents(date);
    const dayEvents = currentEvents[dateString];
    
    if (dayEvents && dayEvents.length > 0) {
        const eventText = dayEvents.map(event => {
            let text = event.title;
            if (event.description) {
                text += '\n' + event.description;
            }
            return text;
        }).join('\n\n');
        
        alert(`Events for ${date.toLocaleDateString()}:\n\n${eventText}`);
    } else {
        // If admin, could show "Add event" option here
        if (window.currentUser && window.currentUser.isAdmin) {
            if (confirm(`No events for ${date.toLocaleDateString()}. Add an event?`)) {
                // Could open an add event modal here
                showAddEventModal(dateString);
            }
        }
    }
}

function showAddEventModal(dateString) {
    // Simple prompt for now - could be enhanced with a proper modal
    const title = prompt('Event title:');
    if (title) {
        const description = prompt('Event description (optional):');
        addCalendarEvent(title, dateString, description);
    }
}

async function addCalendarEvent(title, date, description = '') {
    try {
        const response = await fetch('/api/calendar.php?action=add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: title,
                date: date,
                description: description
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Event added successfully!', 'success');
            // Refresh calendar
            await generateCalendar(currentDate);
            await updateUpcomingEvents();
        } else {
            showMessage('Error adding event: ' + result.error, 'error');
        }
    } catch (error) {
        showMessage('Error adding event', 'error');
    }
}

function formatDateForEvents(date) {
    return date.getFullYear() + '-' + 
           String(date.getMonth() + 1).padStart(2, '0') + '-' + 
           String(date.getDate()).padStart(2, '0');
}

function getDaySuffix(day) {
    if (day >= 11 && day <= 13) {
        return 'th';
    }
    switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showMessage(text, type = 'success') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = text;
    
    document.body.insertBefore(messageDiv, document.body.firstChild);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCalendar);
} else {
    initCalendar();
}