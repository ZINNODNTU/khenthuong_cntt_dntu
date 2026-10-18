import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../google-apps-script/Code.gs", import.meta.url), "utf8");

function testHarness() {
  const files = new Map();
  const folders = new Map();
  const cache = new Map();
  const properties = new Map([
    ["STORAGE_SHARED_SECRET", "super-secret-for-server-only-12345678"],
    ["DRIVE_ROOT_FOLDER_ID", "root0123456789012"],
  ]);
  let nextId = 1, created = 0, descriptionFailures = 0;

  const iterator = values => {
    let i = 0;
    return { hasNext: () => i < values.length, next: () => values[i++] };
  };
  function folder(name, parent = null, id = "folderid" + String(nextId++).padStart(12, "0")) {
    const child = { id, name, parent, children: [], files: [],
      getId() { return this.id; },
      getName() { return this.name; },
      getParents() { return iterator(this.parent ? [this.parent] : []); },
      getFoldersByName(value) { return iterator(this.children.filter(c => c.name === value)); },
      getFilesByName(value) { return iterator(this.files.filter(f => f.name === value)); },
      createFolder(value) {
        const sub = folder(value, this);
        this.children.push(sub);
        return sub;
      },
      createFile(blob) {
        created++;
        const file = {
          id: "drivefile" + String(nextId++).padStart(12, "0"),
          name: blob.name, mimeType: blob.mimeType, bytes: Buffer.from(blob.bytes),
          parent: this, description: "", trashed: false, createdAt: new Date(),
          getId() { return this.id; },
          getName() { return this.name; },
          getMimeType() { return this.mimeType; },
          getSize() { return this.bytes.length; },
          getDateCreated() { return this.createdAt; },
          getParents() { return iterator([this.parent]); },
          isTrashed() { return this.trashed; },
          setTrashed(value) { this.trashed = value; },
          setDescription(value) {
            if (descriptionFailures > 0) { descriptionFailures--; throw new Error("simulated Drive transient failure"); }
            this.description = value;
          },
          getDescription() { return this.description; },
          getBlob() { return { getBytes: () => [...this.bytes], getContentType: () => this.mimeType }; },
        };
        files.set(file.id, file);
        this.files.push(file);
        return file;
      },
    };
    folders.set(id, child);
    return child;
  }
  folder("private-root", null, properties.get("DRIVE_ROOT_FOLDER_ID"));

  const context = {
    console: { log() {}, warn() {} },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: key => properties.get(key),
        setProperty: (key, value) => properties.set(key, value),
      }),
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: "sha256" },
      Charset: { UTF_8: "utf8" },
      computeDigest: (_alg, input) => [...createHash("sha256").update(
        typeof input === "string" ? input : Buffer.from(input),
      ).digest()].map(x => x > 127 ? x - 256 : x),
      base64EncodeWebSafe: value => Buffer.from(value).toString("base64url"),
      base64Decode: value => [...Buffer.from(value, "base64")],
      base64Encode: value => Buffer.from(value).toString("base64"),
      newBlob: (bytes, mimeType, name) => ({ bytes, mimeType, name }),
      getUuid: () => "f1234567-1234-1234-1234-123456789abc",
    },
    DriveApp: {
      getFolderById: id => {
        if (!folders.has(id)) throw new Error("Folder does not exist");
        return folders.get(id);
      },
      getFileById: id => {
        if (!files.has(id)) throw new Error("File does not exist");
        return files.get(id);
      },
    },
    CacheService: { getScriptCache: () => ({
      get: key => cache.get(key),
      put: (key, value) => cache.set(key, value),
    }) },
    LockService: { getScriptLock: () => ({
      tryLock: () => true, releaseLock: () => {},
    }) },
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput: raw => ({ raw, setMimeType() { return this; } }),
    },
    HtmlService: { createHtmlOutput: raw => ({ raw }) },
  };
  vm.runInNewContext(source, context, { filename: "Code.gs", timeout: 5000 });
  const secret = properties.get("STORAGE_SHARED_SECRET");
  const post = payload => JSON.parse(context.doPost({
    postData: { contents: JSON.stringify({ secret, ...payload }) },
  }).raw);
  const png = Buffer.from([137,80,78,71,13,10,26,10,0]);
  const payload = buffer => ({
    action: "upload", applicationCode: "HS-CNTT-2026-ABC-ABCD",
    category: "criterion_c1", fileName: "chung-nhan.png",
    mimeType: "image/png", uploadKey: "stable-upload-key-00000001",
    sha256: createHash("sha256").update(buffer).digest("hex"),
    base64: buffer.toString("base64"),
  });
  return { context, cache, files, post, png, payload,
    failNextDescription() { descriptionFailures++; },
    get created() { return created; } };
}

test("Drive upload is durable/idempotent across cache expiry and same-key retries", () => {
  const g = testHarness();
  const first = g.post(g.payload(g.png));
  assert.equal(first.ok, true);
  assert.equal(g.created, 1);
  g.cache.clear();
  const second = g.post(g.payload(g.png));
  assert.equal(second.ok, true);
  assert.equal(second.data.id, first.data.id);
  assert.equal(g.created, 1);
  assert.match(g.post({ action: "health" }).data.version, /^2\./);
});

