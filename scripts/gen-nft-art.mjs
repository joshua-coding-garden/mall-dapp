// 生成多張「原創生成藝術」NFT 圖 + ERC-721 metadata，輸出到 docs/nft/（GitHub Pages 託管）
// 用法：node scripts/gen-nft-art.mjs [數量]   預設 12 張
// 圖是程式生成的，無著作權問題；放在自己的 repo，穩定可驗證。
import fs from "fs";
import path from "path";

const N = Number(process.argv[2]) || 12;
const BASE = "https://joshua-coding-garden.github.io/mall-dapp/nft";
const OUT = path.join("docs", "nft");
const IMG = path.join(OUT, "img");
fs.mkdirSync(IMG, { recursive: true });

// ---- 種子亂數（可重現）----
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const ri = (r, a, b) => Math.floor(r() * (b - a + 1)) + a;
const rf = (r, a, b) => r() * (b - a) + a;

const PALETTES = {
  Sunset: ["#ff6b6b", "#ffa94d", "#ffd43b", "#f06595", "#845ef7"],
  Ocean: ["#0c2461", "#1e3799", "#4a69bd", "#60a3bc", "#82ccdd"],
  Neon: ["#0ff0fc", "#fe53bb", "#f5d300", "#08f7fe", "#9d00ff"],
  Forest: ["#2d6a4f", "#40916c", "#52b788", "#74c69d", "#b7e4c7"],
  Candy: ["#ff99c8", "#fcf6bd", "#d0f4de", "#a9def9", "#e4c1f9"],
  Ember: ["#370617", "#9d0208", "#dc2f02", "#f48c06", "#ffba08"],
  Grape: ["#3a0ca3", "#560bad", "#7209b7", "#b5179e", "#f72585"],
  Mint: ["#0b3d2e", "#1b6b4c", "#2dc98f", "#7defc0", "#e9fff7"],
};
const PAL_NAMES = Object.keys(PALETTES);

