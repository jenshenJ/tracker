import { join } from "node:path";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Resvg } from "@resvg/resvg-js";

/**
 * Иконка приложения с числом цели: /api/icon?goal=95&size=192
 * iOS снимает apple-touch-icon в момент «На экран Домой», поэтому после
 * смены цели ярлык нужно добавить заново — иконка подтянется с новым числом.
 */

const FONT_PATH = join(process.cwd(), "api", "assets", "space-grotesk-700.ttf");

export default function handler(req: VercelRequest, res: VercelResponse) {
  const goalRaw = parseFloat(String(req.query.goal ?? "95"));
  const goal = Number.isFinite(goalRaw) && goalRaw > 0 && goalRaw < 1000 ? Math.round(goalRaw) : 95;
  const sizeRaw = parseInt(String(req.query.size ?? "192"));
  const size = [180, 192, 512].includes(sizeRaw) ? sizeRaw : 192;

  const text = String(goal);
  /* подгон размера под 2–3 цифры */
  const fontSize = text.length <= 2 ? 0.52 : 0.4;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0A0A0A"/>
  <text x="256" y="295" text-anchor="middle" dominant-baseline="middle"
    font-family="Space Grotesk" font-weight="700" font-size="${Math.round(512 * fontSize)}"
    fill="#D6F451">${text}</text>
  <rect x="123" y="379" width="266" height="10" rx="5" fill="#262626"/>
  <rect x="123" y="379" width="165" height="10" rx="5" fill="#D6F451"/>
</svg>`;

  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
    font: { fontFiles: [FONT_PATH], defaultFontFamily: "Space Grotesk", loadSystemFonts: false },
  })
    .render()
    .asPng();

  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
  return res.status(200).send(Buffer.from(png));
}
