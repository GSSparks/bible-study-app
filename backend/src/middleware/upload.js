import multer from 'multer';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const UPLOADS_PATH =
  process.env.UPLOADS_PATH ||
  path.join(__dirname, '..', '..', '..', 'uploads');

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const MEDIA_TYPES = new Set([...IMAGE_TYPES, ...VIDEO_TYPES]);

const EXT = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp',
  'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov',
};

function ensureDir(p) { mkdirSync(p, { recursive: true }); }

function makeStorage(subdir) {
  const dest = path.join(UPLOADS_PATH, subdir);
  ensureDir(dest);
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dest),
    filename: (_req, file, cb) => {
      const ext = EXT[file.mimetype] || path.extname(file.originalname).toLowerCase();
      cb(null, `${randomUUID()}${ext}`);
    },
  });
}

function imageOnly(_req, file, cb) {
  cb(null, IMAGE_TYPES.has(file.mimetype));
}
function mediaOnly(_req, file, cb) {
  cb(null, MEDIA_TYPES.has(file.mimetype));
}

export const uploadAvatar = multer({
  storage: makeStorage('avatars'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageOnly,
}).single('avatar');

export const uploadBanner = multer({
  storage: makeStorage('banners'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageOnly,
}).single('banner');

export const uploadPostMedia = multer({
  storage: makeStorage('posts'),
  limits: { fileSize: 50 * 1024 * 1024, files: 4 },
  fileFilter: mediaOnly,
}).array('media', 4);

export const uploadLessonVideo = multer({
  storage: makeStorage('lesson-videos'),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, VIDEO_TYPES.has(file.mimetype)),
}).single('video');

export function mimeToType(mimetype) {
  return VIDEO_TYPES.has(mimetype) ? 'video' : 'image';
}
