import "server-only";
import sharp from "sharp";
import { LOGO_INK, LOGO_WHITE } from "./watermark-logo";

/** Ladrilho com a logo clara e a escura, girado, para repetir pela foto inteira. Guardado por tamanho. */
const tiles = new Map<number, Promise<Buffer>>();

function withOpacity(buf: Buffer, h: number, opacity: number) {
  return sharp(buf)
    .resize({ height: h })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
    .then(({ data, info }) => {
      for (let i = 3; i < data.length; i += 4) data[i] = Math.round(data[i] * opacity);
      return sharp(data, { raw: info }).png().toBuffer();
    });
}

function tile(size: number) {
  let t = tiles.get(size);
  if (!t) {
    t = (async () => {
      const logoH = Math.round(size * 0.5);
      const [white, ink] = await Promise.all([
        withOpacity(Buffer.from(LOGO_WHITE, "base64"), logoH, 0.5),
        withOpacity(Buffer.from(LOGO_INK, "base64"), logoH, 0.26),
      ]);
      const logoW = Math.round((logoH * 222) / 257);
      const square = await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite([
          { input: white, left: Math.round(size * 0.04), top: Math.round(size * 0.02) },
          { input: ink, left: Math.min(size - logoW, Math.round(size * 0.5)), top: Math.round(size * 0.48) },
        ])
        .png()
        .toBuffer();
      return sharp(square).rotate(-28, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    })();
    tiles.set(size, t);
  }
  return t;
}

/** Foto de prova: reduzida a 1400 px e coberta inteira pela logo repetida. */
export async function watermarked(source: Buffer, maxSide = 1400) {
  const base = sharp(source).resize({ width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: true });
  const { data, info } = await base.toBuffer({ resolveWithObject: true });
  // Ladrilhos pequenos e próximos: a logo cobre a foto inteira.
  const size = Math.max(110, Math.round(Math.max(info.width, info.height) / 7));
  const big = await withOpacity(Buffer.from(LOGO_WHITE, "base64"), Math.round(Math.min(info.width, info.height) * 0.55), 0.32);
  return sharp(data)
    .composite([
      { input: await tile(size), tile: true, blend: "over" },
      { input: big, gravity: "center" },
    ])
    .jpeg({ quality: 72, mozjpeg: true })
    .toBuffer();
}
