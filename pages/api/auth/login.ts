// pages/api/login.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { oauth2Client } from '../../../lib/auth';


export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['profile', 'email'],
    prompt: 'consent',
  });
  res.redirect(url);
}
