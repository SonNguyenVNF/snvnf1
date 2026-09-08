'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const UPLOADS_ROOT = path.join(__dirname, '..', 'assets', 'uploads');
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

function createUploader(subfolder) {
  const dest = path.join(UPLOADS_ROOT, subfolder);

  const storage = multer.diskStorage({
    destination(req, file, cb) {
      fs.mkdirSync(dest, { recursive: true });
      cb(null, dest);
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase();
      const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
      cb(null, name);
    }
  });

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter(req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!ALLOWED_EXT.has(ext)) {
        return cb(new Error('Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc GIF.'));
      }
      cb(null, true);
    }
  });
}

function publicPathFor(subfolder, filename) {
  return `assets/uploads/${subfolder}/${filename}`;
}

function deleteUploadedFile(relativePath) {
  if (!relativePath) return;
  const full = path.join(__dirname, '..', relativePath);
  const uploadsRootWithSep = UPLOADS_ROOT.endsWith(path.sep) ? UPLOADS_ROOT : UPLOADS_ROOT + path.sep;
  if (!full.startsWith(uploadsRootWithSep)) return;
  fs.unlink(full, () => {});
}

module.exports = { createUploader, publicPathFor, deleteUploadedFile };
