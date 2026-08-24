import { prisma } from '../db/prisma.js';

const DEFAULT_NAME = 'My Scriptorium';
const MAX_NAME_LENGTH = 60;

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