const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';
async function getCsrfToken() {
  const res = await fetch(`${BASE}/csrf-token`, { credentials: 'include' });
  const data = await res.json();
  return data.csrfToken;
}
async function ensureDeviceToken() {
  // Server sets the phsams_device_token httpOnly cookie if the browser doesn't have one yet.
  await fetch(`${BASE}/qr/device-token`, { credentials: 'include' });
}
async function request(path, { method = 'GET', body, headers = {}, raw = false } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include', // send the httpOnly auth cookie automatically
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (raw) return res; // caller handles the response itself (e.g. file download)
  let data = null;
  try {
    data = await res.json();
  } catch {
  }
  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data;
}
async function requestForm(path, formData, { method = 'POST' } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    body: formData,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
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
  login: (email, password, csrfToken) => request('/auth/login', { method: 'POST', body: { email, password, csrfToken } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
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
  studentLogin: (loginId, password, csrfToken) =>
    request('/student-auth/login', { method: 'POST', body: { loginId, password, csrfToken } }),
  studentLogout: () => request('/student-auth/logout', { method: 'POST' }),
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
  facultyLogin: (email, password, csrfToken) =>
    request('/faculty-auth/login', { method: 'POST', body: { email, password, csrfToken } }),
  facultyLogout: () => request('/faculty-auth/logout', { method: 'POST' }),
  verifyFacultyResetToken: (token) => request(`/faculty-auth/verify-reset-token/${token}`),
  setFacultyPassword: (token, password) =>
    request('/faculty-auth/set-password', { method: 'POST', body: { token, password } }),
  changeFacultyPassword: (currentPassword, newPassword) =>
    request('/faculty-auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
      authType: 'faculty',
    }),
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
export { ensureDeviceToken, getCsrfToken, BASE };