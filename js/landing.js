// Dynamic Background Gallery
class BackgroundGallery {
    constructor() {
        this.container = document.getElementById('galleryContainer');
        this.images = [];
        this.activeImages = [];
        this.maxActiveImages = 3;
        this.imageInterval = 4000; // New image every 4 seconds
        this.directions = ['from-left', 'from-right', 'from-top', 'from-bottom'];
        
        this.loadSplashImages();
    }
    
    async loadSplashImages() {
        try {
            const response = await fetch('/api/splash-images.php');
            this.images = await response.json();
            
            // Start gallery if we have images
            if (this.images.length > 0) {
                this.init();
            }
        } catch (error) {
            console.error('Error loading splash images:', error);
            // Fallback to hardcoded images
            this.images = [
                'images/splash/family_01.jpg',
                'images/splash/family_02.jpg',
                'images/splash/family_03.jpg'
            ];
            this.init();
        }
    }
    
    init() {
        // Start the gallery
        this.addImage();
        setInterval(() => this.addImage(), this.imageInterval);
    }
    
    addImage() {
        // Remove oldest image if at max
        if (this.activeImages.length >= this.maxActiveImages) {
            const oldestImage = this.activeImages.shift();
            setTimeout(() => {
                oldestImage.remove();
            }, 2000);
        }
        
        // Create new image
        const img = document.createElement('img');
        img.className = 'gallery-image';
        img.src = this.getRandomImage();
        
        // Random position and size
        const size = Math.random() * 200 + 300; // 300-500px
        const positions = this.getRandomPosition(size);
        
        img.style.width = `${size}px`;
        img.style.height = 'auto';
        img.style.left = `${positions.x}px`;
        img.style.top = `${positions.y}px`;
        
        // Add direction class
        const direction = this.directions[Math.floor(Math.random() * this.directions.length)];
        img.classList.add(direction);
        
        // Add to DOM
        this.container.appendChild(img);
        
        // Trigger animation
        setTimeout(() => {
            img.classList.add('active');
        }, 100);
        
        this.activeImages.push(img);
    }
    
    getRandomImage() {
        return this.images[Math.floor(Math.random() * this.images.length)];
    }
    
    getRandomPosition(size) {
        const margin = 100;
        const x = Math.random() * (window.innerWidth - size + 2 * margin) - margin;
        const y = Math.random() * (window.innerHeight - size + 2 * margin) - margin;
        return { x, y };
    }
}

// Smooth scroll for navigation cards
document.addEventListener('DOMContentLoaded', function() {
    // Initialize gallery
    new BackgroundGallery();
    
    // Add hover effects to cards
    const cards = document.querySelectorAll('.nav-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    // Parallax effect on mouse move
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;
    
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX - window.innerWidth / 2) / window.innerWidth;
        mouseY = (e.clientY - window.innerHeight / 2) / window.innerHeight;
    });
    
    function updateParallax() {
        targetX += (mouseX - targetX) * 0.1;
        targetY += (mouseY - targetY) * 0.1;
        
        const header = document.querySelector('.landing-header');
        if (header) {
            header.style.transform = `translate(${targetX * 20}px, ${targetY * 20}px)`;
        }
        
        requestAnimationFrame(updateParallax);
    }
    
    updateParallax();
});