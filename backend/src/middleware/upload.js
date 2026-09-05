const multer = require('multer');
const path = require('path');

const PDF_EXTENSIONS = ['.pdf'];
const SUBMISSION_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.zip', '.jpg', '.jpeg', '.png'];

// The set of "real" mime types (detected from file bytes, not the client's claim)
// that each upload type is allowed to actually be.
const PDF_MAGIC_MIMES = ['application/pdf'];
const SUBMISSION_MAGIC_MIMES = [
  'application/pdf',
  'application/zip',      // .docx, .pptx and .zip are all zip containers at the byte level
  'application/x-cfb',    // legacy binary .doc / .ppt (OLE2 compound file format)
  'image/jpeg',
  'image/png',
];

async function detectFileType(buffer) {
  const { fileTypeFromBuffer } = await import('file-type');
  return fileTypeFromBuffer(buffer);
}

// Confirms the uploaded bytes actually are one of the allowed types, regardless
// of what the client claimed via Content-Type or the filename extension.
async function verifyMagicBytes(file, allowedMagicMimes) {
  const detected = await detectFileType(file.buffer);
  // Text-based/unrecognized content (html, svg, php, js, plain scripts, etc.)
  // won't match a known binary signature -> fail closed and reject it.
  if (!detected || !allowedMagicMimes.includes(detected.mime)) {
    return false;
  }
  return true;
}

const pdfOnlyUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed for assignments'));
    }
    if (!PDF_EXTENSIONS.includes(path.extname(file.originalname).toLowerCase())) {
      return cb(new Error('Only .pdf files are allowed for assignments'));
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
    if (!SUBMISSION_EXTENSIONS.includes(path.extname(file.originalname).toLowerCase())) {
      return cb(new Error('Unsupported file extension. Allowed: PDF, Word, PowerPoint, ZIP, JPG, PNG'));
    }
    cb(null, true);
  },
});

function uploadSingle(multerInstance, fieldName, allowedMagicMimes) {
  return (req, res, next) => {
    multerInstance.single(fieldName)(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: `A file is required (field: ${fieldName})` });
      try {
        const ok = await verifyMagicBytes(req.file, allowedMagicMimes);
        if (!ok) {
          return res.status(400).json({ error: 'File content does not match an allowed file type.' });
        }
      } catch (verifyErr) {
        console.error('File signature verification failed:', verifyErr);
        return res.status(400).json({ error: 'Could not verify file contents.' });
      }
      next();
    });
  };
}

module.exports = {
  uploadAssignmentPdf: uploadSingle(pdfOnlyUpload, 'file', PDF_MAGIC_MIMES),
  uploadSubmissionFile: uploadSingle(submissionUpload, 'file', SUBMISSION_MAGIC_MIMES),
};