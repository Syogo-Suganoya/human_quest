import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { Bucket } from "@google-cloud/storage";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const bucketName = process.env.FIREBASE_STORAGE_BUCKET;

let bucket: Bucket | null = null;

async function getBucket(): Promise<Bucket | null> {
  if (!bucketName) return null;
  if (bucket) return bucket;

  const { initializeApp, getApps } = await import("firebase-admin/app");
  const { getStorage } = await import("firebase-admin/storage");
  if (getApps().length === 0) initializeApp();
  bucket = getStorage().bucket(bucketName);
  return bucket;
}

/**
 * 投稿メディアを保存し、公開URLを返す。
 * FIREBASE_STORAGE_BUCKET が設定されていれば Firebase Storage（Cloud Storage）へ、
 * 未設定ならローカルの public/uploads/ へ保存する（ローカル開発用フォールバック）。
 */
export async function uploadMedia(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const b = await getBucket();
  if (b) {
    const file = b.file(`uploads/${filename}`);
    await file.save(buffer, { contentType, public: true });
    return `https://storage.googleapis.com/${bucketName}/uploads/${filename}`;
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return `/uploads/${filename}`;
}
