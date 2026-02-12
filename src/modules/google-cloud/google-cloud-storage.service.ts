// src/modules/google-cloud/google-cloud-storage.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { ConfigService } from '@nestjs/config';
import { format } from 'util';

@Injectable()
export class GoogleCloudStorageService {
  private storage: Storage;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.storage = new Storage({
      projectId: this.configService.get<string>('GCS_PROJECT_ID'),
      keyFilename: this.configService.get<string>('GCS_KEYFILE_PATH'),
    });

    this.bucketName = this.configService.get<string>('GCS_BUCKET_NAME');
    if (!this.bucketName) {
      throw new Error('GCS_BUCKET_NAME environment variable is not set.');
    }
  }

  async uploadFile(file: Express.Multer.File, destinationFolder: string): Promise<string> {
    if (!file || !file.buffer) {
      throw new InternalServerErrorException('No file buffer provided for upload.');
    }

    const bucket = this.storage.bucket(this.bucketName);
    // Ensure the destinationFolder ends with a slash if it's meant to be a prefix
    const safeDestinationFolder = destinationFolder.endsWith('/') ? destinationFolder : destinationFolder + '/';
    const uniqueFileName = `${safeDestinationFolder}${Date.now()}-${file.originalname}`;
    const blob = bucket.file(uniqueFileName);
    const blobStream = blob.createWriteStream({
      resumable: false,
      metadata: {
        contentType: file.mimetype,
      },
      // public: true, // You might try adding this if the above permission setting doesn't work right away,
                       // but ideally, 'allUsers' permission on the bucket handles public access automatically.
                       // However, even this might be affected by uniform access. The `makePublic()` call
                       // is definitely the one that triggers the error.
    });

    return new Promise((resolve, reject) => {
      blobStream.on('error', (err) => {
        console.error('GCS Upload Error:', err);
        reject(new InternalServerErrorException('Failed to upload file to Google Cloud Storage.'));
      });

      blobStream.on('finish', () => {
        // REMOVE OR COMMENT OUT THIS LINE:
        // await blob.makePublic(); // <--- THIS IS THE CULPRIT!

        // Construct the public URL
        const publicUrl = format(
          `https://storage.googleapis.com/${bucket.name}/${blob.name}`
        );
        resolve(publicUrl);
      });

      blobStream.end(file.buffer);
    });
  }

  async deleteFile(filePath: string): Promise<void> {
    // ... (rest of your deleteFile method, no changes needed here) ...
    if (!filePath) {
      return; // Nothing to delete
    }
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const fileNameInBucket = filePath.startsWith(`https://storage.googleapis.com/${this.bucketName}/`)
        ? filePath.substring(`https://storage.googleapis.com/${this.bucketName}/`.length)
        : filePath; // Handle case where filePath is already just the bucket path

      const [exists] = await bucket.file(fileNameInBucket).exists();
      if (exists) {
        await bucket.file(fileNameInBucket).delete();
        console.log(`File ${fileNameInBucket} deleted from GCS.`);
      } else {
        console.warn(`File ${fileNameInBucket} not found in GCS for deletion.`);
      }
    } catch (error) {
      console.error(`Error deleting file ${filePath} from GCS:`, error);
      throw new InternalServerErrorException('Failed to delete file from Google Cloud Storage.');
    }
  }
}