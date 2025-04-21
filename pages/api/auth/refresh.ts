import type { NextApiRequest, NextApiResponse } from 'next';
import { generateJWT } from '@/lib/auth';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { oauth2Client } from '../../../lib/auth'; // from api/login.ts

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const refreshToken = req.cookies.refresh_token;
  if (!refreshToken) return res.status(401).json({ error: 'Missing refresh token' });

  try {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();

    const ticket = await oauth2Client.verifyIdToken({
      idToken: credentials.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID!,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) return res.status(400).json({ error: 'Invalid token' });

    const newAccessToken = generateJWT({ email: payload.email, name: payload.name });

    res.setHeader('Set-Cookie', `token=${newAccessToken}; Path=/; HttpOnly; Max-Age=900; SameSite=Strict`);
    res.status(200).json({ message: 'Access token refreshed' });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(403).json({ error: 'Refresh failed' });
  }
}