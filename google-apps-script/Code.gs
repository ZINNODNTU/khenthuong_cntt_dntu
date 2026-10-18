/**
 * CNTT Award Review — private Google Drive storage gateway v2.1.0
 *
 * Access: POST only, authenticated with STORAGE_SHARED_SECRET (server-to-server).
 * Files are private; never enable "Anyone with the link" on the root folder.
 *
 * Script Properties:
 *   STORAGE_SHARED_SECRET  — random secret shared with Next.js server (>= 24 chars)
 *   DRIVE_ROOT_FOLDER_ID   — private Drive folder owned by deployment account
 *   MAX_IMAGE_SIZE_BYTES   — optional; maximum 4194304 (4 MiB)
 *
 * Redeploy a new Web App version after editing. Run setupStorage once.
 */
var STORAGE_VERSION_ = '2.1.0';
var ALLOWED_MIME_TYPES_ = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
var ALLOWED_CATEGORIES_ = /^(portrait|main|faculty|university|award|criterion_(c[1-9]|t[1-6]))$/;
var MAX_FILE_BYTES_ = 4194304;

function doPost(e) {
  try {
    var payload = parsePayload_(e);
    verifySharedSecret_(payload.secret);
    var action = String(payload.action || '');
    var data;
    if (action === 'upload') data = uploadImage_(payload);
    else if (action === 'download') data = downloadImage_(payload);
    else if (action === 'delete') data = deleteImage_(payload);
    else if (action === 'health') data = storageHealth_();
    else throw storageFailure_('STORAGE_INVALID_REQUEST', 'Invalid action');
    return jsonResponse_({ ok: true, data: data });
  } catch (error) {
    // Avoid writing request bodies, secrets, document contents or raw Drive errors.
    var code = storageErrorCode_(error);
    console.warn('[storage.gateway] ' + code);
    return jsonResponse_({ ok: false, code: code, error: 'Storage request could not be completed.' });
  }
}

/** A public GET must never return documents, credentials or file metadata. */
function doGet() {
  return renderError_('Liên kết minh chứng công khai đã ngừng hoạt động. Vui lòng đăng nhập hệ thống.');
}

/**
 * Idempotent upload across process restarts, cache expiry and request timeouts.
 *
 * 1. Validate the upload bytes and SHA-256.
 * 2. Use a deterministic Drive name from (application, category, uploadKey).
 * 3. Protect check-and-create with a script lock, so concurrent retries share one file.
 * 4. Verify existing file content before reporting success for a reused key.
 *
 * Cache is only a speed-up, never the source of correctness.
 */
