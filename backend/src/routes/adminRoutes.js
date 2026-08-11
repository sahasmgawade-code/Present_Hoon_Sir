const express = require('express');
const router = express.Router();
const { createAdmin, updateAdmin, deleteAdmin, listAdmins, listAdminsBasic, getAdminBatchAccess, toggleEmailNotifications, toggleSmsNotifications } = require('../controllers/adminController');
const { verifyToken, requireRole } = require('../middleware/auth');

// Any authenticated admin can call this — used for the batch-collaborator picker
router.get('/basic', verifyToken, listAdminsBasic);

// Everything below requires super_admin
router.use(verifyToken, requireRole('super_admin'));
router.get('/:id/batches', getAdminBatchAccess);
router.patch('/:id/notifications', toggleEmailNotifications);
router.patch('/:id/sms-notifications', toggleSmsNotifications);
router.post('/', createAdmin);
router.put('/:id', updateAdmin);
router.delete('/:id', deleteAdmin);
router.get('/', listAdmins);

module.exports = router;