const pool = require('../config/db');

// Create a batch (super_admin or admin), optionally with collaborating admins
async function createBatch(req, res) {
  const { name, collaboratorIds } = req.body;
  if (!name) return res.status(400).json({ error: 'Batch name is required' });

  try {
    const result = await pool.query(
      `INSERT INTO batches (name, created_by) VALUES ($1, $2) RETURNING *`,
      [name, req.admin.id]
    );
    const batch = result.rows[0];

    // Auto-assign creator to the batch via batch_admins
    await pool.query(
      `INSERT INTO batch_admins (batch_id, admin_id) VALUES ($1, $2)`,
      [batch.id, req.admin.id]
    );

    // assign any collaborating admins picked at creation time
    if (Array.isArray(collaboratorIds) && collaboratorIds.length > 0) {
      const uniqueIds = [...new Set(collaboratorIds)].filter(
        (id) => Number.isInteger(id) && id !== req.admin.id
      );
      for (const adminId of uniqueIds) {
        await pool.query(
          `INSERT INTO batch_admins (batch_id, admin_id) VALUES ($1, $2)
           ON CONFLICT (batch_id, admin_id) DO NOTHING`,
          [batch.id, adminId]
        );
      }
    }

    res.status(201).json({ batch });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Delete a batch — only a super_admin or the admin who created it may do this.
// A regular collaborating admin (assigned via batch_admins) is NOT enough,
// since deleting a batch cascades to all its students, attendance, and QR history.
async function deleteBatch(req, res) {
  const { id } = req.params;
  try {
    const batchRes = await pool.query('SELECT created_by FROM batches WHERE id = $1', [id]);
    if (batchRes.rows.length === 0) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const isCreator = batchRes.rows[0].created_by === req.admin.id;
    if (req.admin.role !== 'super_admin' && !isCreator) {
      return res.status(403).json({ error: 'Only a super admin or the batch creator can delete this batch' });
    }

    const result = await pool.query('DELETE FROM batches WHERE id = $1 RETURNING id', [id]);
    res.json({ message: 'Batch deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Any admin with access to the batch can update its settings (currently just QR validity duration)
async function updateBatchSettings(req, res) {
  const { id } = req.params;
  const { qrValidityMinutes } = req.body;

  const minutes = Number(qrValidityMinutes);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) {
    return res.status(400).json({ error: 'qrValidityMinutes must be an integer between 1 and 180' });
  }

  try {
    // same access-check pattern used elsewhere: super_admin always allowed,
    // regular admin only if assigned to this batch
    if (req.admin.role !== 'super_admin') {
      const access = await pool.query(
        'SELECT 1 FROM batch_admins WHERE batch_id = $1 AND admin_id = $2',
        [id, req.admin.id]
      );
      if (access.rows.length === 0) return res.status(403).json({ error: 'No access to this batch' });
    }

    const result = await pool.query(
      `UPDATE batches SET qr_validity_minutes = $1 WHERE id = $2 RETURNING *`,
      [minutes, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Batch not found' });
    }
    res.json({ batch: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}
// List batches — super_admin sees all, admin sees only assigned ones
async function listBatches(req, res) {
  try {
    let result;
    if (req.admin.role === 'super_admin') {
      result = await pool.query('SELECT * FROM batches ORDER BY id');
    } else {
      result = await pool.query(
        `SELECT b.* FROM batches b
         JOIN batch_admins ba ON ba.batch_id = b.id
         WHERE ba.admin_id = $1
         ORDER BY b.id`,
        [req.admin.id]
      );
    }
    res.json({ batches: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Super admin assigns/reassigns an admin to a batch
async function assignAdminToBatch(req, res) {
  const { id } = req.params; // batch id
  const { adminId } = req.body;

  if (!adminId) return res.status(400).json({ error: 'adminId is required' });

  try {
    const batch = await pool.query('SELECT id FROM batches WHERE id = $1', [id]);
    if (batch.rows.length === 0) return res.status(404).json({ error: 'Batch not found' });

    const admin = await pool.query('SELECT id FROM admins WHERE id = $1', [adminId]);
    if (admin.rows.length === 0) return res.status(404).json({ error: 'Admin not found' });

    await pool.query(
      `INSERT INTO batch_admins (batch_id, admin_id) VALUES ($1, $2)
       ON CONFLICT (batch_id, admin_id) DO NOTHING`,
      [id, adminId]
    );

    res.json({ message: 'Admin assigned to batch' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Super admin revokes an admin's access to a batch
async function revokeAdminFromBatch(req, res) {
  const { id, adminId } = req.params; // batch id, admin id

  try {
    const batch = await pool.query('SELECT id FROM batches WHERE id = $1', [id]);
    if (batch.rows.length === 0) return res.status(404).json({ error: 'Batch not found' });

    const result = await pool.query(
      'DELETE FROM batch_admins WHERE batch_id = $1 AND admin_id = $2 RETURNING *',
      [id, adminId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin does not have access to this batch' });
    }

    res.json({ message: 'Admin access revoked' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}
module.exports = { createBatch, deleteBatch, listBatches, assignAdminToBatch, revokeAdminFromBatch, updateBatchSettings };