test("same upload key with different bytes cannot silently reuse or create a file", () => {
  const g = testHarness();
  assert.equal(g.post(g.payload(g.png)).ok, true);
  const changed = Buffer.from(g.png);
  changed[8] = 1;
  g.cache.clear();
  const rejected = g.post(g.payload(changed));
  assert.equal(rejected.ok, false);
  assert.equal(rejected.code, "STORAGE_CONTENT_MISMATCH");
  assert.equal(g.created, 1);
});

test("download verifies membership, download/delete are private, delete is idempotent", () => {
  const g = testHarness();
  const file = g.post(g.payload(g.png)).data;
  const downloaded = g.post({ action: "download", fileId: file.id });
  assert.equal(downloaded.ok, true);
  assert.equal(downloaded.data.sha256, g.payload(g.png).sha256);
  assert.equal(g.post({ action: "delete", fileId: file.id }).ok, true);
  assert.equal(g.post({ action: "delete", fileId: file.id }).ok, true);
  assert.equal(g.post({ action: "download", fileId: file.id }).ok, false);
  const publicPage = g.context.doGet().raw;
  assert.doesNotMatch(publicPage, /super-secret-for-server/);
});

test("gateway rejects invalid secrets, categories, hashes and outsider Drive IDs", () => {
  const g = testHarness();
  const raw = g.context.doPost({
    postData: { contents: JSON.stringify({ action: "health", secret: "wrong" }) },
  }).raw;
  assert.equal(JSON.parse(raw).code, "STORAGE_SECRET_MISMATCH");
  assert.equal(g.post({ ...g.payload(g.png), category: "other" }).code, "STORAGE_INVALID_REQUEST");
  assert.equal(g.post({ ...g.payload(g.png), sha256: "0".repeat(64) }).code, "STORAGE_CONTENT_MISMATCH");
  assert.equal(g.post({ action: "download", fileId: "unrecognizedfile00001" }).ok, false);
});

test("recover a completed upload if the Drive description write failed", () => {
  const g = testHarness();
  g.failNextDescription();
  const initial = g.post(g.payload(g.png));
  assert.equal(initial.ok, true);
  g.cache.clear();
  const retried = g.post(g.payload(g.png));
  assert.equal(retried.ok, true);
  assert.equal(retried.data.id, initial.data.id);
  assert.equal(g.created, 1);
});

test("original filename changes do not bypass a stable upload key", () => {
  const g = testHarness();
  const initial = g.post(g.payload(g.png));
  assert.equal(initial.ok, true);
  g.cache.clear();
  const modifiedName = g.post({ ...g.payload(g.png), fileName: "renamed-for-retry.png" });
  assert.equal(modifiedName.ok, true);
  assert.equal(modifiedName.data.id, initial.data.id);
  assert.equal(g.created, 1);
});

test("invalid oversized content is rejected before creating Drive files", () => {
  const g = testHarness();
  const file = Buffer.alloc(4194305, 0);
  file.set(g.png, 0);
  const result = g.post(g.payload(file));
  assert.equal(result.ok, false);
  assert.equal(result.code, "STORAGE_FILE_TOO_LARGE");
  assert.equal(g.created, 0);
});

test("retry rejects a Drive file modified after upload even when its description is unchanged", () => {
  const g = testHarness();
  const initial = g.post(g.payload(g.png));
  assert.equal(initial.ok, true);
  const driveFile = g.files.get(initial.data.id);
  assert.ok(driveFile);
  driveFile.bytes[8] ^= 1;
  // Cached ID and matching metadata are NOT proof that Drive bytes are intact.
  const retryWithCache = g.post(g.payload(g.png));
  assert.equal(retryWithCache.ok, false);
  assert.equal(retryWithCache.code, "STORAGE_CONTENT_MISMATCH");
  g.cache.clear();
  const retryWithoutCache = g.post(g.payload(g.png));
  assert.equal(retryWithoutCache.ok, false);
  assert.equal(retryWithoutCache.code, "STORAGE_CONTENT_MISMATCH");
  assert.equal(g.created, 1);
});

test("an existing Drive file outside private root cannot be downloaded or deleted", () => {
  const g = testHarness();
  const outsider = {
    getParents() { return { hasNext: () => false, next: () => null }; },
    isTrashed: () => false,
    getBlob: () => { throw new Error("should not read private outsider bytes"); },
  };
  const outsiderId = "outsidefileid1234567890";
  g.files.set(outsiderId, outsider);
  const read = g.post({ action: "download", fileId: outsiderId });
  const removal = g.post({ action: "delete", fileId: outsiderId });
  assert.equal(read.ok, false);
  assert.equal(read.code, "STORAGE_PERMISSION_DENIED");
  assert.equal(removal.ok, false);
  assert.equal(removal.code, "STORAGE_PERMISSION_DENIED");
});
