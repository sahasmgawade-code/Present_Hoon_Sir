const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('attendqr_token');
}
function getDeviceToken() {
  let deviceToken = localStorage.getItem('attendqr_device_token');
  if (!deviceToken) {
    deviceToken = crypto.randomUUID();
    localStorage.setItem('attendqr_device_token', deviceToken);
  }
  return deviceToken;
}
async function request(path, { method = 'GET', body, headers = {}, raw = false } = {}) {
  const token = getToken();
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

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  changePassword: (currentPassword, newPassword) =>
    request('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),
  listAdmins: () => request('/admins'),
  submitContact: (payload) => request('/contact', { method: 'POST', body: payload }),
  listAdminsBasic: () => request('/admins/basic'),
  getAdminBatchAccess: (adminId) => request(`/admins/${adminId}/batches`),
  createAdmin: (payload) => request('/admins', { method: 'POST', body: payload }),
  updateAdmin: (id, name) => request(`/admins/${id}`, { method: 'PUT', body: { name } }),
  deleteAdmin: (id) => request(`/admins/${id}`, { method: 'DELETE' }),
  toggleAdminEmailNotifications: (id, enabled) =>
    request(`/admins/${id}/notifications`, { method: 'PATCH', body: { enabled } }),

  listBatches: () => request('/batches'),
  createBatch: (name, collaboratorIds = []) =>
    request('/batches', { method: 'POST', body: { name, collaboratorIds } }),
  deleteBatch: (id) => request(`/batches/${id}`, { method: 'DELETE' }),
  updateBatchSettings: (id, qrValidityMinutes) =>
    request(`/batches/${id}/settings`, { method: 'PATCH', body: { qrValidityMinutes } }),
  assignAdminToBatch: (batchId, adminId) =>
    request(`/batches/${batchId}/assign-admin`, { method: 'POST', body: { adminId } }),
  revokeAdminFromBatch: (batchId, adminId) =>
    request(`/batches/${batchId}/assign-admin/${adminId}`, { method: 'DELETE' }),
  listStudents: (batchId) => request(`/students/batch/${batchId}`),
  createStudent: (batchId, payload) => request(`/students/batch/${batchId}`, { method: 'POST', body: payload }),
  updateStudent: (id, payload) => request(`/students/${id}`, { method: 'PUT', body: payload }),
  deleteStudent: (id) => request(`/students/${id}`, { method: 'DELETE' }),
  blacklistStudent: (id, blacklisted) =>
    request(`/students/${id}/blacklist`, { method: 'PATCH', body: { blacklisted } }),

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
export { getToken, getDeviceToken };