import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.mjs";
import { badRequest, notFound } from "../lib/errors.mjs";

const signatures = {
  "application/pdf": (buffer) => buffer.subarray(0, 5).toString("ascii") === "%PDF-",
  "image/png": (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/jpeg": (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
};
const extensions = { "application/pdf": ".pdf", "image/png": ".png", "image/jpeg": ".jpg" };

export function validateMedicalFile(file) {
  if (!file?.buffer?.length) throw badRequest("Choose a non-empty report file.");
  if (file.size > env.maxUploadBytes) throw badRequest(`Report exceeds the ${Math.round(env.maxUploadBytes / 1024 / 1024)} MB limit.`);
  const verify = signatures[file.mimetype];
  if (!verify || !verify(file.buffer)) throw badRequest("The report content does not match an allowed PDF, JPG, or PNG file.");
}

export class LocalStorageProvider {
  constructor(root = env.uploadDir) {
    this.name = "local";
    this.root = root;
  }

  async store(file, ownerId) {
    validateMedicalFile(file);
    await mkdir(this.root, { recursive: true });
    const key = `${ownerId}-${randomUUID()}${extensions[file.mimetype]}`;
    await writeFile(path.join(this.root, key), file.buffer, { flag: "wx", mode: 0o600 });
    return { key, size: file.size, mimeType: file.mimetype };
  }

  safePath(key) {
    const target = path.resolve(this.root, path.basename(key));
    if (path.dirname(target) !== path.resolve(this.root)) throw badRequest("Invalid storage key.");
    return target;
  }

  async read(key) {
    try {
      return await readFile(this.safePath(key));
    } catch (error) {
      if (error?.code === "ENOENT") throw notFound("Stored report file was not found.");
      throw error;
    }
  }

  async remove(key) {
    try {
      await unlink(this.safePath(key));
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }

  status() {
    return { provider: this.name, configured: true, durable: false, directory: "local-private-upload-directory" };
  }
}

export function createStorageProvider() {
  if (env.storageProvider !== "local") throw new Error(`Unsupported STORAGE_PROVIDER: ${env.storageProvider}`);
  return new LocalStorageProvider();
}

