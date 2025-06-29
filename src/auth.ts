// src/auth.ts
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export const oauth2Client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUri: process.env.GOOGLE_REDIRECT_URI!,
});

export function generateJWT(payload: object): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '1h' });
}
