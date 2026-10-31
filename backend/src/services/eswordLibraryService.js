const BASE_URL = 'https://www.eswordlibrary.com';
const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; Scriptorium/1.0)',
  'Accept': 'text/html,application/xhtml+xml,*/*;q=0.9',
};

// All alphalist pages, extracted from the site navigation.
const ALPHALIST_PAGES = [
  '/alphalist/a-esword-modules-authors/',
  '/alphalist/am-at-esword-modules-authors/',
  '/alphalist/au-az-esword-modules-authors/',
  '/alphalist/ba-bn-esword-modules-authors/',
  '/alphalist/bo-esword-authors/',
  '/alphalist/bp-bz-esword-authors/',
  '/alphalist/c-esword-modules/',
  '/alphalist/co-cz-esword-authors/',
  '/alphalist/da-dl-esword-modules-authors/',
  '/alphalist/dm-dz-esword-modules-authors/',
  '/alphalist/ea-el-esword-modules-authors/',
  '/alphalist/em-ez-esword-modules-authors/',
  '/alphalist/fa-fl-esword-modules-authors/',
  '/alphalist/fm-fz-esword-modules-authors/',
  '/alphalist/ga-gl-esword-modules-authors/',
  '/alphalist/gm-gz-esword-modules-authors/',
  '/alphalist/ha-hl-esword-modules-authors/',
  '/alphalist/hm-hz-esword-modules-authors/',
  '/alphalist/i-esword-modules-authors/',
  '/alphalist/ja-jz-esword-modules-authors/',
  '/alphalist/ka-kz-esword-modules-authors/',
  '/alphalist/la-lz-esword-modules-authors/',
  '/alphalist/ma-ml-esword-modules-authors/',
  '/alphalist/mm-mz-esword-modules-authors/',
  '/alphalist/n-esword-modules-authors/',
  '/alphalist/numerical-title-author-esword-modules/',
  '/alphalist/oa-oz-esword-modules-authors/',
  '/alphalist/pa-pl-esword-modules-authors/',
  '/alphalist/pm-pz-esword-modules-authors/',
  '/alphalist/qr-esword-modules-authors/',
  '/alphalist/sa-sl-esword-modules-authors/',
  '/alphalist/sm-sz-esword-modules-authors/',
  '/alphalist/ta-tz-esword-modules-authors/',
  '/alphalist/uvwxyz-esword-modules-authors/',
].map((p) => BASE_URL + p);

// Only formats we can actually install.
const SUPPORTED_EXTS = new Set(['.bblx', '.bbli', '.cmtx', '.dctx', '.topx', '.zip']);

const EXT_TYPE = {
  '.bblx': 'BIBLE',
  '.bbli': 'BIBLE',
  '.cmtx': 'COMMENTARY',
  '.dctx': 'DICT',
  '.topx': 'BOOK',
};

// Infer the module type from the filename stem when the file is a .zip.
function inferZipType(filename) {
  const name = filename.replace(/\.[^.]+$/, '').toLowerCase().replace(/[-_]+/g, ' ');
  if (/\bcommentar(y|ies)\b|\bexposit(ion|ory)\b|\bhomil(y|ies)\b|\bsermons?\b|\bannotations?\b/.test(name)) {
    return 'COMMENTARY';
  }
  if (/\bdictionar(y|ies)\b|\blexicon\b|\bconcordance\b|\bencyclop|\bthesaurus\b|\bglossary\b|\bcyclopedia\b/.test(name)) {
    return 'DICT';
  }
  if (/\bversion\b|\bbible\b|\btranslation\b|\btestament\b|\bseptuagint\b|\bvulgate\b|\binterlinear\b|\bpolyglot\b|\bscriptures?\b/.test(name)) {
    return 'BIBLE';
  }
  return 'BOOK';
}

export async function fetchCatalog() {
  const allEntries = [];
  const BATCH = 6;
  for (let i = 0; i < ALPHALIST_PAGES.length; i += BATCH) {
    const batch = ALPHALIST_PAGES.slice(i, i + BATCH);
    const pages = await Promise.all(batch.map(fetchAlphalistPage));
    for (const entries of pages) allEntries.push(...entries);
  }
  // Deduplicate by filename — the same module can appear on multiple alphalist pages,
  // potentially with different URL timestamps each time.
  const seen = new Set();
  return allEntries.filter((e) => {
    if (seen.has(e.filename)) return false;
    seen.add(e.filename);
    return true;
  });
}

async function fetchAlphalistPage(url) {
  try {
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    return parseAlphalistPage(html);
  } catch {
    return [];
  }
}

function parseAlphalistPage(html) {
  const entries = [];
  // Match each dlm-download-link <a> element and its inner content up to </a>.
  // Attribute order: href before title, or title before href — handle both.
  const re = /<a\b[^>]*class="[^"]*dlm-download-link[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const tagHtml = m[0];
    const innerHtml = m[1];

    // Extract href
    const hrefMatch = tagHtml.match(/\bhref="([^"]+)"/i);
    if (!hrefMatch) continue;
    const downloadUrl = hrefMatch[1];

    // Extract filename from inner text (first whitespace-delimited token, skipping spans)
    const innerText = innerHtml.replace(/<[^>]+>/g, '').trim();
    const filename = innerText.split(/\s+/)[0] || '';
    if (!filename || !filename.includes('.')) continue;

    // Filter to installable extensions
    const extMatch = filename.match(/\.([^.]+)$/i);
    const ext = extMatch ? ('.' + extMatch[1].toLowerCase()) : '';
    if (!SUPPORTED_EXTS.has(ext)) continue;

    const title = filenameToTitle(filename);
    const type = ext === '.zip' ? inferZipType(filename) : (EXT_TYPE[ext] ?? 'BOOK');
    entries.push({ title, filename, downloadUrl, ext, type });
  }
  return entries;
}

function filenameToTitle(filename) {
  const name = filename.replace(/\.[^.]+$/, '');
  return name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

export async function downloadModuleFile(downloadUrl, onProgress) {
  let url = downloadUrl;
  if (url.startsWith('/')) url = BASE_URL + url;
  if (!url.startsWith('https://') && !url.startsWith('http://')) {
    throw Object.assign(new Error('Invalid download URL'), { status: 400 });
  }

  onProgress?.('Downloading file…');
  const res = await fetch(url, {
    headers: { ...FETCH_HEADERS, Referer: `${BASE_URL}/` },
    redirect: 'follow',
    signal: AbortSignal.timeout(300000),
  });
  if (!res.ok) {
    throw Object.assign(new Error(`Download returned ${res.status}`), { status: 502 });
  }

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('text/html')) {
    throw Object.assign(
      new Error('Download URL returned an HTML page — the file may require registration or the link has expired'),
      { status: 502 },
    );
  }

  const buffer = Buffer.from(await res.arrayBuffer());

  // Derive filename from Content-Disposition or final URL
  const cd = res.headers.get('content-disposition') || '';
  const fnMatch = cd.match(/filename[^;=\n]*=\s*(?:['"]([^'"]+)['"]|([^;\n]+))/i);
  let filename = (fnMatch?.[1] || fnMatch?.[2] || '').trim().replace(/['"]/g, '');
  if (!filename) {
    try {
      filename = new URL(res.url || url).pathname.split('/').pop() || '';
    } catch {
      filename = '';
    }
    if (!filename || !filename.includes('.')) filename = 'module.zip';
  }

  return { buffer, filename };
}
