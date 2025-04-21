import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.cookies.token;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { email: string };
    await prisma.user.update({ where: { email: decoded.email }, data: { refreshToken: null } });
  } catch (e) {
    // ignore
  }

  res.setHeader('Set-Cookie', [
    'token=deleted; Path=/; HttpOnly; Max-Age=0; SameSite=Strict',
    'refresh_token=deleted; Path=/; HttpOnly; Max-Age=0; SameSite=Strict'
  ]);

  res.redirect('/');
}