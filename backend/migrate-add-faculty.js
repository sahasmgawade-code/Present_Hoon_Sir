const pool = require('./src/config/db');

(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS faculties (
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
    `);

    // Which admins can see/manage a given faculty (creator + collaborators)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS faculty_admins (
        faculty_id INTEGER REFERENCES faculties(id) ON DELETE CASCADE,
        admin_id INTEGER REFERENCES admins(id) ON DELETE CASCADE,
        PRIMARY KEY (faculty_id, admin_id)
      );
    `);

    // Which batches a faculty is allowed to take attendance / post assignments for
    await pool.query(`
      CREATE TABLE IF NOT EXISTS faculty_batches (
        faculty_id INTEGER REFERENCES faculties(id) ON DELETE CASCADE,
        batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
        PRIMARY KEY (faculty_id, batch_id)
      );
    `);

    // Assignments posted by faculty for a batch (PDF lives in Google Drive)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS assignments (
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
    `);

    // Student submissions against an assignment (file also in Google Drive)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS assignment_submissions (
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
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_faculty_batches_faculty ON faculty_batches(faculty_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_faculty_admins_admin ON faculty_admins(admin_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_assignments_batch ON assignments(batch_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON assignment_submissions(assignment_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_submissions_student ON assignment_submissions(student_id);`);

    console.log('Migration successful: faculty + assignment tables created.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
})();