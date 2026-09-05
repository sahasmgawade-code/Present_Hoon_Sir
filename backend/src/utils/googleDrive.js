const { google } = require('googleapis');
const { Readable } = require('stream');
const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);
oAuth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth: oAuth2Client });
const batchFolderCache = new Map();
async function getOrCreateBatchFolder(batchId, batchName) {
  const cacheKey = String(batchId);
  if (batchFolderCache.has(cacheKey)) return batchFolderCache.get(cacheKey);
  const rootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  const folderName = `Batch ${batchId} - ${batchName}`;
  const existing = await drive.files.list({
    q: `'${rootId}' in parents and name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
  });
  if (existing.data.files && existing.data.files.length > 0) {
    const id = existing.data.files[0].id;
    batchFolderCache.set(cacheKey, id);
    return id;
  }
  const created = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [rootId],
    },
    fields: 'id',
  });
  batchFolderCache.set(cacheKey, created.data.id);
  return created.data.id;
}
async function uploadFileToBatchFolder({ batchId, batchName, fileName, mimeType, buffer }) {
  const folderId = await getOrCreateBatchFolder(batchId, batchName);
  const uploadRes = await drive.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: 'id, webViewLink',
  });
  // Deliberately no drive.permissions.create() call here anymore — the file
  // stays private to this app's Drive account and is only ever served through
  // our own authenticated download endpoints (see streamFileToResponse below).
  return { fileId: uploadRes.data.id, webViewLink: uploadRes.data.webViewLink };
}
async function deleteFile(fileId) {
  try {
    await drive.files.delete({ fileId });
  } catch (err) {
    console.error(`Failed to delete Drive file ${fileId}:`, err.message);
  }
}
const assignmentFolderCache = new Map();
async function getOrCreateSubmissionsFolder(batchId, batchName, assignmentId, assignmentTitle) {
  const cacheKey = String(assignmentId);
  if (assignmentFolderCache.has(cacheKey)) return assignmentFolderCache.get(cacheKey);
  const batchFolderId = await getOrCreateBatchFolder(batchId, batchName);
  const folderName = `${assignmentTitle} - Submissions`;
  const existing = await drive.files.list({
    q: `'${batchFolderId}' in parents and name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
  });
  if (existing.data.files && existing.data.files.length > 0) {
    const id = existing.data.files[0].id;
    assignmentFolderCache.set(cacheKey, id);
    return id;
  }
  const created = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [batchFolderId],
    },
    fields: 'id',
  });
  assignmentFolderCache.set(cacheKey, created.data.id);
  return created.data.id;
}
async function uploadSubmissionFile({ batchId, batchName, assignmentId, assignmentTitle, fileName, mimeType, buffer }) {
  const folderId = await getOrCreateSubmissionsFolder(batchId, batchName, assignmentId, assignmentTitle);
  const uploadRes = await drive.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: 'id, webViewLink',
  });
  // No public permission grant — see note in uploadFileToBatchFolder above.
  return { fileId: uploadRes.data.id, webViewLink: uploadRes.data.webViewLink };
}
// Streams a private Drive file straight through our own server, so access
// control is enforced by our own auth checks rather than "anyone with the link".
async function streamFileToResponse(fileId, res) {
  const meta = await drive.files.get({ fileId, fields: 'name, mimeType' });
  res.setHeader('Content-Type', meta.data.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${(meta.data.name || 'file').replace(/"/g, '')}"`);
  const fileRes = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
  fileRes.data.on('error', (err) => {
    console.error('Drive stream error:', err);
    if (!res.headersSent) res.status(500).end();
  }).pipe(res);
}

module.exports = { uploadFileToBatchFolder, uploadSubmissionFile, deleteFile, streamFileToResponse };