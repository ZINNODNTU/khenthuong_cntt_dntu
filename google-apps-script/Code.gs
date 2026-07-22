/**
 * CNTT Award Review - Google Apps Script storage gateway v1.0.0
 *
 * Script Properties:
 * - STORAGE_SHARED_SECRET: shared secret also configured on Vercel
 * - DRIVE_ROOT_FOLDER_ID: private Google Drive folder used for all images
 * - SUPABASE_URL: https://PROJECT.supabase.co
 * - SUPABASE_SECRET_KEY: Supabase secret/service-role key (only in Script Properties)
 * - MAX_IMAGE_SIZE_BYTES: optional, default 4194304 (4 MB)
 */

var STORAGE_VERSION_ = '1.0.0';
var ALLOWED_MIME_TYPES_ = ['image/jpeg', 'image/png', 'image/webp'];

function doPost(e) {
  try {
    var payload = parsePayload_(e);
    verifySharedSecret_(payload.secret);

    switch (String(payload.action || '')) {
      case 'upload':
        return jsonResponse_({ ok: true, data: uploadImage_(payload) });
      case 'download':
        return jsonResponse_({ ok: true, data: downloadImage_(payload) });
      case 'delete':
        return jsonResponse_({ ok: true, data: deleteImage_(payload) });
      case 'health':
        return jsonResponse_({ ok: true, data: storageHealth_() });
      default:
        throw new Error('Hành động lưu trữ không hợp lệ.');
    }
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return jsonResponse_({
      ok: false,
      code: storageErrorCode_(error),
      error: safeErrorMessage_(error)
    });
  }
}

function doGet(e) {
  var token = String((e && e.parameter && e.parameter.token) || '').trim();
  if (!/^[0-9a-fA-F-]{36}$/.test(token)) return renderError_('Liên kết ảnh không hợp lệ.');

  try {
    var evidence = getEvidence_(token);
    if (!evidence) return renderError_('Ảnh không tồn tại hoặc liên kết đã bị khóa.');

    var file = DriveApp.getFileById(evidence.drive_file_id);
    var blob = file.getBlob();
    var mime = String(evidence.mime_type || blob.getContentType());
    validateMime_(mime);
    validateSize_(blob.getBytes().length);

    var base64 = Utilities.base64Encode(blob.getBytes());
    var name = escapeHtml_(evidence.file_name || file.getName());
    var dataUrl = 'data:' + mime + ';base64,' + base64;
    var html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + name + '</title><style>' +
      'body{margin:0;background:#071127;color:#fff;font-family:Arial,sans-serif;min-height:100vh;display:grid;grid-template-rows:auto 1fr}' +
      'header{padding:14px 18px;background:#0b1739;border-bottom:1px solid #243454;display:flex;justify-content:space-between;gap:12px;align-items:center}' +
      'strong{font-size:14px}.meta{font-size:12px;color:#a8b5cc}.viewer{padding:18px;display:grid;place-items:center}.viewer img{max-width:100%;max-height:calc(100vh - 105px);object-fit:contain;border-radius:10px;box-shadow:0 24px 80px rgba(0,0,0,.45)}' +
      'a{color:#bfdbfe;text-decoration:none;font-size:12px}</style></head><body>' +
      '<header><div><strong>' + name + '</strong><div class="meta">Minh chứng Khoa Công nghệ thông tin</div></div><a download="' + name + '" href="' + dataUrl + '">Tải ảnh</a></header>' +
      '<main class="viewer"><img alt="' + name + '" src="' + dataUrl + '"></main></body></html>';
    return HtmlService.createHtmlOutput(html).setTitle(name).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return renderError_('Không thể tải ảnh minh chứng.');
  }
}

function uploadImage_(payload) {
  var applicationCode = sanitizeSegment_(payload.applicationCode || 'UNKNOWN');
  var category = sanitizeSegment_(payload.category || 'main');
  var originalName = sanitizeFileName_(payload.fileName || 'image');
  var mimeType = String(payload.mimeType || '');
  var base64 = String(payload.base64 || '');

  validateMime_(mimeType);
  if (!base64) throw new Error('Thiếu dữ liệu ảnh.');

  var bytes = Utilities.base64Decode(base64);
  validateSize_(bytes.length);
  var detected = detectMime_(bytes);
  if (!detected || detected !== mimeType) throw new Error('Nội dung ảnh không khớp MIME type.');

  var folder = ensureFolderPath_(['applications', applicationCode, category]);
  var finalName = new Date().getTime() + '-' + originalName;
  var blob = Utilities.newBlob(bytes, mimeType, finalName);
  var file = folder.createFile(blob);
  file.setDescription(JSON.stringify({ applicationCode: applicationCode, category: category, uploadedAt: new Date().toISOString() }));

  return {
    id: file.getId(),
    name: file.getName(),
    mimeType: mimeType,
    size: file.getSize(),
    createdTime: file.getDateCreated().toISOString()
  };
}