function uploadImage_(payload) {
  var applicationCode = validateApplicationCode_(payload.applicationCode);
  var category = validateCategory_(payload.category);
  var originalName = sanitizeFileName_(payload.fileName || 'minh-chung');
  var mimeType = String(payload.mimeType || '');
  var uploadKey = String(payload.uploadKey || '').trim();
  var base64 = String(payload.base64 || '');
  var claimedSha256 = String(payload.sha256 || '').trim().toLowerCase();
  validateMime_(mimeType);
  if (!uploadKey || uploadKey.length > 500)
    throw storageFailure_('STORAGE_INVALID_REQUEST', 'Invalid upload key');
  if (!/^[a-f0-9]{64}$/.test(claimedSha256))
    throw storageFailure_('STORAGE_INVALID_REQUEST', 'SHA-256 required');
  // Reject oversized payloads before decoding into Apps Script memory.
  if (!base64 || base64.length > Math.ceil(maxAllowedBytes_() / 3) * 4 + 4)
    throw storageFailure_('STORAGE_FILE_TOO_LARGE', 'Invalid base64 length');
  var bytes;
  try { bytes = Utilities.base64Decode(base64); }
  catch (ignored) { throw storageFailure_('STORAGE_INVALID_REQUEST', 'Invalid base64'); }
  validateSize_(bytes.length);
  if (detectMime_(bytes) !== mimeType)
    throw storageFailure_('STORAGE_INVALID_FILE', 'Content type mismatch');
  var actualSha256 = hexDigest_(bytes);
  if (actualSha256 !== claimedSha256)
    throw storageFailure_('STORAGE_CONTENT_MISMATCH', 'SHA-256 mismatch');

  var folder = ensureFolderPath_(['applications', applicationCode, category]);
  var keyHash = digestKey_(applicationCode + ':' + category + ':' + uploadKey);
  // Name depends ONLY on the logical upload key, never originalName or MIME.
  // A changed client filename must not create a second Drive file on retry.
  var deterministicName = 'u-' + keyHash.slice(0, 43);
  var cacheKey = 'upload2:' + keyHash;
  var cachedId = cacheGet_(cacheKey);
  if (cachedId) {
    try {
      var cached = DriveApp.getFileById(cachedId);
      if (!cached.isTrashed() && cached.getName() === deterministicName &&
          hasParent_(cached, folder.getId())) {
        assertUploadMatches_(cached, actualSha256, mimeType, bytes.length, keyHash);
        return storedFile_(cached);
      }
    } catch (error) {
      if (storageErrorCode_(error) === 'STORAGE_CONTENT_MISMATCH')
        throw error;
      // Removed or stale cache: check the durable Drive folder below.
    }
  }

  // Lock is acquired only after folder creation (which itself uses a lock).
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000))
    throw storageFailure_('STORAGE_BUSY', 'Upload lock busy');
  try {
    var iterator = folder.getFilesByName(deterministicName);
    while (iterator.hasNext()) {
      var existing = iterator.next();
      if (existing.isTrashed()) continue;
      assertUploadMatches_(existing, actualSha256, mimeType, bytes.length, keyHash);
      cachePut_(cacheKey, existing.getId());
      return storedFile_(existing);
    }
    var blob = Utilities.newBlob(bytes, mimeType, deterministicName);
    var file = folder.createFile(blob);
    try {
      file.setDescription(JSON.stringify({
        version: 2, keyHash: keyHash, sha256: actualSha256, mimeType: mimeType,
        size: bytes.length, originalName: originalName, applicationCode: applicationCode, category: category
      }));
    } catch (error) {
      // Creation succeeded: future retries can still recover by filename/hash.
      console.warn('[storage.gateway] STORAGE_DESCRIPTION_WARNING');
    }
    cachePut_(cacheKey, file.getId());
    return storedFile_(file);
  } finally {
    lock.releaseLock();
  }
}

function assertUploadMatches_(file, sha256, mimeType, size, keyHash) {
  if (file.isTrashed() || file.getMimeType() !== mimeType || Number(file.getSize()) !== size)
    throw storageFailure_('STORAGE_CONTENT_MISMATCH', 'Upload key reused for different content');
  var desc = null;
  try { desc = JSON.parse(String(file.getDescription() || '')); } catch (ignored) {}
  if (desc && desc.sha256 && desc.keyHash === keyHash && desc.sha256 !== sha256)
    throw storageFailure_('STORAGE_CONTENT_MISMATCH', 'Upload key content mismatch');
  // Metadata can be stale if a Drive owner replaces an existing file. Verify
  // its ACTUAL bytes on every retry, including cache hits and a valid description.
  // Also recover uploads that completed before setDescription() succeeded.
  if (hexDigest_(file.getBlob().getBytes()) !== sha256)
    throw storageFailure_('STORAGE_CONTENT_MISMATCH', 'Stored Drive bytes do not match the original upload');
  if (desc && desc.keyHash === keyHash && desc.sha256 === sha256) return;
  try {
    file.setDescription(JSON.stringify({
      version: 2, keyHash: keyHash, sha256: sha256, mimeType: mimeType, size: size
    }));
  } catch (ignored) {}
}

function storedFile_(file) {
  return {
    id: file.getId(), name: file.getName(), mimeType: file.getMimeType(),
    size: Number(file.getSize()), createdTime: file.getDateCreated().toISOString()
  };
}

function downloadImage_(payload) {
  var file = DriveApp.getFileById(validateFileId_(payload.fileId));
  assertFileInsideRoot_(file);
  if (file.isTrashed()) throw storageFailure_('STORAGE_FILE_NOT_FOUND', 'Trashed file');
  var mimeType = String(file.getMimeType() || '');
  validateMime_(mimeType);
  // Do not return a Google Doc/shortcut even if it is placed in the folder.
  var bytes = file.getBlob().getBytes();
  validateSize_(bytes.length);
  if (detectMime_(bytes) !== mimeType)
    throw storageFailure_('STORAGE_INVALID_FILE', 'Stored file content is invalid');
  return {
    base64: Utilities.base64Encode(bytes), mimeType: mimeType,
    fileName: file.getName(), size: bytes.length, sha256: hexDigest_(bytes)
  };
}

function deleteImage_(payload) {
  var file = DriveApp.getFileById(validateFileId_(payload.fileId));
  assertFileInsideRoot_(file);
  if (!file.isTrashed()) file.setTrashed(true);
  return { deleted: true };
}