// ---- 10 種風格：每個回傳 512x512 的 SVG 內容 ----
const STYLES = {
  Aurora: (r, pal) => {
    let defs = "", body = "";
    for (let i = 0; i < 5; i++) {
      const c1 = pick(r, pal), c2 = pick(r, pal);
      defs += `<radialGradient id="g${i}" cx="${ri(r,10,90)}%" cy="${ri(r,10,90)}%" r="70%">
        <stop offset="0%" stop-color="${c1}" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="${c2}" stop-opacity="0"/></radialGradient>`;
      body += `<circle cx="${ri(r,0,512)}" cy="${ri(r,0,512)}" r="${ri(r,180,340)}" fill="url(#g${i})"/>`;
    }
    return `<defs><filter id="b"><feGaussianBlur stdDeviation="18"/></filter>${defs}</defs>
      <rect width="512" height="512" fill="#0b0e1a"/><g filter="url(#b)">${body}</g>`;
  },
  Mondrian: (r, pal) => {
    let body = `<rect width="512" height="512" fill="#f8f9fa"/>`;
    const lines = [0, 512];
    for (let i = 0; i < ri(r, 3, 5); i++) lines.push(ri(r, 60, 452));
    lines.sort((a, b) => a - b);
    for (let xi = 0; xi < lines.length - 1; xi++)
      for (let yi = 0; yi < lines.length - 1; yi++)
        if (r() > 0.55)
          body += `<rect x="${lines[xi]}" y="${lines[yi]}" width="${lines[xi+1]-lines[xi]}" height="${lines[yi+1]-lines[yi]}" fill="${pick(r,pal)}"/>`;
    lines.forEach((l) => {
      body += `<rect x="${l-6}" y="0" width="12" height="512" fill="#111"/>`;
      body += `<rect x="0" y="${l-6}" width="512" height="12" fill="#111"/>`;
    });
    return body;
  },
  Rings: (r, pal) => {
    let body = `<rect width="512" height="512" fill="#10141f"/>`;
    const cx = ri(r, 160, 352), cy = ri(r, 160, 352);
    for (let rad = 250; rad > 6; rad -= ri(r, 8, 22))
      body += `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="none" stroke="${pick(r,pal)}" stroke-width="${ri(r,3,9)}" opacity="0.9"/>`;
    return body;
  },
  LowPoly: (r, pal) => {
    let body = `<rect width="512" height="512" fill="${pick(r,pal)}"/>`;
    const step = 64;
    const pt = (x, y) => `${x + (x % (2*step) ? rf(r,-18,18):0)},${y + rf(r,-18,18)}`;
    for (let y = -step; y < 512; y += step)
      for (let x = -step; x < 512; x += step) {
        body += `<polygon points="${pt(x,y)} ${pt(x+step,y)} ${pt(x,y+step)}" fill="${pick(r,pal)}" opacity="0.92"/>`;
        body += `<polygon points="${pt(x+step,y)} ${pt(x+step,y+step)} ${pt(x,y+step)}" fill="${pick(r,pal)}" opacity="0.92"/>`;
      }
    return body;
  },
  Cosmos: (r, pal) => {
    let body = `<defs><radialGradient id="p" cx="35%" cy="35%" r="70%">
      <stop offset="0%" stop-color="${pick(r,pal)}"/><stop offset="100%" stop-color="${pick(r,pal)}"/></radialGradient></defs>
      <rect width="512" height="512" fill="#05060f"/>`;
    for (let i = 0; i < 160; i++)
      body += `<circle cx="${ri(r,0,512)}" cy="${ri(r,0,512)}" r="${rf(r,0.4,1.8).toFixed(1)}" fill="#fff" opacity="${rf(r,0.3,1).toFixed(2)}"/>`;
    const cx = ri(r, 150, 360), cy = ri(r, 150, 360), rad = ri(r, 70, 130);
    body += `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="url(#p)"/>`;
    body += `<ellipse cx="${cx}" cy="${cy}" rx="${rad*1.9}" ry="${rad*0.5}" fill="none" stroke="${pick(r,pal)}" stroke-width="6" opacity="0.7" transform="rotate(${ri(r,-30,30)} ${cx} ${cy})"/>`;
    return body;
  },
  Bauhaus: (r, pal) => {
    let body = `<rect width="512" height="512" fill="${pick(r,pal)}"/>`;
    for (let i = 0; i < ri(r, 7, 11); i++) {
      const c = pick(r, pal), x = ri(r, 0, 512), y = ri(r, 0, 512), s = ri(r, 70, 200), k = r();
      if (k < 0.33) body += `<circle cx="${x}" cy="${y}" r="${s/2}" fill="${c}"/>`;
      else if (k < 0.66) body += `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${c}" transform="rotate(${ri(r,0,90)} ${x} ${y})"/>`;
      else body += `<path d="M${x} ${y} a${s/2} ${s/2} 0 0 1 ${s} 0 z" fill="${c}"/>`;
    }
    return body;
  },
  Waves: (r, pal) => {
    let body = `<rect width="512" height="512" fill="${pick(r,pal)}"/>`;
    const bands = ri(r, 6, 9);
    for (let b = 0; b < bands; b++) {
      const baseY = (512 / bands) * b + 40, amp = rf(r, 18, 55), ph = rf(r, 0, 6.28);
      let d = `M0 512 L0 ${baseY.toFixed(0)}`;
      for (let x = 0; x <= 512; x += 16)
        d += ` L${x} ${(baseY + Math.sin(x / 60 + ph) * amp).toFixed(1)}`;
      d += ` L512 512 Z`;
      body += `<path d="${d}" fill="${pick(r,pal)}" opacity="0.85"/>`;
    }
    return body;
  },
  Pixels: (r, pal) => {
    let body = `<rect width="512" height="512" fill="#0d0d12"/>`;
    const g = pick(r, [8, 16, 32]), s = 512 / g;
    for (let y = 0; y < g; y++)
      for (let x = 0; x < g; x++)
        if (r() > 0.25)
          body += `<rect x="${x*s}" y="${y*s}" width="${s}" height="${s}" fill="${pick(r,pal)}"/>`;
    return body;
  },
  Chain: (r, pal) => {
    let body = `<rect width="512" height="512" fill="#0a0f1f"/>`;
    const nodes = [];
    for (let i = 0; i < ri(r, 9, 14); i++) nodes.push([ri(r, 40, 472), ri(r, 40, 472)]);
    nodes.forEach((n, i) => {
      const m = nodes[(i + 1) % nodes.length], k = nodes[(i + 3) % nodes.length];
      body += `<line x1="${n[0]}" y1="${n[1]}" x2="${m[0]}" y2="${m[1]}" stroke="${pick(r,pal)}" stroke-width="2" opacity="0.6"/>`;
      body += `<line x1="${n[0]}" y1="${n[1]}" x2="${k[0]}" y2="${k[1]}" stroke="${pick(r,pal)}" stroke-width="1.5" opacity="0.4"/>`;
    });
    nodes.forEach((n) => {
      body += `<circle cx="${n[0]}" cy="${n[1]}" r="${ri(r,10,20)}" fill="${pick(r,pal)}"/>`;
      body += `<circle cx="${n[0]}" cy="${n[1]}" r="${ri(r,22,34)}" fill="none" stroke="${pick(r,pal)}" stroke-width="1.5" opacity="0.5"/>`;
    });
    return body;
  },
  Spiro: (r, pal) => {
    let body = `<rect width="512" height="512" fill="#070710"/>`;
    const cx = 256, cy = 256, R = rf(r, 90, 150), rr = rf(r, 30, 80), d = rf(r, 40, 90);
    for (let layer = 0; layer < 3; layer++) {
      let pts = "";
      for (let t = 0; t < 6.283 * 14; t += 0.08) {
        const x = (R - rr) * Math.cos(t) + d * Math.cos(((R - rr) / rr) * t);
        const y = (R - rr) * Math.sin(t) - d * Math.sin(((R - rr) / rr) * t);
        pts += `${(cx + x).toFixed(1)},${(cy + y * (1 + layer * 0.12)).toFixed(1)} `;
      }
      body += `<polyline points="${pts}" fill="none" stroke="${pick(r,pal)}" stroke-width="1.6" opacity="0.75"/>`;
    }
    return body;
  },
};
const STYLE_NAMES = Object.keys(STYLES);

