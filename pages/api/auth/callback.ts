import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { oauth2Client, generateJWT } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const code = req.query.code as string;
    if (!code) return res.status(400).json({ error: 'Missing code' });

    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.id_token) return res.status(400).json({ error: 'Missing id_token' });

    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID!,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) return res.status(400).json({ error: 'Missing email from payload' });

    const email = payload.email;
    const name = payload.name || 'Unnamed';
    const refreshToken = tokens.refresh_token;

    const accessToken = generateJWT({ email, name });

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        refreshToken: refreshToken || undefined,
      },
      create: {
        email,
        name,
        refreshToken: refreshToken || '',
      },
    });

    res.setHeader('Set-Cookie', [
      `token=${accessToken}; Path=/; HttpOnly; Max-Age=900; SameSite=Strict`,
      `refresh_token=${refreshToken || ''}; Path=/; HttpOnly; Max-Age=${7 * 24 * 60 * 60}; SameSite=Strict`,
    ]);

    return res.redirect('/dashboard');
  } catch (err) {
    console.error('Callback Error:', err);
    return res.status(500).json({ error: 'OAuth Callback failed' });
  }
}
