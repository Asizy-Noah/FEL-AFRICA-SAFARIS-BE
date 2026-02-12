// src/config/multer.config.ts

import { diskStorage } from "multer";
import { extname, join } from "path";
import { HttpException, HttpStatus } from "@nestjs/common";
import * as fs from 'fs';

// Define the base upload directory where all subfolders (blogs, pages, etc.) will reside
const baseUploadDir = join(process.cwd(), "public", "uploads");

// Ensure base upload directory exists
if (!fs.existsSync(baseUploadDir)) {
  fs.mkdirSync(baseUploadDir, { recursive: true });
}

export const getMulterConfig = (subfolder: string) => {
  // Create the specific subfolder if it doesn't exist
  const uploadDir = join(baseUploadDir, subfolder);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  return {
    storage: diskStorage({
      destination: (req, file, callback) => {
        callback(null, uploadDir);
      },
      filename: (req, file, callback) => {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + file.originalname;
        callback(null, uniqueSuffix);
      },
    }),
    fileFilter: (req, file, callback) => {
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        return callback(new HttpException("Only image files are allowed!", HttpStatus.BAD_REQUEST), false);
      }
      callback(null, true);
    },
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
  };
};