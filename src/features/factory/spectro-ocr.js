import { parseSpectroText } from './spectro-parser.js';

export function validateSpectroPhoto(file) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Choose a JPG, PNG or WebP photo. Convert HEIC photos to JPG first.');
  if (file.size <= 0 || file.size > 15 * 1024 * 1024)
    throw new Error('Choose a photo smaller than 15 MB.');
}

export async function recognizeSpectroPhoto(file, { signal, onProgress = () => {} } = {}) {
  validateSpectroPhoto(file);
  let timedOut = false;
  const check = () => {
    if (signal?.aborted) throw new Error('Scan cancelled.');
    if (timedOut) throw new Error('The scan took too long. Try a smaller photo.');
  };
  check();
  const photoUrl = URL.createObjectURL(file);
  let worker;
  let timer;
  let canvas;
  let abort;
  let released = false;
  const releaseWorker = async () => {
    if (!worker || released) return;
    released = true;
    try {
      await worker.terminate();
    } catch {
      /* Already stopped. */
    }
  };
  try {
    const image = await new Promise((resolve, reject) => {
      const photo = new window.Image();
      photo.onload = () => resolve(photo);
      photo.onerror = () => reject(new Error('This photo could not be opened. Try a JPG or PNG.'));
      photo.src = photoUrl;
    });
    check();
    if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > 24000000)
      throw new Error(
        'The photo is too large to scan on a phone. Crop or resize it and try again.',
      );
    const scale = Math.min(2, 2200 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const { createWorker } = await import('tesseract.js');
    check();
    const deadline = new Promise((_, reject) => {
      abort = () => reject(new Error('Scan cancelled.'));
      signal?.addEventListener('abort', abort, { once: true });
      timer = window.setTimeout(() => {
        timedOut = true;
        reject(new Error('The scan took too long. Crop the photo to its results and try again.'));
      }, 90000);
    });
    const task = (async () => {
      worker = await createWorker('eng', 1, {
        workerPath: new URL('/ocr/worker.min.js', window.location.href).href,
        corePath: new URL('/ocr/core', window.location.href).href,
        langPath: new URL('/ocr/lang', window.location.href).href,
        workerBlobURL: false,
        cacheMethod: 'none',
        logger: (event) =>
          onProgress(event.status === 'recognizing text' ? Math.round(event.progress * 100) : 0),
      });
      check();
      await worker.setParameters({ preserve_interword_spaces: '1', user_defined_dpi: '300' });
      const { data } = await worker.recognize(canvas, { rotateAuto: true });
      check();
      return { ...parseSpectroText(data.text), text: data.text, confidence: data.confidence };
    })();
    try {
      return await Promise.race([task, deadline]);
    } catch (error) {
      // If cancellation happened during worker initialization, release it once ready.
      task.finally(releaseWorker).catch(() => {});
      throw error;
    }
  } finally {
    window.clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
    URL.revokeObjectURL(photoUrl);
    await releaseWorker();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
