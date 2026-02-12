import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { join } from 'path';
import { readdir, mkdir, unlink } from 'fs/promises';
import * as fs from 'fs';
import { existsSync } from 'fs';

@Injectable()
export class LocalStorageService {
  private readonly uploadsDir = join(process.cwd(), 'public', 'uploads');

  /**
   * Saves a file to local storage and returns its relative path
   * @param file - The multer file object
   * @param subfolder - The subfolder within uploads (e.g., 'countries', 'tours')
   * @returns The relative path to access the file via HTTP (e.g., '/uploads/countries/filename.ext')
   */
  async uploadFile(file: Express.Multer.File, subfolder: string): Promise<string> {
    if (!file || !file.buffer) {
      throw new InternalServerErrorException('No file buffer provided for upload.');
    }

    try {
      // Create the destination folder if it doesn't exist
      const destinationFolder = join(this.uploadsDir, subfolder);
      if (!existsSync(destinationFolder)) {
        await mkdir(destinationFolder, { recursive: true });
      }

      // Generate a unique filename
      const uniqueFileName = `${Date.now()}-${file.originalname}`;
      const filePath = join(destinationFolder, uniqueFileName);

      // Write the file to disk
      fs.writeFileSync(filePath, file.buffer);

      // Return the relative path for HTTP access
      const relativePath = `/uploads/${subfolder}/${uniqueFileName}`;
      return relativePath;
    } catch (error) {
      console.error('File upload error:', error);
      throw new InternalServerErrorException('Failed to upload file to local storage.');
    }
  }

  /**
   * Deletes a file from local storage
   * @param filePath - The relative path (e.g., '/uploads/countries/filename.ext')
   */
  async deleteFile(filePath: string): Promise<void> {
    if (!filePath) {
      return; // Nothing to delete
    }

    try {
      // Convert relative path to absolute path
      const absolutePath = join(process.cwd(), 'public', filePath.replace(/^\//, ''));

      // Check if file exists before attempting deletion
      if (existsSync(absolutePath)) {
        await unlink(absolutePath);
        console.log(`File ${filePath} deleted from local storage.`);
      } else {
        console.warn(`File ${filePath} not found in local storage for deletion.`);
      }
    } catch (error) {
      console.error(`Error deleting file ${filePath} from local storage:`, error);
      throw new InternalServerErrorException('Failed to delete file from local storage.');
    }
  }
}