function hasParent_(file, folderId) {
  var parents = file.getParents();
  while (parents.hasNext()) if (parents.next().getId() === folderId) return true;
  return false;
}

/** Restrict arbitrary IDs even with valid gateway credentials. */
function assertFileInsideRoot_(file) {
  var rootId = getRootFolder_().getId();
  var pending = [file], visited = {};
  for (var i = 0; i < pending.length && i < 32; i++) {
    var parents = pending[i].getParents();
    while (parents.hasNext()) {
      var parent = parents.next();
      var id = parent.getId();
      if (id === rootId) return;
      if (!visited[id]) { visited[id] = true; pending.push(parent); }
    }
  }
  throw storageFailure_('STORAGE_PERMISSION_DENIED', 'File outside private root');
}

function storageHealth_() {
  var folder = getRootFolder_();
  return { rootFolderId: folder.getId(), rootFolderName: folder.getName(), version: STORAGE_VERSION_ };
}

/** Run once from the Apps Script editor; secrets are never logged. */
function setupStorage() {
  var props = PropertiesService.getScriptProperties();
  var rootId = String(props.getProperty('DRIVE_ROOT_FOLDER_ID') || '').trim();
  if (!rootId) {
    rootId = DriveApp.createFolder('CNTT-Award-Review').getId();
    props.setProperty('DRIVE_ROOT_FOLDER_ID', rootId);
  } else {
    DriveApp.getFolderById(rootId).getName();
  }
  if (!getConfiguredSharedSecret_())
    props.setProperty('STORAGE_SHARED_SECRET', generateSecret_());
  if (!props.getProperty('MAX_IMAGE_SIZE_BYTES'))
    props.setProperty('MAX_IMAGE_SIZE_BYTES', String(MAX_FILE_BYTES_));
  console.log('Drive root and gateway secret configured (values hidden).');
  return storageHealth_();
}

function generateSharedSecret() {
  var secret = generateSecret_();
  PropertiesService.getScriptProperties().setProperty('STORAGE_SHARED_SECRET', secret);
  console.log('Shared secret rotated. Update server environment securely (secret hidden).');
  return secret;
}

function diagnoseStorage() {
  var props = PropertiesService.getScriptProperties();
  var result = {
    version: STORAGE_VERSION_, hasSharedSecret: Boolean(getConfiguredSharedSecret_()),
    hasRootFolderId: Boolean(String(props.getProperty('DRIVE_ROOT_FOLDER_ID') || '').trim()),
    maxImageSizeBytes: maxAllowedBytes_()
  };
  try {
    var health = storageHealth_();
    result.ok = true;
    result.rootFolderName = health.rootFolderName;
  } catch (error) {
    result.ok = false;
    result.code = storageErrorCode_(error);
  }
  console.log(JSON.stringify(result));
  return result;
}

function parsePayload_(e) {
  var raw = String(e && e.postData && e.postData.contents || '');
  if (!raw) throw storageFailure_('STORAGE_INVALID_REQUEST', 'Empty body');
  try {
    var payload = JSON.parse(raw);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload))
      throw new Error('Invalid JSON object');
    return payload;
  } catch (ignored) {
    throw storageFailure_('STORAGE_INVALID_REQUEST', 'Invalid JSON');
  }
}

function getConfiguredSharedSecret_() {
  var props = PropertiesService.getScriptProperties();
  return String(props.getProperty('STORAGE_SHARED_SECRET') ||
    props.getProperty('GOOGLE_APPS_SCRIPT_SHARED_SECRET') || '').trim();
}

function verifySharedSecret_(value) {
  var expected = getConfiguredSharedSecret_();
  if (expected.length < 24)
    throw storageFailure_('STORAGE_SECRET_MISMATCH', 'Secret not configured');
  var a = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value || '').trim());
  var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, expected);
  var mismatch = 0;
  for (var i = 0; i < b.length; i++) mismatch |= (a[i] & 255) ^ (b[i] & 255);
  if (mismatch) throw storageFailure_('STORAGE_SECRET_MISMATCH', 'Invalid secret');
}

function getRootFolder_() {
  var id = String(PropertiesService.getScriptProperties().getProperty('DRIVE_ROOT_FOLDER_ID') || '').trim();
  if (!id) throw storageFailure_('STORAGE_ROOT_NOT_CONFIGURED', 'Missing root');
  return DriveApp.getFolderById(id);
}

