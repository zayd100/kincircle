/**
 * Memorial Page JavaScript
 * Handles slide-out functionality for memorial details
 */

// Memorial data - placeholder structure
const memorialData = {
    '1': {
        name: 'Family Member 1',
        dates: 'Date Range',
        photo: '../images/gallery/family_01.jpg',
        eulogy: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.\n\nExcepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.',
        stories: [
            {
                title: 'Family Story 1',
                content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris consectetur, nunc vel tincidunt facilisis, ipsum nulla vehicula nunc, vel facilisis nunc nulla vel nunc.'
            },
            {
                title: 'Family Story 2', 
                content: 'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'
            }
        ],
        photos: [
            '../images/gallery/family_04.jpg',
            '../images/gallery/family_05.jpg',
            '../images/gallery/family_06.jpg'
        ]
    },
    '2': {
        name: 'Family Member 2',
        dates: 'Date Range',
        photo: '../images/gallery/family_02.jpg',
        eulogy: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
        stories: [
            {
                title: 'Family Story 1',
                content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris consectetur, nunc vel tincidunt facilisis, ipsum nulla vehicula nunc.'
            }
        ],
        photos: [
            '../images/gallery/family_07.jpg',
            '../images/gallery/family_08.jpg'
        ]
    },
    '3': {
        name: 'Family Member 3',
        dates: 'Date Range',
        photo: '../images/gallery/family_03.jpg',
        eulogy: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.\n\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
        stories: [
            {
                title: 'Family Story 1',
                content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris consectetur, nunc vel tincidunt facilisis.'
            },
            {
                title: 'Family Story 2',
                content: 'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.'
            },
            {
                title: 'Family Story 3',
                content: 'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'
            }
        ],
        photos: [
            '../images/gallery/family_09.jpg',
            '../images/gallery/family_10.jpg',
            '../images/gallery/family_11.jpg',
            '../images/gallery/family_12.jpg'
        ]
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const memorialCards = document.querySelectorAll('.memorial-card');
    const slideout = document.getElementById('memorialSlideout');
    const slideoutContent = document.getElementById('slideoutContent');
    const closeButton = document.getElementById('closeSlideout');

    // Handle memorial card clicks
    memorialCards.forEach(card => {
        card.addEventListener('click', function() {
            const memorialId = this.getAttribute('data-memorial');
            openMemorialDetail(memorialId);
        });
    });

    // Handle close button
    closeButton.addEventListener('click', function() {
        closeMemorialDetail();
    });

    // Handle escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && slideout.classList.contains('open')) {
            closeMemorialDetail();
        }
    });

    function openMemorialDetail(memorialId) {
        const memorial = memorialData[memorialId];
        if (!memorial) return;

        // Create memorial detail content
        const detailHTML = createMemorialDetailHTML(memorial);
        slideoutContent.innerHTML = detailHTML;

        // Open slideout
        slideout.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeMemorialDetail() {
        slideout.classList.remove('open');
        document.body.style.overflow = 'auto';
    }

    function createMemorialDetailHTML(memorial) {
        const storiesHTML = memorial.stories.map(story => `
            <div class="detail-section">
                <h3 class="section-title">${story.title}</h3>
                <div class="section-content">
                    ${story.content}
                </div>
            </div>
        `).join('');

        const photosHTML = memorial.photos.map(photo => `
            <div class="gallery-photo">
                <img src="${photo}" alt="Memorial photo">
            </div>
        `).join('');

        return `
            <div class="memorial-detail">
                <div class="detail-header">
                    <div class="detail-photo">
                        <img src="${memorial.photo}" alt="${memorial.name}">
                    </div>
                    <h2 class="detail-name">${memorial.name}</h2>
                    <p class="detail-dates">${memorial.dates}</p>
                </div>

                <div class="detail-section">
                    <h3 class="section-title">Eulogy</h3>
                    <div class="section-content">
                        ${memorial.eulogy.split('\n\n').map(paragraph => `<p>${paragraph}</p>`).join('')}
                    </div>
                </div>

                ${storiesHTML}

                <div class="detail-section">
                    <h3 class="section-title">Photo Memories</h3>
                    <div class="photo-gallery">
                        ${photosHTML}
                    </div>
                </div>
            </div>
        `;
    }
});

// Smooth scrolling for slideout
document.addEventListener('DOMContentLoaded', function() {
    const slideout = document.getElementById('memorialSlideout');
    
    slideout.addEventListener('scroll', function() {
        // Add any scroll-based functionality here if needed
    });
});