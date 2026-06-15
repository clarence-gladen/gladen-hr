import sharp from "sharp";
import path from "path";

const BRAND_BLUE = "#2b3d6b";
const SRC = path.join(process.cwd(), "public/images/logo-white.png");
const OUT_DIR = path.join(process.cwd(), "public/icons");

const sizes = [
  { name: "icon-192.png", size: 192, logoScale: 0.7 },
  { name: "icon-512.png", size: 512, logoScale: 0.7 },
  { name: "apple-touch-icon.png", size: 180, logoScale: 0.7 },
  // Maskable icons need extra safe-zone padding so the logo isn't cropped
  { name: "maskable-192.png", size: 192, logoScale: 0.5 },
  { name: "maskable-512.png", size: 512, logoScale: 0.5 },
];

for (const { name, size, logoScale } of sizes) {
  const logoWidth = Math.round(size * logoScale);
  const logo = await sharp(SRC)
    .resize({ width: logoWidth, fit: "inside" })
    .toBuffer();
  const logoMeta = await sharp(logo).metadata();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BRAND_BLUE,
    },
  })
    .composite([
      {
        input: logo,
        top: Math.round((size - (logoMeta.height ?? size)) / 2),
        left: Math.round((size - (logoMeta.width ?? size)) / 2),
      },
    ])
    .png()
    .toFile(path.join(OUT_DIR, name));

  console.log(`Generated ${name}`);
}
