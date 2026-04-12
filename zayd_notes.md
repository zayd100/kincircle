THE NODE SERVER CURRENTLY IS ONLY FOR REAL TIME FEATURES. 
GET LARAGON.
Apache will server the php files to the browser.
PHP will execute the app logic
HEIDISQL in laragon will be GUI to manage the database

A docker-compose.yml for this app would look roughly like:
yamlservices:
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