function downloadImage_(payload) {
  var fileId = validateFileId_(payload.fileId);
  var file = DriveApp.getFileById(fileId);
  if (file.isTrashed()) throw new Error('Ảnh đã bị xóa.');
  var blob = file.getBlob();
  var mimeType = String(blob.getContentType() || '');
  validateMime_(mimeType);
  var bytes = blob.getBytes();
  validateSize_(bytes.length);
  return {
    base64: Utilities.base64Encode(bytes),
    mimeType: mimeType,
    fileName: file.getName(),
    size: bytes.length
  };
}

function deleteImage_(payload) {
  var fileId = validateFileId_(payload.fileId);
  var file = DriveApp.getFileById(fileId);
  file.setTrashed(true);
  return { deleted: true };
}

function storageHealth_() {
  var folder = getRootFolder_();
  return { rootFolderId: folder.getId(), rootFolderName: folder.getName(), version: STORAGE_VERSION_ };
}

function setupStorage() {
  var props = PropertiesService.getScriptProperties();
  var rootId = String(props.getProperty('DRIVE_ROOT_FOLDER_ID') || '').trim();
  if (!rootId) {
    var folder = DriveApp.createFolder('CNTT-Award-Review');
    rootId = folder.getId();
    props.setProperty('DRIVE_ROOT_FOLDER_ID', rootId);
  } else {
    DriveApp.getFolderById(rootId).getName();
  }

  var existingSecret = String(
    props.getProperty('STORAGE_SHARED_SECRET') ||
    props.getProperty('GOOGLE_APPS_SCRIPT_SHARED_SECRET') ||
    ''
  ).trim();
  if (!existingSecret) existingSecret = generateSecret_();
  props.setProperty('STORAGE_SHARED_SECRET', existingSecret);
  props.setProperty('GOOGLE_APPS_SCRIPT_SHARED_SECRET', existingSecret);
  if (!props.getProperty('MAX_IMAGE_SIZE_BYTES')) {
    props.setProperty('MAX_IMAGE_SIZE_BYTES', '4194304');
  }

  console.log('DRIVE_ROOT_FOLDER_ID=' + rootId);
  console.log('STORAGE_SHARED_SECRET=' + props.getProperty('STORAGE_SHARED_SECRET'));
  console.log('MAX_IMAGE_SIZE_BYTES=' + props.getProperty('MAX_IMAGE_SIZE_BYTES'));
  return storageHealth_();
}

function generateSharedSecret() {
  var secret = generateSecret_();
  var props = PropertiesService.getScriptProperties();
  props.setProperty('STORAGE_SHARED_SECRET', secret);
  props.setProperty('GOOGLE_APPS_SCRIPT_SHARED_SECRET', secret);
  console.log('STORAGE_SHARED_SECRET=' + secret);
  return secret;
}

function diagnoseStorage() {
  var props = PropertiesService.getScriptProperties();
  var result = {
    version: STORAGE_VERSION_,
    hasSharedSecret: Boolean(getConfiguredSharedSecret_()),
    hasRootFolderId: Boolean(String(props.getProperty('DRIVE_ROOT_FOLDER_ID') || '').trim()),
    maxImageSizeBytes: Number(props.getProperty('MAX_IMAGE_SIZE_BYTES') || '4194304')
  };

  try {
    var health = storageHealth_();
    result.ok = true;
    result.rootFolderId = health.rootFolderId;
    result.rootFolderName = health.rootFolderName;
  } catch (error) {
    result.ok = false;
    result.code = storageErrorCode_(error);
    result.error = safeErrorMessage_(error);
  }

  console.log(JSON.stringify(result, null, 2));
  return result;
}

function parsePayload_(e) {
  var contents = String(e && e.postData && e.postData.contents || '');
  if (!contents) throw new Error('Request body rỗng.');
  try { return JSON.parse(contents); }
  catch (error) { throw new Error('Request body không phải JSON hợp lệ.'); }
}

function getConfiguredSharedSecret_() {
  var props = PropertiesService.getScriptProperties();
  return String(
    props.getProperty('STORAGE_SHARED_SECRET') ||
    props.getProperty('GOOGLE_APPS_SCRIPT_SHARED_SECRET') ||
    ''
  ).trim();
}

function verifySharedSecret_(received) {
  var expected = getConfiguredSharedSecret_();
  if (!expected) throw new Error('Apps Script chưa cấu hình STORAGE_SHARED_SECRET.');
  if (String(received || '').trim() !== expected) throw new Error('Shared secret không hợp lệ.');
}

function getRootFolder_() {
  var id = String(PropertiesService.getScriptProperties().getProperty('DRIVE_ROOT_FOLDER_ID') || '').trim();
  if (!id) throw new Error('Apps Script chưa cấu hình DRIVE_ROOT_FOLDER_ID. Hãy chạy setupStorage().');
  return DriveApp.getFolderById(id);
}

function ensureFolderPath_(segments) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var folder = getRootFolder_();
    segments.forEach(function (segment) {
      var safe = sanitizeSegment_(segment);
      var iterator = folder.getFoldersByName(safe);
      folder = iterator.hasNext() ? iterator.next() : folder.createFolder(safe);
    });
    return folder;
  } finally {
    lock.releaseLock();
  }
}

