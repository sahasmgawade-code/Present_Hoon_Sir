const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token']
};
app.use(cors(corsOptions));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' }
});
app.use('/api', limiter);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

const { generateCsrfToken, ensureCsrfSessionId } = require('./middleware/csrf');

app.get('/api/csrf-token', ensureCsrfSessionId, (req, res) => {
  const csrfToken = generateCsrfToken(req, res);
  res.json({ csrfToken });
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admins', require('./routes/adminRoutes'));
app.use('/api/batches', require('./routes/batchRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/faculty-auth', require('./routes/facultyAuthRoutes'));
app.use('/api/faculty-portal', require('./routes/facultyPortalRoutes'));
app.use('/api/faculties', require('./routes/facultyRoutes'));
app.use('/api/qr', require('./routes/qrRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/student-auth', require('./routes/studentAuthRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));

app.use((req, res, next) => {
  res.status(404).json({ message: `Cannot ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack || err);
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(statusCode).json({
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});