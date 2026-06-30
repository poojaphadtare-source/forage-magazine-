const express  = require('express');
const fs        = require('fs');
const fsp       = require('fs').promises;
const path      = require('path');
const multer    = require('multer');
const { exec }  = require('child_process');
const puppeteer = require('puppeteer-core');
const PDFDocument = require('pdfkit');

const app         = express();
const PORT        = process.env.PORT || 3009;
const DATA_DIR      = path.join(__dirname, 'data');
const IMGS_DIR      = path.join(__dirname, 'public', 'images');
const PAGES_FILE    = path.join(DATA_DIR, 'pages.json');
const BACKUP_FILE   = path.join(DATA_DIR, 'pages.backup.json');
const TEMP_FILE     = path.join(DATA_DIR, 'pages.tmp.json');
const FOLDERS_FILE  = path.join(DATA_DIR, 'folders.json');

if (!fs.existsSync(IMGS_DIR)) fs.mkdirSync(IMGS_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── Safe read: validates JSON, falls back to backup if corrupt ──
function readPages() {
  if (fs.existsSync(PAGES_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(PAGES_FILE, 'utf8'));
      if (Array.isArray(data) && data.length > 0) return data;
    } catch (e) {
      console.warn('[server] pages.json is corrupt — trying backup...');
    }
  }
  if (fs.existsSync(BACKUP_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));
      if (Array.isArray(data) && data.length > 0) {
        console.warn('[server] Restored from pages.backup.json');
        fs.writeFileSync(PAGES_FILE, JSON.stringify(data, null, 2));
        return data;
      }
    } catch (e) {
      console.warn('[server] Backup also unreadable:', e.message);
    }
  }
  return [];
}

// ── Safe write: atomic rename + backup (async, non-blocking) ───
async function writePages(data) {
  const json = JSON.stringify(data, null, 2);
  await fsp.writeFile(TEMP_FILE, json);
  if (fs.existsSync(PAGES_FILE)) await fsp.copyFile(PAGES_FILE, BACKUP_FILE);
  await fsp.rename(TEMP_FILE, PAGES_FILE);
}

// ── Auto-save to GitHub (debounced, background) ────────────────
let gitPushQueued = false;
function autoGitPush() {
  if (gitPushQueued) return;
  gitPushQueued = true;
  setTimeout(() => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    exec(
      `git -C "${__dirname}" add data/pages.json data/pages.backup.json public/images/ && ` +
      `git -C "${__dirname}" diff --cached --quiet || ` +
      `git -C "${__dirname}" commit -m "Auto-save: ${timestamp}" && ` +
      `git -C "${__dirname}" push origin main`,
      { windowsHide: true },
      (err, stdout, stderr) => {
        gitPushQueued = false;
        if (err) console.warn('[git] Auto-save skipped or failed:', (stderr || err.message).trim());
        else     console.log('[git] Auto-saved to GitHub ✓', timestamp);
      }
    );
  }, 3000);
}

// ── Puppeteer browser (lazy, reused across requests) ───────────
let _browser = null;

function findBrowser() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];
  return candidates.find(p => fs.existsSync(p)) || null;
}

async function getBrowser() {
  if (_browser) {
    try { await _browser.version(); return _browser; } catch (e) { _browser = null; }
  }
  const executablePath = findBrowser();
  if (!executablePath) throw new Error('No Chrome or Edge found. Please install one.');
  _browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  return _browser;
}

