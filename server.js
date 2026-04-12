/*
 * DEVELOPMENT/STAGING SERVER NOTICE
 * ===============================
 * 
 * This Node.js server was created for development and staging purposes to simulate
 * the PHP backend functionality. For PRODUCTION deployment, it is recommended to:
 * 
 * 1. USE THE PHP API ENDPOINTS INSTEAD - The api/ directory contains production-ready
 *    PHP files that properly integrate with the MySQL database.
 * 
 * 2. IF KEEPING THIS SERVER: Replace all TODO comments with actual database
 *    connections and remove the 501 "Not Implemented" responses.
 * 
 * 3. SECURITY CONSIDERATIONS: This server lacks proper session management,
 *    CSRF protection, and other production security measures.
 * 
 * Most endpoints now return 501 errors and direct users to use the PHP API endpoints
 * for production functionality.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');
const app = express();
const port = 3000;

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'images', 'uploads', 'pending');
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueId = crypto.randomBytes(16).toString('hex');
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}_${uniqueId}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 20 // Max 20 files per upload
    },
    fileFilter: (req, file, cb) => {
        // Only allow image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(__dirname));

// API endpoint to get splash images
app.get('/api/splash-images', (req, res) => {
    const splashDir = path.join(__dirname, 'images', 'splash');
    try {
        const files = fs.readdirSync(splashDir)
            .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))
            .map(file => `images/splash/${file}`);
        res.json(files);
    } catch (error) {
        res.json([]);
    }
});

// API endpoint to get photo albums
app.get('/api/photo-albums', (req, res) => {
    const photosDir = path.join(__dirname, 'images', 'photos');
    try {
        const albums = fs.readdirSync(photosDir)
            .filter(item => {
                const itemPath = path.join(photosDir, item);
                return fs.statSync(itemPath).isDirectory();
            })
            .map(albumName => {
                const albumPath = path.join(photosDir, albumName);
                const photos = fs.readdirSync(albumPath)
                    .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))
                    .map(file => `images/photos/${albumName}/${file}`);
                
                return {
                    name: albumName,
                    photoCount: photos.length,
                    photos: photos
                };
            });
        res.json(albums);
    } catch (error) {
        res.json([]);
    }
});

// API endpoint to get specific album photos
app.get('/api/album/:albumName', (req, res) => {
    const albumName = req.params.albumName;
    const albumPath = path.join(__dirname, 'images', 'photos', albumName);
    try {
        const photos = fs.readdirSync(albumPath)
            .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))
            .map(file => ({
                src: `images/photos/${albumName}/${file}`,
                filename: file
            }));
        res.json(photos);
    } catch (error) {
        res.json([]);
    }
});

// Photo upload endpoint
app.post('/api/upload-photos', upload.array('photos'), (req, res) => {
    try {
        // Get user ID from session (production implementation needed)
        const uploaderId = req.session?.user_id;
        
        if (!uploaderId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        
        const {
            event_name,
            date_taken,
            people_in_photo,
            description,
            suggested_album
        } = req.body;
        
        // Validate required fields
        if (!event_name || !req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Event name and at least one photo are required'
            });
        }
        
        // Database insertion - production implementation needed
        // TODO: Replace with actual database calls to photo_submissions table
        const submissions = req.files.map(file => ({
            filename: file.filename,
            original_name: file.originalname,
            file_size: file.size,
            mime_type: file.mimetype,
            uploader_id: uploaderId,
            event_name: event_name,
            date_taken: date_taken || null,
            people_in_photo: people_in_photo || null,
            description: description || null,
            suggested_album: suggested_album || null,
            status: 'pending',
            uploaded_at: new Date().toISOString()
        }));
        
        // TODO: Implement database storage for photo submissions
        // Example: INSERT INTO photo_submissions (...) VALUES (...)
        
        res.json({
            success: true,
            message: `${req.files.length} photo(s) uploaded successfully`,
            submissions: submissions.map(s => ({
                filename: s.filename,
                original_name: s.original_name,
                event_name: s.event_name
            }))
        });
        
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            error: 'Upload failed'
        });
    }
});

// Get pending submissions for admin - production database implementation needed
app.get('/api/pending-submissions', (req, res) => {
    // TODO: Replace with database query
    // SELECT * FROM photo_submissions WHERE status = 'pending' ORDER BY uploaded_at DESC
    res.status(501).json({ 
        success: false, 
        error: 'Production database implementation required' 
    });
});

// Family Directory API endpoints
app.get('/api/users', (req, res) => {
    const action = req.query.action;
    
    // TODO: Replace with database query to users table
    // Production implementation needed
    
    // TODO: Replace with database query to pending_users table
    // Production implementation needed
    
    try {
        // TODO: Replace with proper database queries based on action
        res.status(501).json({
            success: false,
            error: 'Production database implementation required. Use PHP API endpoints instead.'
        });
    } catch (error) {
        console.error('Users API error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});

// Cousin Connect API endpoints
app.get('/api/cousin-connect', (req, res) => {
    const action = req.query.action;
    
    try {
        // TODO: Replace with proper database queries
        res.status(501).json({
            success: false,
            error: 'Production database implementation required. Use PHP API endpoints instead.'
        });
    } catch (error) {
        console.error('Cousin Connect API error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});

// Cousin Connect POST endpoints
app.post('/api/cousin-connect', (req, res) => {
    const { action, available, interests } = req.body;
    
    try {
        // TODO: Replace with proper database update
        res.status(501).json({
            success: false,
            error: 'Production database implementation required. Use PHP API endpoints instead.'
        });
    } catch (error) {
        console.error('Cousin Connect POST error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});

// User management endpoints
app.post('/api/users', (req, res) => {
    const { action, user_id, reason } = req.body;
    
    try {
        // TODO: Replace with proper database operations
        res.status(501).json({
            success: false,
            error: 'Production database implementation required. Use PHP API endpoints instead.'
        });
    } catch (error) {
        console.error('User management error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});

// Simple backend API endpoints for photo moderation (will use database in production)
app.post('/api/approve-photo', express.json(), (req, res) => {
    const { filename, album, reviewerNotes } = req.body;
    // TODO: Production implementation needed:
    // 1. Update photo_submissions table status to 'approved'
    // 2. Move file from pending to album directory
    // 3. Update album metadata
    res.status(501).json({
        success: false,
        error: 'Production database implementation required'
    });
});

app.post('/api/reject-photo', express.json(), (req, res) => {
    const { filename, reviewerNotes } = req.body;
    // TODO: Production implementation needed:
    // 1. Update photo_submissions table status to 'rejected'
    // 2. Move file to rejected folder
    // 3. Log rejection reason
    res.status(501).json({
        success: false,
        error: 'Production database implementation required'
    });
});

app.post('/api/create-album', express.json(), (req, res) => {
    const { folder, title, emoji, description, dateRange } = req.body;
    // TODO: Production implementation needed:
    // 1. Insert into albums table
    // 2. Create directory structure
    // 3. Set proper permissions
    res.status(501).json({
        success: false,
        error: 'Production database implementation required'
    });
});

app.post('/api/submit-event', express.json(), (req, res) => {
    const { title, event_date, event_type, recurring, contact_info, description, submitter_id } = req.body;
    // TODO: Production implementation needed:
    // Insert into event_submissions table with pending status
    res.status(501).json({
        success: false,
        error: 'Production database implementation required'
    });
});

app.post('/api/approve-event', express.json(), (req, res) => {
    const { eventId, reviewerNotes, reviewerId } = req.body;
    // TODO: Production implementation needed:
    // 1. Update event_submissions table to approved status
    // 2. Insert into calendar_events table
    // 3. Handle recurring events if needed
    res.status(501).json({
        success: false,
        error: 'Production database implementation required'
    });
});

app.post('/api/reject-event', express.json(), (req, res) => {
    const { eventId, reviewerNotes, reviewerId } = req.body;
    // TODO: Production implementation needed:
    // Update event_submissions table to rejected status
    res.status(501).json({
        success: false,
        error: 'Production database implementation required'
    });
});

// ============ CALENDAR EVENTS API FOR EVENTS PAGE ============

// Calendar Events API for Events page
app.get('/api/calendar.php', (req, res) => {
    const action = req.query.action;
    
    if (action === 'getEvents') {
        // TODO: Replace with database query to calendar_events table
        res.status(501).json({
            success: false,
            error: 'Production database implementation required. Use PHP API endpoints instead.'
        });
    } else {
        res.status(400).json({
            success: false,
            error: 'Unknown action'
        });
    }
});

// Event commitment API for attendance tracking
app.post('/api/calendar.php', express.json(), (req, res) => {
    const { action, eventId, userId, committed } = req.body;
    
    if (action === 'updateCommitment') {
        // TODO: Production implementation needed:
        // Update/insert into event_commitments table
        res.status(501).json({
            success: false,
            error: 'Production database implementation required. Use PHP API endpoints instead.'
        });
    } else {
        res.status(400).json({
            success: false,
            error: 'Unknown action'
        });
    }
});

// ============ MESSAGE BOARD ENDPOINTS ============

// Get message board threads with pagination and filtering
app.get('/api/message-board/threads', (req, res) => {
    const { page = 1, limit = 10, filter = 'all', search = '' } = req.query;
    
    // TODO: Replace with database query to message_board_threads table
    
    // TODO: Production database implementation needed
    res.status(501).json({
        success: false,
        error: 'Production database implementation required. Use PHP API endpoints instead.'
    });
});

// Create new message board thread
app.post('/api/message-board/threads', express.json(), (req, res) => {
    const { title, category, content, isPinned = false } = req.body;
    // TODO: Get user ID from session
    const userId = req.session?.user_id;
    
    if (!userId) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    
    if (!title || !content) {
        return res.status(400).json({
            success: false,
            error: 'Title and content are required'
        });
    }
    
    // TODO: Production database implementation needed
    res.status(501).json({
        success: false,
        error: 'Production database implementation required. Use PHP API endpoints instead.'
    });
});

// Get thread details with replies
app.get('/api/message-board/threads/:threadId', (req, res) => {
    const threadId = parseInt(req.params.threadId);
    
    // TODO: Production database implementation needed
    res.status(501).json({
        success: false,
        error: 'Production database implementation required. Use PHP API endpoints instead.'
    });
});

// Add reply to thread
app.post('/api/message-board/threads/:threadId/replies', express.json(), (req, res) => {
    const threadId = parseInt(req.params.threadId);
    const { content } = req.body;
    // TODO: Get user ID from session
    const userId = req.session?.user_id;
    
    if (!userId) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    
    if (!content) {
        return res.status(400).json({
            success: false,
            error: 'Reply content is required'
        });
    }
    
    // TODO: Production database implementation needed
    res.status(501).json({
        success: false,
        error: 'Production database implementation required. Use PHP API endpoints instead.'
    });
});

// ============ PRIVATE MESSAGING ENDPOINTS ============

// Get user's conversations
app.get('/api/inbox/conversations', (req, res) => {
    // TODO: Get user ID from session
    const userId = req.session?.user_id;
    const { filter = 'all' } = req.query;
    
    if (!userId) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    
    // TODO: Production database implementation needed
    res.status(501).json({
        success: false,
        error: 'Production database implementation required. Use PHP API endpoints instead.'
    });
});

// Get messages for a conversation
app.get('/api/inbox/conversations/:conversationId/messages', (req, res) => {
    const conversationId = parseInt(req.params.conversationId);
    // TODO: Get user ID from session
    const userId = req.session?.user_id;
    
    if (!userId) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    
    // TODO: Production database implementation needed
    res.status(501).json({
        success: false,
        error: 'Production database implementation required. Use PHP API endpoints instead.'
    });
});

// Send message to conversation
app.post('/api/inbox/conversations/:conversationId/messages', express.json(), (req, res) => {
    const conversationId = parseInt(req.params.conversationId);
    const { content } = req.body;
    // TODO: Get user ID from session
    const userId = req.session?.user_id;
    
    if (!userId) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    
    if (!content) {
        return res.status(400).json({
            success: false,
            error: 'Message content is required'
        });
    }
    
    // TODO: Production database implementation needed
    res.status(501).json({
        success: false,
        error: 'Production database implementation required. Use PHP API endpoints instead.'
    });
});

// Create new conversation
app.post('/api/inbox/conversations', express.json(), (req, res) => {
    const { recipients, subject, content, isImportant = false } = req.body;
    // TODO: Get user ID from session
    const userId = req.session?.user_id;
    
    if (!userId) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    
    if (!recipients || recipients.length === 0 || !content) {
        return res.status(400).json({
            success: false,
            error: 'Recipients and content are required'
        });
    }
    
    // TODO: Production database implementation needed
    res.status(501).json({
        success: false,
        error: 'Production database implementation required. Use PHP API endpoints instead.'
    });
});

// Get family members for recipient selection
app.get('/api/inbox/family-members', (req, res) => {
    // TODO: Get user ID from session
    const userId = req.session?.user_id;
    
    if (!userId) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    
    // TODO: Production database implementation needed
    // Fetch from users table
    res.status(501).json({
        success: false,
        error: 'Production database implementation required. Use PHP API endpoints instead.'
    });
});

// Handle inbox routing
app.get('/inbox', (req, res) => {
    const indexPath = path.join(__dirname, 'inbox', 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.redirect('/');
    }
});

app.get('/inbox/', (req, res) => {
    const indexPath = path.join(__dirname, 'inbox', 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.redirect('/');
    }
});

// Handle directory-based routing
const sections = ['photos', 'calendar', 'messages', 'directory', 'recipes', 'memorials', 'upload', 'admin'];

sections.forEach(section => {
    app.get(`/${section}`, (req, res) => {
        const indexPath = path.join(__dirname, section, 'index.html');
        if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            res.redirect('/');
        }
    });
    
    app.get(`/${section}/`, (req, res) => {
        const indexPath = path.join(__dirname, section, 'index.html');
        if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            res.redirect('/');
        }
    });
});

// Route PHP files to HTML for development
app.get('*.php', (req, res) => {
    const htmlFile = req.path.replace('.php', '.html');
    const filePath = path.join(__dirname, htmlFile);
    
    // Check if corresponding HTML file exists
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        // For PHP files without HTML counterpart, redirect to index
        res.redirect('/');
    }
});

// Default route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Familiagram site running at http://localhost:${port}`);
    console.log('Press Ctrl+C to stop');
});