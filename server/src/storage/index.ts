import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { API_PREFIX } from "../lib/constants.js";

/**
 * Where photos, voice notes and lab reports are kept. Objects are private.
 * After checking access, the API hands out short-lived signed URLs, so an
 * `<img src>` works without a bearer token.
 */
export interface StorageProvider {
  readonly name: "supabase" | "local";
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  remove(key: string): Promise<void>;
  /**
   * A time-limited URL for the object: absolute for Supabase, relative to the
   * API origin for local storage (resolve with `new URL(url, apiBase)`).
   */
  signedUrl(key: string, expiresInSeconds: number): Promise<string>;
  read(key: string): Promise<Buffer>;
  ping(): Promise<void>;
}

export class SupabaseStorage implements StorageProvider {
  readonly name = "supabase";
  private readonly client: SupabaseClient;

  constructor(
    url: string,
    secretKey: string,
    private readonly bucket: string,
  ) {
    this.client = createClient(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }

  private get objects() {
    return this.client.storage.from(this.bucket);
  }

  async put(key: string, body: Buffer, contentType: string) {
    const { error } = await this.objects.upload(key, body, { contentType, upsert: false });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);
  }

  async remove(key: string) {
    const { error } = await this.objects.remove([key]);
    if (error) throw new Error(`Storage delete failed: ${error.message}`);
  }

  async signedUrl(key: string, expiresInSeconds: number) {
    const { data, error } = await this.objects.createSignedUrl(key, expiresInSeconds);
    if (error) throw new Error(`Could not sign storage URL: ${error.message}`);
    return data.signedUrl;
  }

  async read(key: string) {
    const { data, error } = await this.objects.download(key);
    if (error) throw new Error(`Storage download failed: ${error.message}`);
    return Buffer.from(await data.arrayBuffer());
  }

  async ping() {
    const { error } = await this.client.storage.getBucket(this.bucket);
    if (error) throw new Error(`Storage bucket "${this.bucket}" unavailable: ${error.message}`);
  }

  /** Create the private bucket if missing. Called once at startup. */
  async ensureBucket(maxBytes: number) {
    const { error } = await this.client.storage.getBucket(this.bucket);
    if (!error) return;
    const created = await this.client.storage.createBucket(this.bucket, {
      public: false,
      fileSizeLimit: maxBytes,
    });
    if (created.error && !/already exists/i.test(created.error.message)) {
      throw new Error(`Could not create storage bucket: ${created.error.message}`);
    }
  }
}

export class LocalStorage implements StorageProvider {
  readonly name = "local";
  /** Per-process: signed links stop working on restart, which is fine for minutes-long URLs. */
  private readonly secret = crypto.randomBytes(32);

  constructor(private readonly root: string) {}

  private signature(key: string, expires: number) {
    return crypto.createHmac("sha256", this.secret).update(`${key}\n${expires}`).digest("base64url");
  }

  /** Check a signed link produced by `signedUrl`. */
  verify(key: string, expires: number, signature: string): boolean {
    if (!Number.isFinite(expires) || expires * 1000 < Date.now()) return false;
    const expected = Buffer.from(this.signature(key, expires));
    const actual = Buffer.from(signature);
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  }

  private resolve(key: string) {
    const full = path.resolve(this.root, key);
    // Keys are generated server-side, but never let one escape the root.
    if (!full.startsWith(path.resolve(this.root) + path.sep)) throw new Error("Invalid storage key.");
    return full;
  }

  async put(key: string, body: Buffer) {
    const file = this.resolve(key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body, { flag: "wx" });
  }

  async remove(key: string) {
    await fs.rm(this.resolve(key), { force: true });
  }

  async signedUrl(key: string, expiresInSeconds: number) {
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
    return `${API_PREFIX}/files/${encodeURIComponent(key)}?expires=${expires}&signature=${this.signature(key, expires)}`;
  }

  async read(key: string) {
    return fs.readFile(this.resolve(key));
  }

  async ping() {
    await fs.mkdir(this.root, { recursive: true });
  }
}
