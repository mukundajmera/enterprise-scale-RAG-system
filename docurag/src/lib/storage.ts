import { Storage } from '@google-cloud/storage';

// Initialize Google Cloud Storage client
let storage: Storage | null = null;

function getStorageClient(): Storage {
  if (!storage) {
    if (!process.env.GCP_PROJECT_ID) {
      throw new Error('GCP_PROJECT_ID environment variable is not set');
    }

    const credentials = process.env.GCP_SERVICE_ACCOUNT_KEY
      ? JSON.parse(process.env.GCP_SERVICE_ACCOUNT_KEY)
      : undefined;

    storage = new Storage({
      projectId: process.env.GCP_PROJECT_ID,
      credentials,
    });
  }

  return storage;
}

function getBucket() {
  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('GCS_BUCKET_NAME environment variable is not set');
  }

  return getStorageClient().bucket(bucketName);
}

/**
 * Upload a document to Google Cloud Storage
 * @param file - The file to upload
 * @param userId - The user's ID for namespace isolation
 * @returns The GCS URL of the uploaded file
 */
export async function uploadDocument(file: File, userId: string): Promise<string> {
  const bucket = getBucket();
  const timestamp = Date.now();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filename = `${userId}/${timestamp}-${sanitizedFileName}`;

  const blob = bucket.file(filename);

  const buffer = await file.arrayBuffer();

  await new Promise<void>((resolve, reject) => {
    const stream = blob.createWriteStream({
      resumable: false,
      metadata: {
        contentType: file.type,
        metadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
          userId,
        },
      },
    });

    stream.on('error', (error) => {
      console.error('Storage upload error:', error);
      reject(new Error('Failed to upload file to storage'));
    });

    stream.on('finish', () => {
      resolve();
    });

    stream.end(Buffer.from(buffer));
  });

  return `gs://${bucket.name}/${filename}`;
}

/**
 * Generate a signed URL for downloading a document
 * @param storageUrl - The GCS URL (gs://bucket/path)
 * @param expirationMinutes - URL expiration time in minutes (default: 15)
 * @returns A signed URL for downloading
 */
export async function getSignedDownloadUrl(
  storageUrl: string,
  expirationMinutes: number = 15
): Promise<string> {
  const bucket = getBucket();

  // Parse the GCS URL to get the file path
  const match = storageUrl.match(/^gs:\/\/[^/]+\/(.+)$/);
  if (!match) {
    throw new Error('Invalid storage URL format');
  }

  const filePath = match[1];
  const file = bucket.file(filePath);

  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + expirationMinutes * 60 * 1000,
  });

  return signedUrl;
}

/**
 * Delete a document from storage
 * @param storageUrl - The GCS URL (gs://bucket/path)
 */
export async function deleteDocument(storageUrl: string): Promise<void> {
  const bucket = getBucket();

  // Parse the GCS URL to get the file path
  const match = storageUrl.match(/^gs:\/\/[^/]+\/(.+)$/);
  if (!match) {
    throw new Error('Invalid storage URL format');
  }

  const filePath = match[1];
  const file = bucket.file(filePath);

  try {
    await file.delete();
  } catch (error) {
    console.error('Failed to delete file from storage:', error);
    throw new Error('Failed to delete file from storage');
  }
}

/**
 * Check if a file exists in storage
 * @param storageUrl - The GCS URL (gs://bucket/path)
 * @returns True if the file exists
 */
export async function fileExists(storageUrl: string): Promise<boolean> {
  const bucket = getBucket();

  // Parse the GCS URL to get the file path
  const match = storageUrl.match(/^gs:\/\/[^/]+\/(.+)$/);
  if (!match) {
    return false;
  }

  const filePath = match[1];
  const file = bucket.file(filePath);

  try {
    const [exists] = await file.exists();
    return exists;
  } catch {
    return false;
  }
}
