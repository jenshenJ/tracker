import type { AiImage } from "./ai";

/** Максимальная сторона картинки перед отправкой — баланс качества распознавания и размера. */
const MAX_SIDE = 1024;
const JPEG_QUALITY = 0.72;

/**
 * Читает файл-картинку, уменьшает до MAX_SIDE по большей стороне и кодирует в JPEG base64.
 * Возвращает AiImage (data — без data-URL-префикса) и dataUrl для превью.
 */
export async function fileToAiImage(file: File): Promise<{ image: AiImage; dataUrl: string }> {
  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context недоступен");
  ctx.drawImage(bitmap, 0, 0, w, h);
  if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  const data = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return { image: { mediaType: "image/jpeg", data }, dataUrl };
}

/** createImageBitmap с фолбэком на <img> для старых браузеров. */
async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* фолбэк ниже */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("не удалось загрузить изображение"));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}
