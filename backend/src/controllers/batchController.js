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

// Archive a batch — only a super_admin or the admin who created it may do this.
// Archiving hides the batch from normal views but preserves all students,
// attendance, and QR history untouched.
async function archiveBatch(req, res) {
  const { id } = req.params;
  try {
    const batchRes = await pool.query('SELECT created_by, is_archived FROM batches WHERE id = $1', [id]);
    if (batchRes.rows.length === 0) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const isCreator = batchRes.rows[0].created_by === req.admin.id;
    if (req.admin.role !== 'super_admin' && !isCreator) {
      return res.status(403).json({ error: 'Only a super admin or the batch creator can archive this batch' });
    }

    if (batchRes.rows[0].is_archived) {
      return res.status(400).json({ error: 'Batch is already archived' });
    }

    const result = await pool.query(
      'UPDATE batches SET is_archived = TRUE WHERE id = $1 RETURNING *',
      [id]
    );
    res.json({ message: 'Batch archived', batch: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Restore a previously archived batch back to active.
async function restoreBatch(req, res) {
  const { id } = req.params;
  try {
    const batchRes = await pool.query('SELECT created_by, is_archived FROM batches WHERE id = $1', [id]);
    if (batchRes.rows.length === 0) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const isCreator = batchRes.rows[0].created_by === req.admin.id;
    if (req.admin.role !== 'super_admin' && !isCreator) {
      return res.status(403).json({ error: 'Only a super admin or the batch creator can restore this batch' });
    }

    if (!batchRes.rows[0].is_archived) {
      return res.status(400).json({ error: 'Batch is not archived' });
    }

    const result = await pool.query(
      'UPDATE batches SET is_archived = FALSE WHERE id = $1 RETURNING *',
      [id]
    );
    res.json({ message: 'Batch restored', batch: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Permanently delete a batch — super_admin only. This is a separate,
// deliberately harder-to-reach action from archiving, since it's irreversible
// and cascades to all students, attendance, and QR history.
async function deleteBatch(req, res) {
  const { id } = req.params;
  try {
    if (req.admin.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only a super admin can permanently delete a batch' });
    }

    const batchRes = await pool.query('SELECT id FROM batches WHERE id = $1', [id]);
    if (batchRes.rows.length === 0) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    await pool.query('DELETE FROM batches WHERE id = $1', [id]);
    res.json({ message: 'Batch permanently deleted' });
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
// List batches — super_admin sees all, admin sees only assigned ones.
// Archived batches are excluded unless ?includeArchived=true is passed.
async function listBatches(req, res) {
  const includeArchived = req.query.includeArchived === 'true';
  try {
    let result;
    if (req.admin.role === 'super_admin') {
      result = includeArchived
        ? await pool.query('SELECT * FROM batches ORDER BY id')
        : await pool.query('SELECT * FROM batches WHERE is_archived = FALSE ORDER BY id');
    } else {
      result = includeArchived
        ? await pool.query(
            `SELECT b.* FROM batches b
             JOIN batch_admins ba ON ba.batch_id = b.id
             WHERE ba.admin_id = $1
             ORDER BY b.id`,
            [req.admin.id]
          )
        : await pool.query(
            `SELECT b.* FROM batches b
             JOIN batch_admins ba ON ba.batch_id = b.id
             WHERE ba.admin_id = $1 AND b.is_archived = FALSE
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
module.exports = {
  createBatch,
  deleteBatch,
  archiveBatch,
  restoreBatch,
  listBatches,
  assignAdminToBatch,
  revokeAdminFromBatch,
  updateBatchSettings,
};