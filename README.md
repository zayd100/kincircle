# Kin Circle

**Private family social network — no ads, algorithms, or strangers**

A secure, private platform designed for families to share memories, connect, and stay organized. Built with privacy and simplicity at its core.

## Features

### Core Functionality
- **Photo Sharing** - Upload and organize family photos with tagging
- **Recipe Collection** - Create, share, and preserve family recipes
- **Events Calendar** - Coordinate family gatherings and important dates
- **Family Directory** - Maintain contact information for all family members
- **Messaging** - Private inbox for family communications
- **Memorials** - Honor and remember departed family members
- **Media Library** - Share videos and documents
- **Moments Board** - Share quick updates and thoughts

### Administrative Features
- User registration and approval system
- Admin dashboard for family management
- Moderation tools
- User status management

## Tech Stack

- **Backend**: PHP
- **Database**: MySQL
- **Real-time Features**: Node.js (Socket.io)
- **Frontend**: HTML, CSS, JavaScript

## Project Structure

```
/kincircle/
├── index.php              # Homepage
├── login.php              # Authentication
├── register.php           # New user registration
├── config.php             # Database configuration
├── setup_database.sql     # Database schema
├── server.js              # Node.js real-time server
├── api/                   # API endpoints
├── css/                   # Stylesheets
├── js/                    # JavaScript files
├── images/                # Static images
├── uploads/               # User-uploaded content
├── templates/             # Email/page templates
└── private/               # Private configuration
```

## Key Pages

- `photos.php` - Photo gallery and upload
- `recipes.php` - Recipe management
- `events.php` - Event calendar
- `directory.php` - Family directory
- `inbox.php` - Private messaging
- `memorials.php` - Memorial pages
- `calendar.php` - Shared calendar view
- `admin.php` - Administrative dashboard

## Installation

1. Set up MySQL database:
   ```bash
   mysql -u root -p < setup_database.sql
   ```

2. Configure database connection in `config.php`

3. Set up file upload permissions:
   ```bash
   chmod 775 uploads/
   ```

4. Start Node.js server (for real-time features):
   ```bash
   npm install
   node server.js
   ```

5. Configure web server to serve from project root

## Security Features

- User approval system (admin must approve new registrations)
- Session-based authentication
- Private content restrictions
- Secure file upload handling

## Philosophy

Kin Circle is built on the principle that family connections should be private, ad-free, and algorithm-free. No data harvesting, no external tracking, no strangers. Just family.

---

**Status**: Production - Live at kincircle.net
**License**: Private
**Created**: 2025
