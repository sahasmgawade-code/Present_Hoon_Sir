const express = require('express');
const router = express.Router();
const {
  getMyBatches,
  getBatchStudents,
  createAssignment,
  listBatchAssignments,
  deleteAssignment,
  listSubmissions,
  gradeSubmission,
} = require('../controllers/facultyPortalController');
const { verifyFacultyToken } = require('../middleware/auth');
const { uploadAssignmentPdf } = require('../middleware/upload');

router.use(verifyFacultyToken);

router.get('/batches', getMyBatches);
router.get('/batches/:batchId/students', getBatchStudents);

router.get('/batches/:batchId/assignments', listBatchAssignments);
router.post('/batches/:batchId/assignments', uploadAssignmentPdf, createAssignment);
router.delete('/assignments/:id', deleteAssignment);

router.get('/assignments/:id/submissions', listSubmissions);
router.patch('/submissions/:id', gradeSubmission);

module.exports = router;