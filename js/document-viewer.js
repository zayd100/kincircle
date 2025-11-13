// Document Viewer JavaScript - Universal Family Document Reader

let currentDocument = null;
let currentPage = 1;
let totalPages = 1;

// Initialize viewer on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeViewer();
});

// Initialize the document viewer
function initializeViewer() {
    const urlParams = new URLSearchParams(window.location.search);
    const documentId = urlParams.get('id');
    
    if (!documentId) {
        showError('No document specified');
        return;
    }
    
    loadDocument(documentId);
    setupReadingControls();
}

// Load document data from API
async function loadDocument(documentId) {
    try {
        const response = await fetch(`/api/media/${documentId}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                showError('Document not found');
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const document = await response.json();
        
        if (!document || !document.id) {
            showError('Invalid document data received');
            return;
        }
        
        currentDocument = document;
        displayDocument(document);
    } catch (error) {
        console.error('Error loading document:', error);
        showError('Failed to load document. Please try again later.');
    }
}


// Display document in the appropriate viewer
function displayDocument(document) {
    // Hide loading state
    document.getElementById('documentLoading').style.display = 'none';
    
    // Update header information
    document.getElementById('documentTitle').textContent = document.title || 'Untitled Document';
    document.getElementById('documentDescription').textContent = document.description || document.subtitle || 'No description available';
    
    // Update sidebar details
    document.getElementById('documentType').textContent = getDocumentTypeLabel(document);
    document.getElementById('documentPages').textContent = document.pages || 'Unknown';
    document.getElementById('documentSize').textContent = document.fileSize || document.file_size || 'Unknown size';
    document.getElementById('documentUploader').textContent = document.uploadedBy || document.uploaded_by || 'Unknown';
    document.getElementById('documentDate').textContent = formatDisplayDate(document.dateAdded || document.date_added);
    document.getElementById('documentCategory').textContent = document.category || 'Uncategorized';
    document.getElementById('documentContext').textContent = document.context || document.description || 'No additional context available';
    
    // Set appropriate icon and header
    const iconElement = document.getElementById('documentTypeIcon');
    if (document.subtype === 'sheet_music') {
        iconElement.textContent = '🎵 Sheet Music Details';
    } else if (document.subtype === 'text') {
        iconElement.textContent = '📖 Document Details';
    } else {
        iconElement.textContent = '📄 Document Details';
    }
    
    // Show appropriate viewer
    if (document.subtype === 'text') {
        setupTextViewer(document);
    } else {
        setupPDFViewer(document);
    }
    
    // Update page title
    document.title = `${document.title || 'Document'} - Reed & Weaver Documents`;
}

// Setup PDF viewer
function setupPDFViewer(document) {
    const pdfViewer = document.getElementById('pdfViewer');
    const pdfFrame = document.getElementById('pdfFrame');
    const pdfFallback = document.getElementById('pdfFallback');
    
    // Try to load PDF in iframe
    pdfFrame.src = `${document.filePath}#toolbar=1&navpanes=1&scrollbar=1`;
    
    // Show PDF viewer
    pdfViewer.style.display = 'block';
    
    // Handle iframe load errors
    pdfFrame.addEventListener('error', function() {
        console.log('PDF iframe failed to load, showing fallback');
        pdfFrame.style.display = 'none';
        pdfFallback.style.display = 'flex';
    });
    
    // For some browsers that don't support PDF in iframe
    setTimeout(() => {
        if (pdfFrame.contentDocument === null) {
            console.log('PDF iframe not supported, showing fallback');
            pdfFrame.style.display = 'none';
            pdfFallback.style.display = 'flex';
        }
    }, 2000);
    
    // Update navigation for multi-page PDFs
    if (document.pages && document.pages.includes(' ')) {
        const pageCount = parseInt(document.pages.split(' ')[0]);
        totalPages = pageCount;
        updatePageNavigation();
    }
}

// Setup text viewer for readable documents
function setupTextViewer(document) {
    const textViewer = document.getElementById('textViewer');
    const textContent = document.getElementById('textContent');
    
    // Load text content
    loadTextContent(document.filePath, textContent);
    
    // Show text viewer
    textViewer.style.display = 'block';
    
    // Hide page navigation for text documents
    document.getElementById('navigationSection').style.display = 'none';
}

// Load text content from file
async function loadTextContent(filePath, container) {
    try {
        const response = await fetch(filePath);
        const text = await response.text();
        
        // Format text with proper paragraphs and headings
        const formattedText = formatTextContent(text);
        container.innerHTML = formattedText;
    } catch (error) {
        console.error('Error loading text content:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #666;">
                <h3>Content Preview Not Available</h3>
                <p>This document is available for download but cannot be previewed in the browser.</p>
                <button onclick="downloadDocument()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--primary); color: white; border: none; border-radius: 8px; cursor: pointer;">
                    Download Document
                </button>
            </div>
        `;
    }
}

// Format text content for better readability
function formatTextContent(text) {
    // Split into paragraphs
    const paragraphs = text.split(/\n\s*\n/);
    
    let formatted = '';
    paragraphs.forEach(paragraph => {
        const trimmed = paragraph.trim();
        if (trimmed) {
            // Check if it looks like a heading (short line, possibly all caps)
            if (trimmed.length < 60 && (trimmed === trimmed.toUpperCase() || trimmed.match(/^[A-Z][^.!?]*$/))) {
                formatted += `<h3>${trimmed}</h3>\n`;
            } else {
                formatted += `<p>${trimmed.replace(/\n/g, '<br>')}</p>\n`;
            }
        }
    });
    
    return formatted;
}

// Setup reading control handlers
function setupReadingControls() {
    // Text size control
    const textSizeSlider = document.getElementById('textSizeSlider');
    textSizeSlider.addEventListener('input', function() {
        const textContent = document.getElementById('textContent');
        textContent.style.fontSize = `${this.value}px`;
    });
    
    // Font family control
    const fontSelect = document.getElementById('fontFamily');
    fontSelect.addEventListener('change', function() {
        const textContent = document.getElementById('textContent');
        textContent.className = textContent.className.replace(/\b(serif|sans-serif|monospace)\b/g, '');
        textContent.classList.add('text-content', this.value);
    });
    
    // Page width control
    const widthSelect = document.getElementById('pageWidth');
    widthSelect.addEventListener('change', function() {
        const textContent = document.getElementById('textContent');
        textContent.className = textContent.className.replace(/\b(narrow|medium|wide)\b/g, '');
        textContent.classList.add('text-content', this.value);
    });
}

// Page navigation functions
function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        updatePageNavigation();
        // For PDF, this would need PDF.js integration
    }
}

function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        updatePageNavigation();
        // For PDF, this would need PDF.js integration
    }
}

function updatePageNavigation() {
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
}

// Utility functions
function getDocumentTypeLabel(document) {
    if (document.subtype === 'sheet_music') {
        return 'Sheet Music (PDF)';
    } else if (document.subtype === 'text') {
        return 'Text Document';
    } else {
        return 'PDF Document';
    }
}

function formatDisplayDate(dateInput) {
    if (!dateInput) return 'Unknown date';
    
    try {
        let date;
        if (typeof dateInput === 'string') {
            date = new Date(dateInput);
        } else if (dateInput instanceof Date) {
            date = dateInput;
        } else {
            return 'Unknown date';
        }
        
        if (isNaN(date.getTime())) {
            return 'Unknown date';
        }
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        console.warn('Error formatting date:', error);
        return 'Unknown date';
    }
}

// Show error state
function showError(message) {
    document.getElementById('documentLoading').style.display = 'none';
    const errorDiv = document.getElementById('documentError');
    errorDiv.style.display = 'flex';
    
    // Update error message if provided
    if (message) {
        const errorText = errorDiv.querySelector('p');
        errorText.textContent = message;
    }
}

// Action button handlers
function downloadDocument() {
    if (currentDocument && currentDocument.filePath) {
        // Create download link
        const link = document.createElement('a');
        link.href = currentDocument.filePath;
        link.download = `${currentDocument.title}.${currentDocument.filePath.split('.').pop()}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showMessage('Download started!', 'success');
    } else {
        showMessage('Download not available', 'error');
    }
}

function printDocument() {
    window.print();
}

function shareDocument() {
    const shareUrl = window.location.href;
    
    if (navigator.share) {
        navigator.share({
            title: currentDocument.title,
            text: currentDocument.description,
            url: shareUrl
        }).catch(err => {
            console.log('Error sharing:', err);
            copyToClipboard(shareUrl);
        });
    } else {
        copyToClipboard(shareUrl);
    }
}

function openInNewTab() {
    if (currentDocument && currentDocument.filePath) {
        window.open(currentDocument.filePath, '_blank');
    }
}

function fullscreenMode() {
    const displayArea = document.querySelector('.document-display-area');
    if (displayArea.requestFullscreen) {
        displayArea.requestFullscreen();
    } else if (displayArea.webkitRequestFullscreen) {
        displayArea.webkitRequestFullscreen();
    } else if (displayArea.msRequestFullscreen) {
        displayArea.msRequestFullscreen();
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showMessage('Link copied to clipboard!', 'success');
    }).catch(() => {
        showMessage('Could not copy link', 'error');
    });
}

function reportIssue() {
    const message = `Issue with document: ${currentDocument.title} (ID: ${currentDocument.id})`;
    const mailtoLink = `mailto:admin@reedweaver.family?subject=Document Issue Report&body=${encodeURIComponent(message)}`;
    window.location.href = mailtoLink;
}

// Show message notification
function showMessage(text, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = text;
    messageDiv.style.cssText = `
        position: fixed;
        top: 2rem;
        right: 2rem;
        background: var(--glass-bg);
        border: 1px solid var(--glass-border);
        color: var(--text-primary);
        padding: 1rem 2rem;
        border-radius: var(--radius-lg);
        box-shadow: var(--glass-shadow);
        backdrop-filter: var(--glass-backdrop);
        z-index: 1000;
        animation: fadeIn 0.3s ease;
        max-width: 300px;
    `;
    
    if (type === 'error') {
        messageDiv.style.borderColor = 'var(--error)';
        messageDiv.style.color = 'var(--error)';
    } else if (type === 'success') {
        messageDiv.style.borderColor = 'var(--success)';
        messageDiv.style.color = 'var(--success)';
    }
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 4000);
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
        return; // Don't interfere with form inputs
    }
    
    switch (e.code) {
        case 'ArrowLeft':
            e.preventDefault();
            previousPage();
            break;
        case 'ArrowRight':
            e.preventDefault();
            nextPage();
            break;
        case 'KeyF':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                // Focus search would go here if implemented
            }
            break;
        case 'KeyP':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                printDocument();
            }
            break;
        case 'KeyD':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                downloadDocument();
            }
            break;
    }
});

// Make functions globally available
window.downloadDocument = downloadDocument;
window.printDocument = printDocument;
window.shareDocument = shareDocument;
window.openInNewTab = openInNewTab;
window.fullscreenMode = fullscreenMode;
window.reportIssue = reportIssue;
window.previousPage = previousPage;
window.nextPage = nextPage;