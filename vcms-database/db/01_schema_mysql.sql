-- VCMS Database Schema for MySQL 8.0+
-- Converted from PostgreSQL schema

USE vcms;

DROP TABLE IF EXISTS notification_log;
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS patients;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS vet_working_hours;
DROP TABLE IF EXISTS staff_accounts;

CREATE TABLE staff_accounts (
  staff_id      INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  phone         VARCHAR(50),
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('Receptionist','Veterinarian','Veterinary Technician','Clinic Administrator') NOT NULL,
  must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
  active        BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE vet_working_hours (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  vet_id     INT NOT NULL,
  weekday    INT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time   TIME NOT NULL,
  CHECK (end_time > start_time),
  UNIQUE KEY uq_vet_weekday (vet_id, weekday),
  CONSTRAINT fk_vwh_staff FOREIGN KEY (vet_id) REFERENCES staff_accounts(staff_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE clients (
  client_id     INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  phone         VARCHAR(50) NOT NULL,
  email         VARCHAR(255),
  address       TEXT,
  password_hash VARCHAR(255),
  status        ENUM('active','inactive','merged') NOT NULL DEFAULT 'active',
  merged_into   INT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_clients_phone (phone),
  INDEX idx_clients_email (email),
  CONSTRAINT fk_clients_merged FOREIGN KEY (merged_into) REFERENCES clients(client_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE patients (
  patient_id    INT AUTO_INCREMENT PRIMARY KEY,
  client_id     INT NOT NULL,
  name          VARCHAR(255) NOT NULL,
  species       VARCHAR(100) NOT NULL,
  breed         VARCHAR(100),
  date_of_birth DATE,
  estimated_age_years DECIMAL(4,1),
  sex           CHAR(1) CHECK (sex IN ('M','F')),
  color_markings VARCHAR(255),
  microchip_number VARCHAR(100) UNIQUE,
  status        ENUM('active','inactive','merged') NOT NULL DEFAULT 'active',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_patients_client (client_id),
  CONSTRAINT fk_patients_client FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE appointments (
  appointment_id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id   INT NOT NULL,
  vet_id       INT NOT NULL,
  service_type VARCHAR(100) NOT NULL,
  slot_start   DATETIME NOT NULL,
  duration_min INT NOT NULL DEFAULT 30 CHECK (duration_min > 0),
  slot_end     DATETIME GENERATED ALWAYS AS (DATE_ADD(slot_start, INTERVAL duration_min MINUTE)) STORED,
  status       ENUM('Requested','Scheduled','Checked-In','In-Progress','Completed','Cancelled') NOT NULL DEFAULT 'Scheduled',
  source       ENUM('staff','owner') NOT NULL DEFAULT 'staff',
  cancellation_reason TEXT,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_appt_vet_time (vet_id, slot_start),
  CONSTRAINT fk_appt_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE RESTRICT,
  CONSTRAINT fk_appt_vet FOREIGN KEY (vet_id) REFERENCES staff_accounts(staff_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE audit_log (
  audit_id    BIGINT AUTO_INCREMENT PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id   INT NOT NULL,
  action      VARCHAR(20) NOT NULL,
  old_data    JSON,
  new_data    JSON,
  changed_by  INT NULL,
  changed_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_entity (entity_type, entity_id),
  CONSTRAINT fk_audit_staff FOREIGN KEY (changed_by) REFERENCES staff_accounts(staff_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE notification_log (
  notification_id INT AUTO_INCREMENT PRIMARY KEY,
  client_id      INT NULL,
  appointment_id INT NULL,
  channel        VARCHAR(50) NOT NULL DEFAULT 'email',
  kind           ENUM('confirmation','reminder_24h','status_change') NOT NULL,
  message        TEXT NOT NULL,
  delivery_status VARCHAR(50) NOT NULL DEFAULT 'Delivered (stub)',
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_client FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE,
  CONSTRAINT fk_notif_appt FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Triggers & Procedures
DROP TRIGGER IF EXISTS trg_appt_hours_ins;
DROP TRIGGER IF EXISTS trg_appt_hours_upd;
DROP TRIGGER IF EXISTS trg_appt_status;
DROP TRIGGER IF EXISTS trg_clients_nodelete;
DROP TRIGGER IF EXISTS trg_patients_nodelete;
DROP TRIGGER IF EXISTS trg_audit_clients_ins;
DROP TRIGGER IF EXISTS trg_audit_clients_upd;
DROP TRIGGER IF EXISTS trg_audit_patients_ins;
DROP TRIGGER IF EXISTS trg_audit_patients_upd;
DROP TRIGGER IF EXISTS trg_audit_appts_ins;
DROP TRIGGER IF EXISTS trg_audit_appts_upd;

DELIMITER $$

-- Enforce working hours and double booking prevention
CREATE TRIGGER trg_appt_hours_ins BEFORE INSERT ON appointments
FOR EACH ROW
BEGIN
  DECLARE day_num INT;
  DECLARE st TIME;
  DECLARE et TIME;
  DECLARE match_count INT DEFAULT 0;
  DECLARE conflict_count INT DEFAULT 0;

  -- MySQL DAYOFWEEK is 1=Sun, 2=Mon... 7=Sat. We map to 0=Sun .. 6=Sat
  SET day_num = DAYOFWEEK(NEW.slot_start) - 1;

  SET st = TIME(NEW.slot_start);
  SET et = TIME(DATE_ADD(NEW.slot_start, INTERVAL NEW.duration_min MINUTE));

  SELECT COUNT(*) INTO match_count FROM vet_working_hours w
  WHERE w.vet_id = NEW.vet_id
    AND w.weekday = day_num
    AND st >= w.start_time
    AND et <= w.end_time;

  IF match_count = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Appointment is outside the veterinarian''s working hours';
  END IF;

  -- APT-4 Double booking check
  IF NEW.status <> 'Cancelled' THEN
    SELECT COUNT(*) INTO conflict_count FROM appointments a
    WHERE a.vet_id = NEW.vet_id
      AND a.status <> 'Cancelled'
      AND a.slot_start < DATE_ADD(NEW.slot_start, INTERVAL NEW.duration_min MINUTE)
      AND a.slot_end > NEW.slot_start;

    IF conflict_count > 0 THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'That slot is already booked for this veterinarian.';
    END IF;
  END IF;
END$$

CREATE TRIGGER trg_appt_hours_upd BEFORE UPDATE ON appointments
FOR EACH ROW
BEGIN
  DECLARE day_num INT;
  DECLARE st TIME;
  DECLARE et TIME;
  DECLARE match_count INT DEFAULT 0;
  DECLARE conflict_count INT DEFAULT 0;

  IF NEW.status = 'Cancelled' AND (NEW.cancellation_reason IS NULL OR TRIM(NEW.cancellation_reason) = '') THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'A cancellation reason is required.';
  END IF;

  IF NEW.slot_start <> OLD.slot_start OR NEW.duration_min <> OLD.duration_min OR NEW.vet_id <> OLD.vet_id THEN
    SET day_num = (DAYOFWEEK(NEW.slot_start) + 5) % 7;
    IF DAYOFWEEK(NEW.slot_start) = 1 THEN
      SET day_num = 0;
    END IF;

    SET st = TIME(NEW.slot_start);
    SET et = TIME(DATE_ADD(NEW.slot_start, INTERVAL NEW.duration_min MINUTE));

    SELECT COUNT(*) INTO match_count FROM vet_working_hours w
    WHERE w.vet_id = NEW.vet_id
      AND w.weekday = day_num
      AND st >= w.start_time
      AND et <= w.end_time;

    IF match_count = 0 THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Appointment is outside the veterinarian''s working hours';
    END IF;

    IF NEW.status <> 'Cancelled' THEN
      SELECT COUNT(*) INTO conflict_count FROM appointments a
      WHERE a.vet_id = NEW.vet_id
        AND a.appointment_id <> OLD.appointment_id
        AND a.status <> 'Cancelled'
        AND a.slot_start < DATE_ADD(NEW.slot_start, INTERVAL NEW.duration_min MINUTE)
        AND a.slot_end > NEW.slot_start;

      IF conflict_count > 0 THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'That slot is already booked for this veterinarian.';
      END IF;
    END IF;
  END IF;
END$$

-- Status transition rules
CREATE TRIGGER trg_appt_status BEFORE UPDATE ON appointments
FOR EACH ROW
BEGIN
  IF NEW.status <> OLD.status THEN
    IF NOT (
      (OLD.status = 'Requested' AND NEW.status IN ('Scheduled', 'Cancelled')) OR
      (OLD.status = 'Scheduled' AND NEW.status IN ('Checked-In', 'Cancelled')) OR
      (OLD.status = 'Checked-In' AND NEW.status = 'In-Progress') OR
      (OLD.status = 'In-Progress' AND NEW.status = 'Completed')
    ) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Illegal status change.';
    END IF;
  END IF;
END$$

-- No delete triggers
CREATE TRIGGER trg_clients_nodelete BEFORE DELETE ON clients
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Deleting clients records is not allowed; mark inactive instead';
END$$

CREATE TRIGGER trg_patients_nodelete BEFORE DELETE ON patients
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Deleting patients records is not allowed; mark inactive instead';
END$$

-- Audit triggers (reads @app_user_id session variable)
CREATE TRIGGER trg_audit_clients_ins AFTER INSERT ON clients
FOR EACH ROW
BEGIN
  INSERT INTO audit_log(entity_type, entity_id, action, new_data, changed_by)
  VALUES ('clients', NEW.client_id, 'INSERT',
    JSON_OBJECT('client_id', NEW.client_id, 'name', NEW.name, 'phone', NEW.phone, 'email', NEW.email, 'status', NEW.status),
    @app_user_id);
END$$

CREATE TRIGGER trg_audit_clients_upd AFTER UPDATE ON clients
FOR EACH ROW
BEGIN
  INSERT INTO audit_log(entity_type, entity_id, action, old_data, new_data, changed_by)
  VALUES ('clients', NEW.client_id, 'UPDATE',
    JSON_OBJECT('client_id', OLD.client_id, 'name', OLD.name, 'phone', OLD.phone, 'email', OLD.email, 'status', OLD.status),
    JSON_OBJECT('client_id', NEW.client_id, 'name', NEW.name, 'phone', NEW.phone, 'email', NEW.email, 'status', NEW.status),
    @app_user_id);
END$$

CREATE TRIGGER trg_audit_patients_ins AFTER INSERT ON patients
FOR EACH ROW
BEGIN
  INSERT INTO audit_log(entity_type, entity_id, action, new_data, changed_by)
  VALUES ('patients', NEW.patient_id, 'INSERT',
    JSON_OBJECT('patient_id', NEW.patient_id, 'client_id', NEW.client_id, 'name', NEW.name, 'species', NEW.species, 'status', NEW.status),
    @app_user_id);
END$$

CREATE TRIGGER trg_audit_patients_upd AFTER UPDATE ON patients
FOR EACH ROW
BEGIN
  INSERT INTO audit_log(entity_type, entity_id, action, old_data, new_data, changed_by)
  VALUES ('patients', NEW.patient_id, 'UPDATE',
    JSON_OBJECT('patient_id', OLD.patient_id, 'client_id', OLD.client_id, 'name', OLD.name, 'species', OLD.species, 'status', OLD.status),
    JSON_OBJECT('patient_id', NEW.patient_id, 'client_id', NEW.client_id, 'name', NEW.name, 'species', NEW.species, 'status', NEW.status),
    @app_user_id);
END$$

CREATE TRIGGER trg_audit_appts_ins AFTER INSERT ON appointments
FOR EACH ROW
BEGIN
  INSERT INTO audit_log(entity_type, entity_id, action, new_data, changed_by)
  VALUES ('appointments', NEW.appointment_id, 'INSERT',
    JSON_OBJECT('appointment_id', NEW.appointment_id, 'patient_id', NEW.patient_id, 'vet_id', NEW.vet_id, 'slot_start', NEW.slot_start, 'status', NEW.status),
    @app_user_id);
END$$

CREATE TRIGGER trg_audit_appts_upd AFTER UPDATE ON appointments
FOR EACH ROW
BEGIN
  INSERT INTO audit_log(entity_type, entity_id, action, old_data, new_data, changed_by)
  VALUES ('appointments', NEW.appointment_id, 'UPDATE',
    JSON_OBJECT('appointment_id', OLD.appointment_id, 'patient_id', OLD.patient_id, 'vet_id', OLD.vet_id, 'slot_start', OLD.slot_start, 'status', OLD.status),
    JSON_OBJECT('appointment_id', NEW.appointment_id, 'patient_id', NEW.patient_id, 'vet_id', NEW.vet_id, 'slot_start', NEW.slot_start, 'status', NEW.status),
    @app_user_id);
END$$

-- Client merge procedure
DROP PROCEDURE IF EXISTS merge_clients$$
CREATE PROCEDURE merge_clients(IN keep_id INT, IN drop_id INT)
BEGIN
  IF keep_id = drop_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Choose two different clients';
  END IF;
  UPDATE patients SET client_id = keep_id WHERE client_id = drop_id;
  UPDATE clients SET status = 'merged', merged_into = keep_id WHERE client_id = drop_id;
END$$

DELIMITER ;
