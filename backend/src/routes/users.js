import { Router } from 'express';
import { requireLogin } from '../middleware/auth.js';
import { prisma } from '../db/prisma.js';

export const usersRouter = Router();
usersRouter.use(requireLogin);

/** Public profile for any user — available to any logged-in user, not
 *  just Fellows. The wall itself remains Fellows-only (via the wall
 *  router), but the profile header (bio, stats, connection button)
 *  needs to be visible before you even know if you want to connect. */
usersRouter.get('/:username', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
      select: { id: true, username: true, displayName: true, bio: true, createdAt: true, avatarUrl: true, bannerUrl: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const viewerId = req.user.id;
    const isSelf = user.id === viewerId;

    const [postCount, fellowCount, noteCount] = await Promise.all([
      prisma.post.count({ where: { authorId: user.id, scriptoriumId: null } }),
      prisma.connection.count({
        where: { status: 'accepted', OR: [{ requesterId: user.id }, { recipientId: user.id }] },
      }),
      isSelf ? prisma.note.count({ where: { userId: user.id } }) : Promise.resolve(null),
    ]);

    let connectionStatus = 'self';
    let connectionId = null;
    if (!isSelf) {
      const conn = await prisma.connection.findFirst({
        where: {
          OR: [
            { requesterId: viewerId, recipientId: user.id },
            { requesterId: user.id, recipientId: viewerId },
          ],
        },
      });
      if (!conn || conn.status === 'declined') {
        connectionStatus = 'none';
      } else if (conn.status === 'accepted') {
        connectionStatus = 'accepted';
        connectionId = conn.id;
      } else if (conn.requesterId === viewerId) {
        connectionStatus = 'sent';
        connectionId = conn.id;
      } else {
        connectionStatus = 'received';
        connectionId = conn.id;
      }
    }

    res.json({
      user,
      stats: { postCount, fellowCount, noteCount },
      connectionStatus,
      connectionId,
    });
  } catch (err) {
    next(err);
  }
});
