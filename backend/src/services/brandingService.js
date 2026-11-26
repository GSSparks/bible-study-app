import { prisma } from '../db/prisma.js';

const DEFAULT_NAME = 'ScriptKata';
const MAX_NAME_LENGTH = 60;
const MAX_URL_LENGTH = 255;

/** Public — anonymous visitors need this too, to render the sidebar
 *  with the right name before any login state is known. Falls back to
 *  the default until an admin explicitly sets something else. */
export async function getBrandName() {
  const row = await prisma.appSetting.findUnique({ where: { key: 'brand_name' } });
  return row?.value || DEFAULT_NAME;
}

export async function setBrandName(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    const err = new Error('Brand name cannot be empty.');
    err.status = 400;
    throw err;
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    const err = new Error(`Brand name must be ${MAX_NAME_LENGTH} characters or fewer.`);
    err.status = 400;
    throw err;
  }
  await prisma.appSetting.upsert({
    where: { key: 'brand_name' },
    create: { key: 'brand_name', value: trimmed },
    update: { value: trimmed },
  });
  return trimmed;
}

export async function getSiteUrl() {
  const row = await prisma.appSetting.findUnique({ where: { key: 'site_url' } });
  return row?.value || null;
}

export async function setSiteUrl(url) {
  const trimmed = (url || '').trim().replace(/\/$/, '');
  if (!trimmed) {
    await prisma.appSetting.deleteMany({ where: { key: 'site_url' } });
    return null;
  }
  if (!/^https?:\/\/.+/.test(trimmed)) {
    const err = new Error('Site URL must start with http:// or https://');
    err.status = 400;
    throw err;
  }
  if (trimmed.length > MAX_URL_LENGTH) {
    const err = new Error(`Site URL must be ${MAX_URL_LENGTH} characters or fewer.`);
    err.status = 400;
    throw err;
  }
  await prisma.appSetting.upsert({
    where: { key: 'site_url' },
    create: { key: 'site_url', value: trimmed },
    update: { value: trimmed },
  });
  return trimmed;
}

export async function getLogoUrl() {
  const row = await prisma.appSetting.findUnique({ where: { key: 'brand_logo_url' } });
  return row?.value || null;
}

export async function setLogoUrl(url) {
  await prisma.appSetting.upsert({
    where: { key: 'brand_logo_url' },
    create: { key: 'brand_logo_url', value: url },
    update: { value: url },
  });
  return url;
}

export async function removeLogoUrl() {
  await prisma.appSetting.deleteMany({ where: { key: 'brand_logo_url' } });
}

export async function getTheme() {
  const row = await prisma.appSetting.findUnique({ where: { key: 'brand_theme' } });
  return row?.value || null;
}

export async function setTheme(theme) {
  const BUILT_IN = new Set(['ember', 'vesper', 'aegean', 'codex', 'gruvbox']);
  if (theme && !BUILT_IN.has(theme)) {
    const custom = await getCustomThemes();
    if (!custom.some((t) => t.id === theme)) {
      const err = new Error('Invalid theme.');
      err.status = 400;
      throw err;
    }
  }
  if (!theme) {
    await prisma.appSetting.deleteMany({ where: { key: 'brand_theme' } });
    return null;
  }
  await prisma.appSetting.upsert({
    where: { key: 'brand_theme' },
    create: { key: 'brand_theme', value: theme },
    update: { value: theme },
  });
  return theme;
}

const VALID_FONT_IDS = new Set([
  'inter', 'space-grotesk', 'source-serif', 'lora',
  'merriweather', 'dm-sans', 'ibm-plex-sans', 'nunito-sans',
]);

export async function getDisplayFont() {
  const row = await prisma.appSetting.findUnique({ where: { key: 'display_font' } });
  return row?.value || null;
}

export async function setDisplayFont(fontId) {
  if (!fontId) { await prisma.appSetting.deleteMany({ where: { key: 'display_font' } }); return null; }
  if (!VALID_FONT_IDS.has(fontId)) { const err = new Error('Invalid font.'); err.status = 400; throw err; }
  await prisma.appSetting.upsert({ where: { key: 'display_font' }, create: { key: 'display_font', value: fontId }, update: { value: fontId } });
  return fontId;
}

export async function getUiFont() {
  const row = await prisma.appSetting.findUnique({ where: { key: 'ui_font' } });
  return row?.value || null;
}

export async function setUiFont(fontId) {
  if (!fontId) { await prisma.appSetting.deleteMany({ where: { key: 'ui_font' } }); return null; }
  if (!VALID_FONT_IDS.has(fontId)) { const err = new Error('Invalid font.'); err.status = 400; throw err; }
  await prisma.appSetting.upsert({ where: { key: 'ui_font' }, create: { key: 'ui_font', value: fontId }, update: { value: fontId } });
  return fontId;
}

export async function getCustomThemes() {
  const row = await prisma.appSetting.findUnique({ where: { key: 'custom_themes' } });
  try { return row ? JSON.parse(row.value) : []; } catch { return []; }
}

export async function saveCustomTheme(theme) {
  if (!theme?.id || !theme?.name || !theme?.colors) {
    const err = new Error('Theme must have id, name, and colors.'); err.status = 400; throw err;
  }
  if (!/^[a-z0-9-]+$/.test(theme.id)) {
    const err = new Error('Theme id must be lowercase letters, numbers, and hyphens only.'); err.status = 400; throw err;
  }
  const RESERVED = new Set(['classic', 'ember', 'vesper', 'aegean', 'codex', 'gruvbox']);
  if (RESERVED.has(theme.id)) {
    const err = new Error(`"${theme.id}" is a reserved built-in theme id.`); err.status = 400; throw err;
  }
  const themes = await getCustomThemes();
  const idx = themes.findIndex((t) => t.id === theme.id);
  if (idx >= 0) themes[idx] = theme; else themes.push(theme);
  await prisma.appSetting.upsert({ where: { key: 'custom_themes' }, create: { key: 'custom_themes', value: JSON.stringify(themes) }, update: { value: JSON.stringify(themes) } });
  return theme;
}

export async function deleteCustomTheme(id) {
  const themes = await getCustomThemes();
  const filtered = themes.filter((t) => t.id !== id);
  await prisma.appSetting.upsert({ where: { key: 'custom_themes' }, create: { key: 'custom_themes', value: JSON.stringify(filtered) }, update: { value: JSON.stringify(filtered) } });
}