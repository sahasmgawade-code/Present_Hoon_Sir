const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');
const batchRoutes = require('./routes/batchRoutes');
const studentRoutes = require('./routes/studentRoutes');
const qrRoutes = require('./routes/qrRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');const reportRoutes = require('./routes/reportRoutes');
const contactRoutes = require('./routes/contactRoutes');
const app = express();
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000', // keep local dev working
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
}));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/contact', contactRoutes);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));