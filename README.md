# Kin Circle

**Private family social network — no ads, algorithms, or strangers**

A secure, private platform designed for families to share memories, connect, and stay organized. Built with privacy and simplicity at its core.

## Features

### Core Functionality
- **Photo Sharing** - Upload and organize family photos with tagging and albums
- **Recipe Collection** - Create, share, and preserve family recipes with modifications
- **Events Calendar** - Coordinate family gatherings and important dates
- **Family Directory** - Maintain contact information for all family members
- **Messaging** - Private inbox for family communications
- **Memorials** - Honor and remember departed family members
- **Media Library** - Share videos and documents
- **Moments Board** - Share quick updates and thoughts

### Administrative Features
- User registration and approval system
- Admin dashboard for family management
- Moderation tools for photos, media, and events
- User status management

### Storage Options
- **Local Storage** - Works out of the box with standard PHP hosting
- **Cloudflare R2** - Optional cloud storage for larger files (up to 2GB videos)

## Tech Stack

- **Backend**: PHP 8.x
- **Database**: MySQL/MariaDB
- **Real-time Features**: Node.js (Socket.io) - optional
- **Frontend**: HTML, CSS, JavaScript

## Installation

### 1. Requirements
- PHP 8.0+ with PDO MySQL extension
- MySQL 5.7+ or MariaDB 10.3+
- Web server (Apache/Nginx)
- Node.js 16+ (optional, for real-time features)

### 2. Database Setup
```bash
# Create database and run setup script
mysql -u root -p -e "CREATE DATABASE kincircle CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p kincircle < setup_database.sql
```

### 3. Configuration
Edit `config.php` with your database credentials:
```php
$host = 'localhost';
$dbname = 'kincircle';
$username = 'your_db_user';
$password = 'your_db_password';
```

### 4. File Permissions
```bash
chmod 775 uploads/
chmod 775 upload/
chmod 664 config.php
chmod 664 r2-config.php
```

### 5. Web Server Configuration
Point your web server to the project root. Example for Apache `.htaccess` is included.

### 6. Create First Admin User
Register through the web interface, then manually update the database:
```sql
UPDATE users SET is_admin = 1 WHERE username = 'your_username';
```

### 7. Real-time Features (Optional)
```bash
npm install
node server.js
```

## Cloudflare R2 Setup (Optional)

R2 enables direct browser uploads, bypassing PHP upload limits. This is optional - the system works fine with local storage.

### Why Use R2?
- Upload files up to 2GB (videos, large photo batches)
- Free egress bandwidth
- Reliable cloud storage
- Bypass shared hosting upload limits

### Setup Steps

1. **Create R2 Bucket**
   - Log into Cloudflare Dashboard
   - Go to R2 > Create Bucket
   - Name it (e.g., `familyname-media`)

2. **Create API Token**
   - R2 > Manage R2 API Tokens
   - Create token with "Object Read & Write" permissions
   - Specify your bucket
   - Save the Access Key ID and Secret Access Key

3. **Configure CORS on Bucket**
   In bucket settings, add CORS rules:
   ```json
   [
     {
       "AllowedOrigins": ["https://yourdomain.com"],
       "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

4. **Update r2-config.php**
   ```php
   define('R2_ENABLED', true);
   define('R2_ACCESS_KEY_ID', 'your_access_key');
   define('R2_SECRET_ACCESS_KEY', 'your_secret_key');
   define('R2_ACCOUNT_ID', 'your_account_id');
   define('R2_BUCKET', 'your-bucket-name');
   ```

5. **Protect Config File**
   Add to `.htaccess`:
   ```apache
   <Files "r2-config.php">
       Require all denied
   </Files>
   ```

### R2 Cost Estimate
- Storage: $0.015/GB/month
- Class A ops (writes): $4.50/million
- Class B ops (reads): $0.36/million
- Egress: **FREE**

For a family site with 100GB storage: ~$1.50-2/month

## Project Structure

```
/kincircle/
├── index.php              # Homepage
├── login.php              # Authentication
├── register.php           # New user registration
├── config.php             # Database configuration
├── r2-config.php          # R2 storage configuration (optional)
├── setup_database.sql     # Database schema
├── server.js              # Node.js real-time server
├── api/                   # API endpoints
├── css/                   # Stylesheets
├── js/                    # JavaScript files
├── lib/                   # PHP libraries (R2 helper)
├── images/                # Static images
├── uploads/               # Approved user content
├── upload/                # Upload handling
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

## Security Features

- User approval system (admin must approve new registrations)
- Session-based authentication with secure cookies
- Three-field password system (name|beverage|number) for memorable security
- Private content restrictions
- Secure file upload handling with type validation
- CSRF protection
- XSS prevention through input sanitization

## Philosophy

Kin Circle is built on the principle that family connections should be private, ad-free, and algorithm-free. No data harvesting, no external tracking, no strangers. Just family.

---

**License**: MIT
**Created**: 2025
