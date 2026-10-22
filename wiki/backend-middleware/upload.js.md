# backend/src/middleware/upload.js

**Purpose**

Configures and exports pre-built `multer` upload middleware instances for every type of user-uploaded file in the application. Each instance handles a specific upload context (avatar, banner, post media, lesson video) with its own storage subdirectory, file size limit, and MIME type filter. Also exports a helper to convert MIME types to a simple `'image'`/`'video'` string.

**Key exports / contents**

- `UPLOADS_PATH` — resolved upload root directory. Defaults to `process.env.UPLOADS_PATH`, falling back to `../../../uploads` relative to the middleware file (i.e. the repo root `uploads/` directory). Directory is created on module load if missing.
- `uploadAvatar` — multer middleware, `avatars/` subdir, 5 MB limit, images only (jpeg/png/gif/webp), `.single('avatar')`.
- `uploadBanner` — multer middleware, `banners/` subdir, 10 MB limit, images only, `.single('banner')`.
- `uploadPostMedia` — multer middleware, `posts/` subdir, 50 MB limit per file, images and video (mp4/webm/quicktime), up to 4 files, `.array('media', 4)`.
- `uploadLessonVideo` — multer middleware, `lesson-videos/` subdir, 500 MB limit, video only, `.single('video')`.
- `mimeToType(mimetype)` — returns `'video'` for video MIME types, `'image'` otherwise. Used to populate the `type` field in post `mediaUrls` JSON.
- Internal constants: `IMAGE_TYPES`, `VIDEO_TYPES`, `MEDIA_TYPES` (Sets), `EXT` map (MIME → file extension).
- All files are stored with a `randomUUID()`-based filename plus the correct extension derived from MIME type, preventing filename collisions and path traversal.

**Dependencies / relationships**

- `UPLOADS_PATH` is imported by `app.js` to mount the `/uploads` static file server.
- Individual upload middleware instances (`uploadAvatar`, `uploadBanner`, `uploadPostMedia`, `uploadLessonVideo`) are imported by their respective route files (`routes/users.js`, `routes/wall.js`, `routes/studies.js`, `routes/uploads.js`).
- `mimeToType` is used by route handlers when constructing the `mediaUrls` JSON stored on `Post` records.

**Notes**

The `./uploads` directory bind-mount in `docker-compose.yml` ensures uploaded files survive container rebuilds. Files within the container are served at `/uploads/<subdir>/<uuid>.<ext>` by the static middleware in `app.js`. The 500 MB limit on lesson videos is notably large — ensure disk space is managed if videos are enabled in production.
