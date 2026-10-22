import { prisma } from '../db/prisma.js';

const DEFAULT_NAME = 'My Scriptorium';
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