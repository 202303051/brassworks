import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const phonePreview = process.argv.includes('--lan');
const privateAddress = Object.values(networkInterfaces())
  .flat()
  .find(
    (item) =>
      item.family === 'IPv4' &&
      !item.internal &&
      /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(item.address),
  )?.address;
const host = phonePreview ? privateAddress : '127.0.0.1';
const port = phonePreview ? 5174 : 5173;
const url = `http://${phonePreview ? host : 'localhost'}:${port}`;
try {
  if (!host)
    throw new Error('Connect this PC to Wi-Fi or a private LAN before starting the phone preview.');
  const server = await createServer({
    server: {
      host,
      port,
      strictPort: true,
      open: process.argv.includes('--open') ? url : false,
    },
  });
  await server.listen();
  console.log(`\nBrassworks is running at ${url}`);
  if (phonePreview) console.log('Open this address in the phone browser on the same Wi-Fi.');
  console.log('Keep this process open. Press Ctrl+C to stop.\n');
  const stop = async () => {
    await server.close();
    process.exit(0);
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
} catch (error) {
  console.error(
    error.code === 'EADDRINUSE' || error.message.includes(`Port ${port} is already in use`)
      ? `Port ${port} is already in use. Open ${url} or stop that server first.`
      : error.message,
  );
  process.exitCode = 1;
}
