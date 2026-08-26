const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('attendqr_token');
}
function getStudentToken() {
  return localStorage.getItem('attendqr_student_token');
}
function getFacultyToken() {
  return localStorage.getItem('attendqr_faculty_token');
}
function getDeviceToken() {
  let deviceToken = localStorage.getItem('attendqr_device_token');
  if (!deviceToken) {
    deviceToken = crypto.randomUUID();
    localStorage.setItem('attendqr_device_token', deviceToken);
  }
  return deviceToken;
}

function tokenFor(authType) {
  if (authType === 'student') return getStudentToken();
  if (authType === 'faculty') return getFacultyToken();
  return getToken();
}

async function request(path, { method = 'GET', body, headers = {}, raw = false, authType = 'admin' } = {}) {
  const token = tokenFor(authType);
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (raw) return res; // caller handles the response itself (e.g. file download)

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no JSON body
  }

  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data;
}

// For multipart/form-data uploads (assignment PDFs, submission files) — the
// browser sets the Content-Type boundary itself, so it must NOT be set here.
async function requestForm(path, formData, { method = 'POST', authType = 'admin' } = {}) {
  const token = tokenFor(authType);
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no JSON body
  }

  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  changePassword: (currentPassword, newPassword) =>
    request('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),
  listAdmins: () => request('/admins'),
  submitContact: (payload) => request('/contact', { method: 'POST', body: payload }),
  listAdminsBasic: () => request('/admins/basic'),
  getAdminBatchAccess: (adminId) => request(`/admins/${adminId}/batches`),
  getOwnProfile: () => request('/admins/me'),
  createAdmin: (payload) => request('/admins', { method: 'POST', body: payload }),
  verifyResetToken: (token) => request(`/auth/verify-reset-token/${token}`),
  setPassword: (token, password) => request('/auth/set-password', { method: 'POST', body: { token, password } }),
  updateAdmin: (id, name) => request(`/admins/${id}`, { method: 'PUT', body: { name } }),
  deleteAdmin: (id) => request(`/admins/${id}`, { method: 'DELETE' }),
  toggleAdminEmailNotifications: (id, enabled) =>
    request(`/admins/${id}/notifications`, { method: 'PATCH', body: { enabled } }),
  toggleAdminSmsNotifications: (id, enabled) =>
    request(`/admins/${id}/sms-notifications`, { method: 'PATCH', body: { enabled } }),
  listBatches: (includeArchived = false) =>
    request(`/batches${includeArchived ? '?includeArchived=true' : ''}`),
  createBatch: (name, collaboratorIds = []) =>
    request('/batches', { method: 'POST', body: { name, collaboratorIds } }),
  archiveBatch: (id) => request(`/batches/${id}/archive`, { method: 'PATCH' }),
  restoreBatch: (id) => request(`/batches/${id}/restore`, { method: 'PATCH' }),
  deleteBatch: (id) => request(`/batches/${id}`, { method: 'DELETE' }),
  updateBatchSettings: (id, qrValidityMinutes) =>
    request(`/batches/${id}/settings`, { method: 'PATCH', body: { qrValidityMinutes } }),
  assignAdminToBatch: (batchId, adminId) =>
    request(`/batches/${batchId}/assign-admin`, { method: 'POST', body: { adminId } }),
  revokeAdminFromBatch: (batchId, adminId) =>
    request(`/batches/${batchId}/assign-admin/${adminId}`, { method: 'DELETE' }),
  listStudents: (batchId) => request(`/students/batch/${batchId}`),
  listMyStudents: () => request('/students/mine'),
  getStudent: (studentId) => request(`/students/${studentId}`),
  createStudent: (batchId, payload) => request(`/students/batch/${batchId}`, { method: 'POST', body: payload }),
  addStudentGeneral: (payload) => request('/students', { method: 'POST', body: payload }),
  updateStudent: (id, payload) => request(`/students/${id}`, { method: 'PUT', body: payload }),
  deleteStudent: (id) => request(`/students/${id}`, { method: 'DELETE' }),
  blacklistStudent: (id, blacklisted) =>
    request(`/students/${id}/blacklist`, { method: 'PATCH', body: { blacklisted } }),
  setStudentCredentials: (studentId, loginId, password) =>
    request(`/students/${studentId}/credentials`, { method: 'PATCH', body: { loginId, password } }),
  studentLogin: (loginId, password) =>
    request('/student-auth/login', { method: 'POST', body: { loginId, password } }),
  getMyAttendance: () => request('/student-auth/me', { authType: 'student' }),
  getMyAssignments: () => request('/student-auth/assignments', { authType: 'student' }),
  submitAssignment: (assignmentId, formData) =>
    requestForm(`/student-auth/assignments/${assignmentId}/submit`, formData, { authType: 'student' }),
  getAttendanceForDate: (batchId, date) => request(`/attendance/batch/${batchId}?date=${date}`),
  saveAttendance: (batchId, date, records) =>
    request(`/attendance/batch/${batchId}`, { method: 'POST', body: { date, records } }),

  generateQrSession: (batchId) => request(`/qr/batch/${batchId}/generate`, { method: 'POST' }),
  getQrSessionStatus: (token) => request(`/qr/${token}/status`),
  submitQrAttendance: (token, payload) => request(`/qr/${token}/submit`, { method: 'POST', body: payload }),
  getQrSessionReport: (sessionId) => request(`/qr/${sessionId}/report`),
  downloadQrSessionCsv: (sessionId) => request(`/qr/${sessionId}/download`, { raw: true }),
  downloadAndSaveQrSessionCsv: async (sessionId) => {
    const res = await request(`/qr/${sessionId}/download`, { raw: true });
    await triggerFileDownload(res);
  },
  getBatchReport: (batchId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/reports/batch/${batchId}${qs ? `?${qs}` : ''}`);
  },
  getBatchMatrix: (batchId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/reports/batch/${batchId}/matrix${qs ? `?${qs}` : ''}`);
  },
  getStudentReport: (studentId) => request(`/reports/student/${studentId}`),

  // --- Faculty auth (faculty portal login) ---
  facultyLogin: (email, password) =>
    request('/faculty-auth/login', { method: 'POST', body: { email, password } }),
  verifyFacultyResetToken: (token) => request(`/faculty-auth/verify-reset-token/${token}`),
  setFacultyPassword: (token, password) =>
    request('/faculty-auth/set-password', { method: 'POST', body: { token, password } }),
  changeFacultyPassword: (currentPassword, newPassword) =>
    request('/faculty-auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
      authType: 'faculty',
    }),

  // --- Faculty management (admin side) ---
  listFaculties: () => request('/faculties'),
  createFaculty: (payload) => request('/faculties', { method: 'POST', body: payload }),
  updateFaculty: (id, name) => request(`/faculties/${id}`, { method: 'PUT', body: { name } }),
  toggleFacultyActive: (id, isActive) =>
    request(`/faculties/${id}/active`, { method: 'PATCH', body: { isActive } }),
  deleteFaculty: (id) => request(`/faculties/${id}`, { method: 'DELETE' }),
  addFacultyCollaborator: (facultyId, adminId) =>
    request(`/faculties/${facultyId}/collaborators`, { method: 'POST', body: { adminId } }),
  removeFacultyCollaborator: (facultyId, adminId) =>
    request(`/faculties/${facultyId}/collaborators/${adminId}`, { method: 'DELETE' }),
  getFacultyBatchAccess: (facultyId) => request(`/faculties/${facultyId}/batches`),
  assignBatchToFaculty: (facultyId, batchId) =>
    request(`/faculties/${facultyId}/batches`, { method: 'POST', body: { batchId } }),
  revokeBatchFromFaculty: (facultyId, batchId) =>
    request(`/faculties/${facultyId}/batches/${batchId}`, { method: 'DELETE' }),

  // --- Faculty portal (faculty-facing) ---
  getMyFacultyBatches: () => request('/faculty-portal/batches', { authType: 'faculty' }),
  getFacultyBatchStudents: (batchId) =>
    request(`/faculty-portal/batches/${batchId}/students`, { authType: 'faculty' }),
  listBatchAssignments: (batchId) =>
    request(`/faculty-portal/batches/${batchId}/assignments`, { authType: 'faculty' }),
  createAssignment: (batchId, formData) =>
    requestForm(`/faculty-portal/batches/${batchId}/assignments`, formData, { authType: 'faculty' }),
  deleteAssignment: (id) => request(`/faculty-portal/assignments/${id}`, { method: 'DELETE', authType: 'faculty' }),
  listSubmissions: (assignmentId) =>
    request(`/faculty-portal/assignments/${assignmentId}/submissions`, { authType: 'faculty' }),
  gradeSubmission: (submissionId, status, remark) =>
    request(`/faculty-portal/submissions/${submissionId}`, {
      method: 'PATCH',
      body: { status, remark },
      authType: 'faculty',
    }),
};
async function triggerFileDownload(response) {
  const disposition = response.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match ? match[1] : 'attendance.csv';

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
export { getToken, getDeviceToken, getStudentToken, getFacultyToken };