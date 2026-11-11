import { createRequire } from 'node:module';
import { createReadStream, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);

// Serve pinned OCR code/model files from this app, never from a public CDN.
export function localOcrAssets() {
  const engine = dirname(require.resolve('tesseract.js/package.json'));
  const core = dirname(require.resolve('tesseract.js-core/package.json'));
  const language = dirname(require.resolve('@tesseract.js-data/eng/package.json'));
  const assets = new Map([
    ['/ocr/worker.min.js', join(engine, 'dist/worker.min.js')],
    ['/ocr/lang/eng.traineddata.gz', join(language, '4.0.0_best_int/eng.traineddata.gz')],
    ['/ocr/LICENSE-tesseract-js.txt', join(engine, 'LICENSE.md')],
    ['/ocr/LICENSE-tesseract-core.txt', join(core, 'LICENSE')],
    ['/ocr/lang/package-metadata.json', join(language, 'package.json')],
  ]);
  for (const file of readdirSync(core).filter((name) =>
    /^tesseract-core.*\.wasm(?:\.js)?$/.test(name),
  ))
    assets.set('/ocr/core/' + file, join(core, file));
  const serve = (request, response, next) => {
    const path = new URL(request.url, 'http://localhost').pathname;
    const file = assets.get(path);
    if (!file) return next();
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.statusCode = 405;
      return response.end();
    }
    response.setHeader(
      'Content-Type',
      file.endsWith('.js')
        ? 'text/javascript'
        : file.endsWith('.wasm')
          ? 'application/wasm'
          : 'application/octet-stream',
    );
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'no-cache');
    if (request.method === 'HEAD') return response.end();
    createReadStream(file).on('error', next).pipe(response);
  };
  return {
    name: 'brassworks-local-ocr',
    configureServer(server) {
      server.middlewares.use(serve);
    },
    generateBundle() {
      for (const [url, file] of assets)
        this.emitFile({ type: 'asset', fileName: url.slice(1), source: readFileSync(file) });
    },
  };
}
