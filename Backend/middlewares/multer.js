import multer from "multer";
import path from "path";
import fs from "fs";

const uploadsDir = "uploads";
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|mp4|webm|avi|mov|mkv|pdf|doc|docx|txt|xls|xlsx|csv/;
    const extname = allowed.test(path.extname(file.originalname).toLowerCase());
    
    // We relax mimetype check a bit because documents and videos have varied mimetypes.
    // If extname matches our allowed list, we will accept it.
    if (extname) {
        cb(null, true);
    } else {
        cb(new Error("File type not allowed"));
    }
};

export const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});