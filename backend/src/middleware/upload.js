const multer = require('multer');
const pdfOnlyUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed for assignments'));
    }
    cb(null, true);
  },
});
const ALLOWED_SUBMISSION_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
  'image/jpeg',
  'image/png',
];
const submissionUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_SUBMISSION_TYPES.includes(file.mimetype)) {
      return cb(new Error('Unsupported file type. Allowed: PDF, Word, PowerPoint, ZIP, JPG, PNG'));
    }
    cb(null, true);
  },
});
function uploadSingle(multerInstance, fieldName) {
  return (req, res, next) => {
    multerInstance.single(fieldName)(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: `A file is required (field: ${fieldName})` });
      next();
    });
  };
}
module.exports = {
  uploadAssignmentPdf: uploadSingle(pdfOnlyUpload, 'file'),
  uploadSubmissionFile: uploadSingle(submissionUpload, 'file'),
};