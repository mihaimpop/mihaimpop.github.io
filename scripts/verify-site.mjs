import { readFileSync, existsSync } from "node:fs";

const textFiles = [
  "index.html",
  "mihai-pop.html",
  "mihai-pop-film.html",
  "mihai-pop-youtube.html",
  "public/llms.txt",
  "public/sitemap.xml",
];

const requiredFiles = [
  "public/llms.txt",
  "public/robots.txt",
  "public/sitemap.xml",
  "public/og-image.jpg",
  "public/favicon.ico",
  "public/favicon.svg",
  "public/favicon-96.png",
  "public/apple-touch-icon.png",
  "public/media/home-poster.svg",
  "public/media/profile-signal.svg",
  "public/media/film-signal.svg",
  "public/media/youtube-signal.svg",
];

const errors = [];
const draftTerms = ["\\[" + "Insert", "INS" + "ERT_", "INS" + "ERT YOUR", "place" + "holder"];
const draftPattern = new RegExp(draftTerms.join("|"), "i");
const staleOgImage = "og-image." + "png";

function read(file) {
  return readFileSync(file, "utf8");
}

function pngSize(file) {
  const bytes = readFileSync(file);
  if (bytes.toString("ascii", 1, 4) !== "PNG") return null;
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

function jpegSize(file) {
  const bytes = readFileSync(file);
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: bytes.readUInt16BE(offset + 5),
        width: bytes.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }
  return null;
}

function expectSize(file, expected) {
  const size = file.endsWith(".png") ? pngSize(file) : jpegSize(file);
  if (!size) {
    errors.push(`${file} has an unsupported or unreadable image format`);
    return;
  }
  if (size.width !== expected.width || size.height !== expected.height) {
    errors.push(
      `${file} is ${size.width}x${size.height}; expected ${expected.width}x${expected.height}`
    );
  }
}

for (const file of requiredFiles) {
  if (!existsSync(file)) errors.push(`${file} is missing`);
}

for (const file of textFiles) {
  const content = read(file);
  if (draftPattern.test(content)) {
    errors.push(`${file} still contains draft-marker text`);
  }
}

for (const file of [
  "index.html",
  "mihai-pop.html",
  "mihai-pop-film.html",
  "mihai-pop-youtube.html",
]) {
  const content = read(file);
  if (!content.includes("/favicon-96.png")) errors.push(`${file} does not link the 96px favicon`);
  if (!content.includes("og-image.jpg"))
    errors.push(`${file} does not reference the optimized OG image`);
  if (content.includes(staleOgImage)) errors.push(`${file} still references ${staleOgImage}`);
}

expectSize("public/og-image.jpg", { width: 1200, height: 630 });
expectSize("public/favicon-96.png", { width: 96, height: 96 });

if (existsSync("dist")) {
  for (const file of [
    "dist/llms.txt",
    "dist/robots.txt",
    "dist/sitemap.xml",
    "dist/og-image.jpg",
    "dist/favicon.ico",
    "dist/favicon.svg",
    "dist/favicon-96.png",
    "dist/apple-touch-icon.png",
    "dist/media/home-poster.svg",
  ]) {
    if (!existsSync(file)) errors.push(`${file} is missing from dist; run pnpm build`);
  }
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log("Site verification passed.");
