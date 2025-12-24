/**
 * Memorial Page JavaScript
 * Handles slide-out functionality for memorial details
 * Memorial data is injected from PHP
 */

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