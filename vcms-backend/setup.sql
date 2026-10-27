CREATE DATABASE IF NOT EXISTS vcms;
CREATE USER IF NOT EXISTS 'vcms_user'@'localhost' IDENTIFIED BY 'vcms_pass';
GRANT ALL PRIVILEGES ON vcms.* TO 'vcms_user'@'localhost';
FLUSH PRIVILEGES;
