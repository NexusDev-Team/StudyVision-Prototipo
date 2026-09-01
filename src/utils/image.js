// Utilidades de imagem para o fluxo de captura real: extrair um frame do vídeo
// da câmera e gerar uma miniatura leve o suficiente para caber no localStorage.

function resizeCanvas(source, sourceWidth, sourceHeight, maxSide) {
  const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
  const width = Math.round(sourceWidth * scale);
  const height = Math.round(sourceHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

/** Captura o frame atual de um <video> e retorna um data URL JPEG (payload para a API). */
export function captureFrame(videoEl, { maxSide = 1280, quality = 0.8 } = {}) {
  if (!videoEl || !videoEl.videoWidth) return null;
  const canvas = resizeCanvas(videoEl, videoEl.videoWidth, videoEl.videoHeight, maxSide);
  return canvas.toDataURL("image/jpeg", quality);
}

/** Reduz um data URL para uma miniatura leve (o que é persistido na biblioteca). */
export function makeThumbnail(dataUrl, { maxSide = 640, quality = 0.6 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = resizeCanvas(img, img.naturalWidth, img.naturalHeight, maxSide);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}
