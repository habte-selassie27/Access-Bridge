import { downscaleImage } from "./image.ts";
import type { OriginalFile } from "./library.ts";

/**
 * Keep the original upload next to its explanation.
 *
 * The library is browser-local, so the file is stored as a data URL. Images are
 * downscaled first; PDFs and text files are kept only when they fit comfortably
 * in localStorage. When a file is too large, the original is not pretended to
 * exist: the caller gets a note explaining why the extracted text is all that
 * is available.
 */
const MAX_STORED_BYTES = 2.4 * 1024 * 1024;

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

export async function preserveOriginalFile(file: File): Promise<OriginalFile> {
  try {
    const prepared = file.type.startsWith("image/") ? await downscaleImage(file) : file;
    if (prepared.size > MAX_STORED_BYTES) {
      return {
        name: file.name,
        mime: file.type || "application/octet-stream",
        dataUrl: null,
        note: `The original ${file.type === "application/pdf" ? "PDF" : "file"} is ${(file.size / 1024 / 1024).toFixed(1)} MB, too large to keep on this device. The extracted text below is complete, but check the paper original for images and layout.`,
      };
    }
    return {
      name: file.name,
      mime: prepared.type || file.type || "application/octet-stream",
      dataUrl: await readAsDataUrl(prepared),
    };
  } catch {
    return {
      name: file.name,
      mime: file.type || "application/octet-stream",
      dataUrl: null,
      note: "This browser could not keep a copy of the original file. The extracted text is still available below.",
    };
  }
}