function validateMime_(mimeType) {
  if (ALLOWED_MIME_TYPES_.indexOf(String(mimeType || '')) === -1) throw new Error('Chỉ hỗ trợ JPG, PNG hoặc WebP.');
}

function validateSize_(size) {
  var configured = Number(PropertiesService.getScriptProperties().getProperty('MAX_IMAGE_SIZE_BYTES') || '4194304');
  if (!size || size <= 0) throw new Error('Ảnh rỗng.');
  if (size > configured) throw new Error('Ảnh vượt quá giới hạn ' + Math.round(configured / 1024 / 1024) + ' MB.');
}

function detectMime_(bytes) {
  if (bytes.length >= 3 && (bytes[0] & 255) === 255 && (bytes[1] & 255) === 216 && (bytes[2] & 255) === 255) return 'image/jpeg';
  if (bytes.length >= 8 && (bytes[0] & 255) === 137 && (bytes[1] & 255) === 80 && (bytes[2] & 255) === 78 && (bytes[3] & 255) === 71) return 'image/png';
  if (bytes.length >= 12 && String.fromCharCode(bytes[0],bytes[1],bytes[2],bytes[3]) === 'RIFF' && String.fromCharCode(bytes[8],bytes[9],bytes[10],bytes[11]) === 'WEBP') return 'image/webp';
  return '';
}

function validateFileId_(value) {
  var fileId = String(value || '').trim();
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(fileId)) throw new Error('Google Drive file ID không hợp lệ.');
  return fileId;
}

function sanitizeSegment_(value) {
  var result = String(value || '').trim().replace(/[\\/:*?"<>|#%{}~]/g, '-').replace(/\s+/g, ' ').slice(0, 100);
  return result || 'unknown';
}

function sanitizeFileName_(value) {
  var result = String(value || 'image').trim().replace(/[\\/:*?"<>|#%{}~]/g, '-').replace(/\s+/g, ' ').slice(0, 140);
  return result || 'image';
}

function generateSecret_() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
}

function getEvidence_(token) {
  var props = PropertiesService.getScriptProperties();
  var baseUrl = String(props.getProperty('SUPABASE_URL') || '').replace(/\/$/, '');
  var secret = String(props.getProperty('SUPABASE_SECRET_KEY') || '');
  if (!baseUrl || !secret) throw new Error('Thiếu Script Properties SUPABASE_URL hoặc SUPABASE_SECRET_KEY.');

  var url = baseUrl + '/rest/v1/evidences?public_token=eq.' + encodeURIComponent(token) +
    '&public_view_enabled=eq.true&select=drive_file_id,file_name,mime_type,size_bytes&limit=1';
  var response = UrlFetchApp.fetch(url, {
    method: 'get', muteHttpExceptions: true,
    headers: { apikey: secret, Authorization: 'Bearer ' + secret, Accept: 'application/json' }
  });
  if (response.getResponseCode() !== 200) throw new Error('Supabase REST error: ' + response.getContentText());
  var rows = JSON.parse(response.getContentText() || '[]');
  return rows.length ? rows[0] : null;
}

function jsonResponse_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function storageErrorCode_(error) {
  var message = String(error && error.message ? error.message : error || '').toLowerCase();
  if (message.indexOf('shared secret') !== -1 || message.indexOf('storage_shared_secret') !== -1) return 'STORAGE_SECRET_MISMATCH';
  if (message.indexOf('drive_root_folder_id') !== -1 || message.indexOf('setupstorage') !== -1) return 'STORAGE_ROOT_NOT_CONFIGURED';
  if (message.indexOf('permission') !== -1 || message.indexOf('access denied') !== -1 || message.indexOf('quyền') !== -1) return 'STORAGE_PERMISSION_DENIED';
  if (message.indexOf('vượt quá giới hạn') !== -1) return 'STORAGE_FILE_TOO_LARGE';
  if (message.indexOf('mime') !== -1 || message.indexOf('jpg') !== -1 || message.indexOf('png') !== -1 || message.indexOf('webp') !== -1) return 'STORAGE_INVALID_IMAGE';
  if (message.indexOf('request body') !== -1 || message.indexOf('json') !== -1) return 'STORAGE_INVALID_REQUEST';
  return 'STORAGE_GATEWAY_ERROR';
}

function safeErrorMessage_(error) {
  var message = String(error && error.message ? error.message : error || 'Lỗi không xác định.');
  return message.slice(0, 500);
}

function renderError_(message) {
  return HtmlService.createHtmlOutput('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#071127;color:#fff;font-family:Arial,sans-serif;display:grid;place-items:center;min-height:100vh}.box{max-width:520px;padding:28px;border:1px solid #334155;border-radius:14px;background:#0b1739;text-align:center}p{color:#cbd5e1}</style></head><body><div class="box"><h2>Không mở được minh chứng</h2><p>' + escapeHtml_(message) + '</p></div></body></html>');
}

function escapeHtml_(value) {
  return String(value || '').replace(/[&<>"']/g, function (char) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
  });
}
