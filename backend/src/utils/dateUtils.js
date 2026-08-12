// Returns today's date as 'YYYY-MM-DD', calculated in IST (UTC+5:30),
// regardless of what timezone the server itself is running in.
function getTodayIST() {
  const nowIst = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return nowIst.toISOString().slice(0, 10);
}

module.exports = { getTodayIST };