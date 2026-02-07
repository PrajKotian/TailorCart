const path = require("path");
const multer = require("multer");
const fs = require("fs");

const dir = path.join(__dirname, "..", "uploads", "chat");
fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const safeExt = ext.slice(0, 10);
    cb(null, `chat_${Date.now()}_${Math.random().toString(16).slice(2)}${safeExt}`);
  },
});

function fileFilter(req, file, cb) {
  const t = String(file.mimetype || "");
  const ok = t.startsWith("image/") || t.startsWith("video/");
  if (!ok) return cb(new Error("Only images/videos allowed"));
  cb(null, true);
}

module.exports = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
  },
});
