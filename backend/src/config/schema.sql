-- Admins (both Super Admin and regular Admin live here, differentiated by role)
CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'admin')),
  email_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
-- Batches
CREATE TABLE batches (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  qr_validity_minutes INTEGER NOT NULL DEFAULT 5,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Many-to-many: which admins manage which batches (supports collaboration)
CREATE TABLE batch_admins (
  batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
  admin_id INTEGER REFERENCES admins(id) ON DELETE CASCADE,
  PRIMARY KEY (batch_id, admin_id)
);

CREATE EXTENSION IF NOT EXISTS citext;

-- Students
-- Students
CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  urn CITEXT NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(150),
  parent_phone VARCHAR(20),
  batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
  is_blacklisted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (urn, batch_id),
  login_id VARCHAR(50) UNIQUE,
  password_hash VARCHAR(255)
);

-- QR sessions (one per "Generate QR" activation)
CREATE TABLE qr_sessions (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

-- Attendance records
CREATE TABLE attendance (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(10) NOT NULL CHECK (status IN ('present', 'absent')),
  method VARCHAR(10) NOT NULL CHECK (method IN ('qr', 'manual')),
  qr_session_id INTEGER REFERENCES qr_sessions(id) ON DELETE SET NULL,
  marked_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (student_id, date)
);

-- Device submissions log (for the 2-per-15-min cooldown rule)
CREATE TABLE qr_submissions (
  id SERIAL PRIMARY KEY,
  qr_session_id INTEGER REFERENCES qr_sessions(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
  device_token VARCHAR(255) NOT NULL,
  submitted_first_name VARCHAR(100),
  submitted_last_name VARCHAR(100),
  submitted_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_attendance_batch_date ON attendance(batch_id, date);
CREATE INDEX idx_students_batch ON students(batch_id);
CREATE INDEX idx_qr_submissions_device ON qr_submissions(device_token, submitted_at);