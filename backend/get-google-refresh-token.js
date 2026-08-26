// Run this ONCE locally (not on your server) to obtain a refresh token for
// your dedicated Google account. It never needs to run again unless you
// revoke access.
//
// Usage:
//   1. npm install googleapis   (already done)
//   2. Fill in CLIENT_ID and CLIENT_SECRET below — paste carefully, no extra characters.
//   3. node get-google-refresh-token.js
//   4. It prints a URL. Open it in a browser, log in with your DEDICATED Google account, allow access.
//   5. Your browser will redirect to a localhost page — the terminal will auto-detect it.
//   6. Copy the printed values into backend/.env
require('dotenv').config();
const http = require('http');
const { google } = require('googleapis');

const CLIENT_ID =process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET =process.env.GOOGLE_CLIENT_SECRET;
const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/drive.file'],
});

console.log('\n1. Open this URL in a browser, logged in as your dedicated Google account:\n');
console.log(authUrl);
console.log('\n2. Approve access. Your browser will redirect to localhost — this script is waiting for it.\n');

const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith('/callback')) {
    res.end('Waiting...');
    return;
  }

  const url = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    res.end(`Authorization failed: ${error}. You can close this tab.`);
    console.error('Authorization failed:', error);
    server.close();
    return;
  }

  res.end('Success! You can close this tab and go back to the terminal.');

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    console.log('\nSuccess! Add these to backend/.env:\n');
    console.log(`GOOGLE_CLIENT_ID=${CLIENT_ID}`);
    console.log(`GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}`);
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
  } catch (err) {
    console.error('Error retrieving access token:', err.message);
  } finally {
    server.close();
  }
});

server.listen(PORT, () => {
  console.log(`(Local server listening on port ${PORT} to catch the redirect)\n`);
});