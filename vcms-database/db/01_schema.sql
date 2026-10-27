-- VCMS MySQL Schema for MySQL 8.0+
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS notification_log;
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS patients;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS vet_working_hours;
DROP TABLE IF EXISTS staff_accounts;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE staff_accounts (
  staff_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  phone VARCHAR(30),
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('Receptionist','Veterinarian','Veterinary Technician','Clinic Administrator') NOT NULL,
  must_change_password TINYINT(1) NOT NULL DEFAULT 1,
  active TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE vet_working_hours (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vet_id INT NOT NULL,
  weekday TINYINT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  UNIQUE KEY uq_vet_day (vet_id, weekday),
  CONSTRAINT fk_wh_vet FOREIGN KEY (vet_id) REFERENCES staff_accounts(staff_id)
);

CREATE TABLE clients (
  client_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(200),
  address TEXT,
  password_hash VARCHAR(255),
  status ENUM('active','inactive','merged') NOT NULL DEFAULT 'active',
  merged_into INT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_client_merged FOREIGN KEY (merged_into) REFERENCES clients(client_id)
);
CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_clients_email ON clients(email);

CREATE TABLE patients (
  patient_id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  species VARCHAR(100) NOT NULL,
  breed VARCHAR(100),
  date_of_birth DATE,
  estimated_age_years DECIMAL(4,1),
  sex CHAR(1),
  color_markings TEXT,
  microchip_number VARCHAR(50) UNIQUE,
  status ENUM('active','inactive','merged') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_patient_client FOREIGN KEY (client_id) REFERENCES clients(client_id)
);
CREATE INDEX idx_patients_client ON patients(client_id);

CREATE TABLE appointments (
  appointment_id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  vet_id INT NOT NULL,
  service_type VARCHAR(200) NOT NULL,
  slot_start DATETIME NOT NULL,
  duration_min INT NOT NULL DEFAULT 30,
  slot_end DATETIME GENERATED ALWAYS AS (DATE_ADD(slot_start, INTERVAL duration_min MINUTE)) STORED,
  status ENUM('Requested','Scheduled','Checked-In','In-Progress','Completed','Cancelled') NOT NULL DEFAULT 'Scheduled',
  source ENUM('staff','owner') NOT NULL DEFAULT 'staff',
  cancellation_reason TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_appt_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
  CONSTRAINT fk_appt_vet FOREIGN KEY (vet_id) REFERENCES staff_accounts(staff_id)
);
CREATE INDEX idx_appt_vet_time ON appointments(vet_id, slot_start);

CREATE TABLE audit_log (
  audit_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT NOT NULL,
  action VARCHAR(20) NOT NULL,
  old_data JSON,
  new_data JSON,
  changed_by INT,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_staff FOREIGN KEY (changed_by) REFERENCES staff_accounts(staff_id)
);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);

CREATE TABLE notification_log (
  notification_id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT,
  appointment_id INT,
  channel VARCHAR(20) NOT NULL DEFAULT 'email',
  kind ENUM('confirmation','reminder_24h','status_change') NOT NULL,
  message TEXT NOT NULL,
  delivery_status VARCHAR(50) NOT NULL DEFAULT 'Delivered (stub)',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_client FOREIGN KEY (client_id) REFERENCES clients(client_id),
  CONSTRAINT fk_notif_appt FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id)
);
