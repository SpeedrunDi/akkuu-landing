import sharp from 'sharp';
import { copyFile, readdir, mkdir, stat } from 'node:fs/promises';
import { join, basename } from 'node:path';

const SRC = '_originals/products';
const DST = 'public/images/products';
const MAX_SIDE = 1600;
const WEBP_QUALITY = 88;

await mkdir(DST, { recursive: true });

const files = (await readdir(SRC)).filter((f) => f.endsWith('.webp'));

for (const file of files) {
  const srcPath = join(SRC, file);
  const dstPath = join(DST, file);
  const srcStat = await stat(srcPath);
  const meta = await sharp(srcPath).metadata();
  const needsResize = (meta.width ?? 0) > MAX_SIDE || (meta.height ?? 0) > MAX_SIDE;

  if (!needsResize) {
    // Original is already within bounds — just copy it, don't re-encode (avoids growing file size).
    await copyFile(srcPath, dstPath);
  } else {
    await sharp(srcPath)
      .resize({
        width: MAX_SIDE,
        height: MAX_SIDE,
        fit: 'inside',
        kernel: 'lanczos3',
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY, effort: 6 })
      .toFile(dstPath);
  }

  const dstStat = await stat(dstPath);
  const outMeta = await sharp(dstPath).metadata();
  const kb = (n) => (n / 1024).toFixed(1).padStart(6);
  console.log(
    `${basename(file).padEnd(18)}  ${meta.width}×${meta.height} (${kb(srcStat.size)} KB) → ${outMeta.width}×${outMeta.height} (${kb(dstStat.size)} KB)`,
  );
}
