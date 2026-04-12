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
