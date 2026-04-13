# Project Setup Overview

## Node.js
- The Node server is currently **only for real-time features**.

## Local Development
- **Laragon**: Use Laragon as your local environment.
- **Apache**: Will serve the PHP files to the browser.
- **PHP**: Executes the core application logic.
- **HeidiSQL**: GUI tool (bundled with Laragon) to manage the database.

## Docker Setup
A `docker-compose.yml` for this app would look roughly like:

```yaml
services:
  php:
    image: php:8.2-apache
    ports:
      - "8080:80"
    volumes:
      - ./:/var/www/html
  
  mysql:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: kincircle



---

## What I Did

Got the app running locally for the first time. The project is a PHP + MySQL app that previously had no local environment set up.

---

## Problems & Fixes

### 1. Tried to run it with Node
`node server.js` threw an error looking for `index.html`. Investigated `server.js` and found it's a dead stub — almost every endpoint returns `501 Not Implemented`. It's only needed for optional real-time features. **Ignored it entirely.**

### 2. PHP not installed
Running `php -S localhost:8000` failed — PHP wasn't on the system PATH. **Fixed by installing Laragon** (bundles Apache + PHP 8.3 + MySQL 8.4), which handles everything via GUI with no manual config.

### 3. Missing config.php
The project had no `config.php`. **Created it from scratch** with Laragon's default credentials (`root` / no password) and helper functions (`isLoggedIn`, `isAdmin`, `requireLogin`, `sanitizeInput`).

### 4. Database collation mismatch
Running `setup_database.sql` threw `Unknown collation: utf8mb4_uca1400_ai_ci`. This collation is MariaDB-specific but we're running MySQL 8.4. **Fixed with VS Code find & replace** (`Ctrl+H`):
- Find: `utf8mb4_uca1400_ai_ci`
- Replace: `utf8mb4_unicode_ci`

### 5. Dummy user insert failed
First insert included a `status` column that doesn't exist in the schema. Ran `DESCRIBE users` to check actual columns, then removed `status` from the query.

### 6. Wrong password hash
The bcrypt hash I used wasn't generated for the three-field format (`name|beverage|number`). Generated the correct one via Laragon terminal:
```
php -r "echo password_hash('password|password|password', PASSWORD_DEFAULT);"
```
Inserted that hash and login worked.

---

## Current State
- App runs at `http://localhost/kincircle/login.php`
- Database is set up with all tables
- One admin user exists: all three fields are `password`
- Can log in and browse the app

---

## How to Pick Up Locally (Future Self)

1. Open **Laragon** → click **Start All**
2. Go to `http://localhost/kincircle/login.php`
3. Login: Name `password` / Beverage `password` / Number `password`

That's it. MySQL and Apache start automatically with Laragon.

If Laragon isn't installed on the machine, reinstall it from laragon.org, move the `kincircle` folder to `C:\laragon\www\`, and re-import the database:
- Open HeidiSQL → create database `kincircle` → File → Run SQL File → `setup_database.sql`
- Re-run the dummy user insert from `DEVLOG.md`

---

## Files Added
- `config.php` — database connection, session start, helper functions
- `setup_database.sql` — collation fix applied (utf8mb4_unicode_ci)
