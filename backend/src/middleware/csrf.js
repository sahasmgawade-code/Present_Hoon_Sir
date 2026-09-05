const { doubleCsrf } = require('csrf-csrf');
const crypto = require('crypto');

const {
  generateToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET,
  getSessionIdentifier: (req) => req.cookies.phsams_csrf_id,
  cookieName: 'phsams_csrf',
  cookieOptions: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
  },
  getTokenFromRequest: (req) => req.body.csrfToken,
  size: 64,
});

// The login route has no session yet, so we give every browser a stable
// anonymous id up front (when the login page loads) to tie the CSRF token to.
function ensureCsrfSessionId(req, res, next) {
  if (!req.cookies.phsams_csrf_id) {
    const id = crypto.randomUUID();
    res.cookie('phsams_csrf_id', id, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000,
    });
    req.cookies.phsams_csrf_id = id;
  }
  next();
}

module.exports = { generateToken, doubleCsrfProtection, ensureCsrfSessionId };