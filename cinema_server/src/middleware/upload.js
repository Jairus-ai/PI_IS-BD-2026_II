import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const dest = path.join(process.cwd(), 'uploads', 'posters');
fs.mkdirSync(dest, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dest),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const okMime = /^image\/(jpeg|png|webp)$/.test(file.mimetype);
  const okExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
  if (okMime || okExt) cb(null, true);
  else {
    const err = new Error('Solo se permiten JPG, PNG o WEBP.');
    err.status = 400;
    cb(err);
  }
}

export const uploadPoster = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
