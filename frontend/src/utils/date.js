// Mirrors the backend's getTodayIST() so the frontend and backend always
// agree on what "today" means, regardless of the admin's browser timezone.
export function todayIST() {
  const nowIst = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return nowIst.toISOString().slice(0, 10);
}