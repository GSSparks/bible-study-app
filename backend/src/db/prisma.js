import { PrismaClient } from '@prisma/client';

// A single shared Prisma client for the process. In dev mode with
// --watch this can create duplicate clients on reload; that's fine for
// a small self-hosted app but if it ever bites you, stash this on
// globalThis the way Next.js docs recommend.
export const prisma = new PrismaClient();
