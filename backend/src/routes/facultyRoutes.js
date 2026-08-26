const express = require('express');
const router = express.Router();
const {
  createFaculty,
  listFaculties,
  updateFaculty,
  toggleFacultyActive,
  deleteFaculty,
  addFacultyCollaborator,
  removeFacultyCollaborator,
  getFacultyBatchAccess,
  assignBatchToFaculty,
  revokeBatchFromFaculty,
} = require('../controllers/facultyController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', listFaculties);
router.post('/', createFaculty);
router.put('/:id', updateFaculty);
router.patch('/:id/active', toggleFacultyActive);
router.delete('/:id', deleteFaculty);

router.post('/:id/collaborators', addFacultyCollaborator);
router.delete('/:id/collaborators/:adminId', removeFacultyCollaborator);

router.get('/:id/batches', getFacultyBatchAccess);
router.post('/:id/batches', assignBatchToFaculty);
router.delete('/:id/batches/:batchId', revokeBatchFromFaculty);

module.exports = router;