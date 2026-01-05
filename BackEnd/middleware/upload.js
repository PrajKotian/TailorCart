// BackEnd/middleware/upload.js
const path = require("path");
const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `tailor_${Date.now()}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const ok = /image\/(jpeg|jpg|png|webp)/.test(file.mimetype);
  if (!ok) return cb(new Error("Only image files are allowed (jpg/png/webp)."));
  cb(null, true);
}

module.exports = multer({ storage, fileFilter });
