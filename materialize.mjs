import { createDecipheriv } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const expiresAt = Date.parse('2026-11-30T00:00:00+09:00');
const closedPage = '<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>출장 가이드 공유 종료</title><body><main><h1>출장 가이드 공유가 종료되었습니다.</h1></main></body></html>';

export function decryptAsset(payload, key) {
  if (key.length !== 32 || payload.length <= 28) {
    throw new Error('Invalid site payload or decryption key.');
  }
  const decipher = createDecipheriv('aes-256-gcm', key, payload.subarray(0, 12));
  decipher.setAuthTag(payload.subarray(12, 28));
  return gunzipSync(Buffer.concat([decipher.update(payload.subarray(28)), decipher.final()]));
}

export function renderGuide(now, close, readPayload, key) {
  return close || now >= expiresAt ? closedPage : decryptAsset(readPayload(), key);
}

if (import.meta.main || process.argv[1]?.endsWith('materialize.mjs')) {
  const key = Buffer.from(process.env.TRIP_GUIDE_KEY ?? '', 'base64');
  const content = renderGuide(
    Date.now(),
    process.env.PAGES_CLOSE === 'true',
    () => readFileSync(new URL('./guide.enc', import.meta.url)),
    key,
  );
  mkdirSync('dist', { recursive: true });
  writeFileSync('dist/index.html', content);
  if (Buffer.isBuffer(content)) {
    const image = decryptAsset(readFileSync(new URL('./og-image.enc', import.meta.url)), key);
    writeFileSync('dist/og-image.png', image);
  } else {
    rmSync('dist/og-image.png', { force: true });
  }
}

