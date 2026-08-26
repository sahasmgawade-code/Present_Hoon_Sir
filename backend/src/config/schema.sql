-- Admins (both Super Admin and regular Admin live here, differentiated by role)
CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'admin')),
  email_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP,
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
  created_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
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

-- Faculties (created by admins, log in separately from admins/students)
CREATE TABLE faculties (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  created_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Which admins can see/manage a given faculty (creator + collaborators)
CREATE TABLE faculty_admins (
  faculty_id INTEGER REFERENCES faculties(id) ON DELETE CASCADE,
  admin_id INTEGER REFERENCES admins(id) ON DELETE CASCADE,
  PRIMARY KEY (faculty_id, admin_id)
);

-- Which batches a faculty is allowed to work with
CREATE TABLE faculty_batches (
  faculty_id INTEGER REFERENCES faculties(id) ON DELETE CASCADE,
  batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
  PRIMARY KEY (faculty_id, batch_id)
);

-- Assignments posted by faculty for a batch (PDF lives in Google Drive)
CREATE TABLE assignments (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
  faculty_id INTEGER REFERENCES faculties(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  due_date DATE,
  drive_file_id VARCHAR(255) NOT NULL,
  drive_file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Student submissions against an assignment (file also in Google Drive)
CREATE TABLE assignment_submissions (
  id SERIAL PRIMARY KEY,
  assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  drive_file_id VARCHAR(255) NOT NULL,
  drive_file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'incomplete')),
  remark TEXT,
  submitted_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  UNIQUE (assignment_id, student_id)
);

CREATE INDEX idx_faculty_batches_faculty ON faculty_batches(faculty_id);
CREATE INDEX idx_faculty_admins_admin ON faculty_admins(admin_id);
CREATE INDEX idx_assignments_batch ON assignments(batch_id);
CREATE INDEX idx_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX idx_submissions_student ON assignment_submissions(student_id);