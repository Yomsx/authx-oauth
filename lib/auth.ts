import { google } from 'googleapis';
import jwt from 'jsonwebtoken';

export const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export function generateJWT(payload: { email: string; name: string | null }) {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '15m' });
}