// ── Page export route ───────────────────────────────────────────
app.get('/api/export', async (req, res) => {
  const idx = parseInt(req.query.i || '0', 10);
  const fmt = (req.query.fmt || 'png').toLowerCase();
  let pg = null;

  try {
    const b  = await getBrowser();
    pg = await b.newPage();

    // 4× device scale = ~288 DPI — sharp fonts, crisp images, print-quality
    await pg.setViewport({ width: 900, height: 1100, deviceScaleFactor: 4 });

    // Load the editor — wait until ALL network requests finish (fonts + images)
    await pg.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle0', timeout: 60000 });

    // Wait for every web font to finish loading and painting
    await pg.evaluateHandle('document.fonts.ready');

    // Force all background images to fully load before screenshotting
    await pg.evaluate(async () => {
      const imgs = Array.from(document.querySelectorAll('img'));
      await Promise.all(imgs.map(img =>
        img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r; })
      ));
    });

    // Extra settle time for final paints
    await new Promise(r => setTimeout(r, 800));

    // Hide every piece of editor UI — clean page only
    await pg.evaluate(() => {
      [
        '.editor-toolbar', '.sidebar', '.page-wrapper-label',
        '.page-controls', '.img-upload-overlay', '.add-page-menu',
        '.add-menu-overlay', '.edit-panel', '.modal-overlay', '.toast'
      ].forEach(sel =>
        document.querySelectorAll(sel).forEach(el => { el.style.display = 'none'; })
      );
      // Remove box-shadow for clean edges
      document.querySelectorAll('.mag-page').forEach(el => {
        el.style.boxShadow = 'none';
      });
    });

    // Grab the correct page element by index
    const allPages = await pg.$$('.mag-page');
    const el = allPages[idx];
    if (!el) throw new Error(`No page at index ${idx} (only ${allPages.length} pages rendered)`);

    const fileBase = `page-${String(idx + 1).padStart(2, '0')}`;

    if (fmt === 'html') {
      // Inline all images (both <img src> and background-image) inside the browser
      // so they become base64 data URIs before we grab the HTML — avoids entity-encoding issues
      await pg.evaluate(async (pageIdx) => {
        const toDataURL = async (url) => {
          try {
            const r = await fetch(url);
            const blob = await r.blob();
            return await new Promise(res => {
              const fr = new FileReader();
              fr.onloadend = () => res(fr.result);
              fr.readAsDataURL(blob);
            });
          } catch (e) { return null; }
        };

        const page = document.querySelectorAll('.mag-page')[pageIdx];
        if (!page) return;

        // <img> tags
        for (const img of page.querySelectorAll('img')) {
          if (img.src && img.src.includes('/images/')) {
            const d = await toDataURL(img.src);
            if (d) img.src = d;
          }
        }

        // Inline background-image styles
        for (const el of page.querySelectorAll('*')) {
          const bg = el.style.backgroundImage;
          if (bg && bg.includes('/images/')) {
            const urlMatch = bg.match(/url\(['"]?([^'")\s]+)['"]?\)/);
            if (urlMatch) {
              const absUrl = urlMatch[1].startsWith('http') ? urlMatch[1] : location.origin + urlMatch[1];
              const d = await toDataURL(absUrl);
              if (d) el.style.backgroundImage = `url('${d}')`;
            }
          }
        }
      }, idx);

      const pageHTML = await pg.evaluate((pageIdx) => {
        const page = document.querySelectorAll('.mag-page')[pageIdx];
        return page ? page.outerHTML : '';
      }, idx);

      const css = fs.readFileSync(path.join(__dirname, 'public', 'magazine.css'), 'utf8');
      const fonts = `<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;0,6..72,700;1,6..72,400;1,6..72,600;1,6..72,700&family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">`;
      const fullHTML = `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n${fonts}\n<style>\n${css}\nbody{margin:0;padding:40px;background:#555;display:flex;justify-content:center;}\n</style>\n</head>\n<body>\n${pageHTML}\n</body>\n</html>`;

      res.set('Content-Type', 'text/html; charset=utf-8');
      res.set('Content-Disposition', `attachment; filename="${fileBase}.html"`);
      return res.send(fullHTML);
    }

    // Screenshot at full quality — lossless PNG (needed for png, pdf, svg)
    const pngBuffer = await el.screenshot({ type: 'png', omitBackground: false });

    if (fmt === 'svg') {
      const b64 = pngBuffer.toString('base64');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="595" height="842" viewBox="0 0 595 842">\n  <image width="595" height="842" xlink:href="data:image/png;base64,${b64}"/>\n</svg>`;
      res.set('Content-Type', 'image/svg+xml');
      res.set('Content-Disposition', `attachment; filename="${fileBase}.svg"`);
      return res.send(svg);
    }

    if (fmt === 'pdf') {
      const pdfBuf = await new Promise((resolve, reject) => {
        const doc    = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true });
        const chunks = [];
        doc.on('data',  c => chunks.push(c));
        doc.on('end',   () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        doc.image(pngBuffer, 0, 0, { width: 595.28, height: 841.89 });
        doc.end();
      });
      res.set('Content-Type', 'application/pdf');
      res.set('Content-Disposition', `attachment; filename="${fileBase}.pdf"`);
      return res.send(pdfBuf);
    }

    // Default: PNG
    res.set('Content-Type', 'image/png');
    res.set('Content-Disposition', `attachment; filename="${fileBase}.png"`);
    res.send(pngBuffer);

  } catch (err) {
    console.error('[export]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  } finally {
    if (pg) await pg.close().catch(() => {});
  }
});

// ── Validate pages.json on startup ─────────────────────────────
(function checkOnBoot() {
  const pages = readPages();
  console.log(pages.length > 0
    ? `[server] Loaded ${pages.length} pages from disk.`
    : '[server] No pages found — starting fresh.');
})();

app.use(express.json({ limit: '100mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Image upload ────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: IMGS_DIR,
  filename: (req, file, cb) => { cb(null, `${Date.now()}${path.extname(file.originalname)}`); }
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: `/images/${req.file.filename}` });
  autoGitPush();
});

// ── Folders ──────────────────────────────────────────────────────
function readFolders() {
  if (fs.existsSync(FOLDERS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(FOLDERS_FILE, 'utf8'));
      if (Array.isArray(data)) return data;
    } catch (e) {}
  }
  return [];
}
function writeFolders(data) {
  fs.writeFileSync(FOLDERS_FILE, JSON.stringify(data, null, 2));
}
app.get('/api/folders', (req, res) => {
  try { res.json(readFolders()); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/folders', (req, res) => {
  try {
    if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Expected an array' });
    writeFolders(req.body);
    res.json({ success: true });
    autoGitPush();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Pages ────────────────────────────────────────────────────────
app.get('/api/pages', (req, res) => {
  try { res.json(readPages()); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/pages', async (req, res) => {
  try {
    if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Expected an array of pages' });
    await writePages(req.body);
    res.json({ success: true });
    autoGitPush();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Start ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   FRAMEWORK MAGAZINE EDITOR  –  Kilowott   ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`\n  Open: http://localhost:${PORT}`);
  console.log('  Auto-save to GitHub: ON\n');
});