// ---- 產生 N 張 ----
const items = [];
for (let i = 1; i <= N; i++) {
  const style = STYLE_NAMES[(i - 1) % STYLE_NAMES.length];
  const palName = PAL_NAMES[ri(rng(i * 99 + 7), 0, PAL_NAMES.length - 1)];
  const r = rng(i * 1000 + 31);
  const inner = STYLES[style](r, PALETTES[palName]);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${inner}
    <text x="496" y="500" text-anchor="end" font-family="Consolas,monospace" font-size="15" fill="#fff" opacity="0.55">MALL #${i}</text></svg>`;
  fs.writeFileSync(path.join(IMG, `${i}.svg`), svg);
  items.push({ i, style, palName, svg });
}

console.log(`✓ 已生成 ${N} 張 SVG → ${IMG}`);

// ---- 嘗試用 Playwright 轉成 PNG（相容性最好）；失敗就用 SVG ----
let usePng = false;
try {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
  for (const it of items) {
    await page.setContent(`<!doctype html><html><body style="margin:0">${it.svg}</body></html>`);
    await page.screenshot({ path: path.join(IMG, `${it.i}.png`), clip: { x: 0, y: 0, width: 512, height: 512 } });
  }
  await browser.close();
  usePng = true;
  console.log(`✓ 已轉檔 ${N} 張 PNG（Playwright）`);
} catch (e) {
  console.log("ℹ Playwright 不可用，改用 SVG 當圖片：" + (e.message || e));
}

// ---- 寫 metadata JSON ----
const ext = usePng ? "png" : "svg";
for (const it of items) {
  const meta = {
    name: `Mall Genesis #${it.i} · ${it.style}`,
    description: "原創生成藝術，為 Web3 混合型商城競價拍賣 demo 鑄造（程式生成、無著作權疑慮）。Generative art for the mall-dapp auction demo.",
    image: `${BASE}/img/${it.i}.${ext}`,
    attributes: [
      { trait_type: "Style", value: it.style },
      { trait_type: "Palette", value: it.palName },
      { trait_type: "Edition", value: `${it.i}/${N}` },
    ],
  };
  fs.writeFileSync(path.join(OUT, `${it.i}.json`), JSON.stringify(meta, null, 2));
}
console.log(`✓ 已寫 ${N} 個 metadata JSON → ${OUT}`);
console.log(`\n貼進「NFT metadata 網址」欄的網址（一個拍賣貼一個）：`);
items.forEach((it) => console.log(`  ${BASE}/${it.i}.json   (${it.style})`));