function digestKey_(value) {
  return Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8)
  ).replace(/=+$/, '');
}

function hexDigest_(bytes) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes).map(function (b) {
    return ('0' + (b & 255).toString(16)).slice(-2);
  }).join('');
}

function cacheGet_(key) {
  try { return CacheService.getScriptCache().get(key); }
  catch (ignored) { return null; }
}
function cachePut_(key, value) {
  try { CacheService.getScriptCache().put(key, value, 21600); }
  catch (ignored) {} // Never report upload failure after Drive already created the file.
}

function ensureFolderPath_(segments) {
  var root = getRootFolder_();
  var cacheKey = 'folder2:' + digestKey_(root.getId() + '/' + segments.join('/'));
  var cached = cacheGet_(cacheKey);
  if (cached) {
    try { return DriveApp.getFolderById(cached); } catch (ignored) {}
  }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw storageFailure_('STORAGE_BUSY', 'Folder lock busy');
  try {
    var folder = root;
    segments.forEach(function (segment) {
      var iterator = folder.getFoldersByName(segment);
      folder = iterator.hasNext() ? iterator.next() : folder.createFolder(segment);
    });
    cachePut_(cacheKey, folder.getId());
    return folder;
  } finally {
    lock.releaseLock();
  }
}

function validateApplicationCode_(value) {
  var code = String(value || '');
  if (!/^[A-Za-z0-9_-]{3,100}$/.test(code))
    throw storageFailure_('STORAGE_INVALID_REQUEST', 'Invalid application code');
  return code;
}
function validateCategory_(value) {
  var category = String(value || '').toLowerCase();
  if (!ALLOWED_CATEGORIES_.test(category))
    throw storageFailure_('STORAGE_INVALID_REQUEST', 'Invalid category');
  return category;
}
function validateMime_(value) {
  if (ALLOWED_MIME_TYPES_.indexOf(value) === -1)
    throw storageFailure_('STORAGE_INVALID_FILE', 'Unsupported MIME');
}
function maxAllowedBytes_() {
  var configured = Number(PropertiesService.getScriptProperties().getProperty('MAX_IMAGE_SIZE_BYTES') || MAX_FILE_BYTES_);
  return Number.isFinite(configured) && configured >= 1 ? Math.min(Math.floor(configured), MAX_FILE_BYTES_) : MAX_FILE_BYTES_;
}
function validateSize_(size) {
  if (!size || size > maxAllowedBytes_())
    throw storageFailure_('STORAGE_FILE_TOO_LARGE', 'Invalid file size');
}
function detectMime_(bytes) {
  if (bytes.length >= 5 && String.fromCharCode(bytes[0],bytes[1],bytes[2],bytes[3],bytes[4]) === '%PDF-') return 'application/pdf';
  if (bytes.length >= 3 && (bytes[0]&255) === 255 && (bytes[1]&255) === 216 && (bytes[2]&255) === 255) return 'image/jpeg';
  if (bytes.length >= 8 && [137,80,78,71,13,10,26,10].every(function (v,i) { return (bytes[i]&255) === v; })) return 'image/png';
  if (bytes.length >= 12 && String.fromCharCode(bytes[0],bytes[1],bytes[2],bytes[3]) === 'RIFF' && String.fromCharCode(bytes[8],bytes[9],bytes[10],bytes[11]) === 'WEBP') return 'image/webp';
  return '';
}
function validateFileId_(value) {
  var id = String(value || '').trim();
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(id))
    throw storageFailure_('STORAGE_INVALID_REQUEST', 'Invalid file ID');
  return id;
}
function sanitizeFileName_(value) {
  var name = String(value || '').trim().replace(/[\\/:*?"<>|#%{}~\u0000-\u001f]/g, '-').replace(/\s+/g, ' ').slice(0, 120);
  return name || 'minh-chung';
}
function generateSecret_() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
}
function jsonResponse_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
function storageFailure_(code, message) {
  var error = new Error(message);
  error.storageCode = code;
  return error;
}
function storageErrorCode_(error) {
  if (error && typeof error.storageCode === 'string') return error.storageCode;
  return 'STORAGE_GATEWAY_ERROR';
}
function renderError_(message) {
  return HtmlService.createHtmlOutput('<!doctype html><html><head><meta charset="utf-8"></head><body><p>' +
    escapeHtml_(message) + '</p></body></html>');
}
function escapeHtml_(value) {
  return String(value || '').replace(/[&<>"']/g, function (c) {
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
  });
}