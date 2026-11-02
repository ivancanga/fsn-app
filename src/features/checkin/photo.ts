export type PreparedCheckInPhoto = {
  file: File;
  previewUrl: string;
};

const MAX_IMAGE_SIZE = 800;
const JPEG_QUALITY = 0.85;

export async function prepareCheckInPhoto(file: File): Promise<PreparedCheckInPhoto> {
  const sourceUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(sourceUrl);
    const { width, height } = getScaledDimensions(image.width, image.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo procesar la foto.");
    context.drawImage(image, 0, 0, width, height);

    const blob = await canvasToJpeg(canvas);
    return {
      file: new File([blob], file.name, { type: "image/jpeg" }),
      previewUrl: URL.createObjectURL(blob),
    };
  } catch (error) {
    console.error("Error al optimizar la foto del check-in:", error);
    return { file, previewUrl: await readFileAsDataUrl(file) };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function getScaledDimensions(width: number, height: number) {
  const scale = Math.min(1, MAX_IMAGE_SIZE / Math.max(width, height));
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = document.createElement("img");
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo convertir la foto."))),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("No se pudo leer la foto seleccionada."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer la foto seleccionada."));
    reader.readAsDataURL(file);
  });
}
