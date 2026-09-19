/**
 * Identify an upload from its first bytes. The client's Content-Type is not
 * trusted: stored files are served back with the type detected here, so a
 * mislabelled HTML file can never be delivered as an "image".
 */
export function sniffContentType(buf: Buffer): string | null {
  const ascii = (start: number, end: number) => buf.subarray(start, end).toString("latin1");
  if (buf.length < 12) return null;

  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WAVE") return "audio/wav";
  if (ascii(0, 5) === "%PDF-") return "application/pdf";
  if (ascii(0, 4) === "OggS") return "audio/ogg";
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return "audio/webm";
  if (ascii(0, 6) === "#!AMR\n") return "audio/amr";
  if (ascii(0, 3) === "ID3" || (buf[0] === 0xff && (buf[1]! & 0xe0) === 0xe0 && (buf[1]! & 0x06) !== 0)) {
    // MPEG audio frame sync; AAC ADTS shares the sync word but has layer bits 00.
    return "audio/mpeg";
  }
  if (buf[0] === 0xff && (buf[1]! & 0xf6) === 0xf0) return "audio/aac";
  if (ascii(4, 8) === "ftyp") {
    const brand = ascii(8, 12);
    if (["heic", "heix", "hevc", "heim", "heis", "mif1", "msf1"].includes(brand)) return "image/heic";
    if (brand.startsWith("3gp")) return "audio/3gpp";
    return "audio/mp4";
  }
  return null;
}

export const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "application/pdf": "pdf",
  "audio/wav": "wav",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
  "audio/amr": "amr",
  "audio/mpeg": "mp3",
  "audio/aac": "aac",
  "audio/mp4": "m4a",
  "audio/3gpp": "3gp",
};
