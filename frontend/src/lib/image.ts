/** Downscale an image file so uploads stay small and fast on poor networks.
 *  Max edge 1280px, JPEG quality 0.8. Non-image files pass through unchanged.
 */
export async function downscaleImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  return new Promise<File>((resolve) => {
    const g: any = globalThis;
    const doc: any = g.document;
    const URL: any = g.URL;
    const img = doc.createElement("img");
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      const maxEdge = 1280;
      if (width > maxEdge || height > maxEdge) {
        const scale = maxEdge / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = doc.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob: Blob | null) => {
          if (!blob) {
            resolve(file);
            return;
          }
          resolve(
            new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            })
          );
        },
        "image/jpeg",
        0.8
      );
    };
    img.src = url;
  });
}
