const express = require('express');
const router = express.Router();
const {
  createBatch,
  deleteBatch,
  archiveBatch,
  restoreBatch,
  listBatches,
  assignAdminToBatch,
  revokeAdminFromBatch,
  updateBatchSettings,
} = require('../controllers/batchController');
const { verifyToken, requireRole } = require('../middleware/auth');
router.use(verifyToken); // all batch routes require login
router.delete('/:id/assign-admin/:adminId', requireRole('super_admin'), revokeAdminFromBatch);
router.get('/', listBatches);
router.post('/', createBatch);
router.patch('/:id/archive', archiveBatch);
router.patch('/:id/restore', restoreBatch);
router.delete('/:id', requireRole('super_admin'), deleteBatch);
router.post('/:id/assign-admin', requireRole('super_admin'), assignAdminToBatch);
router.patch('/:id/settings', updateBatchSettings);

module.exports = router;