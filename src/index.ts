import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { oauth2Client, generateJWT } from './auth';
import { prisma } from './db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(cookieParser());

function getEmailFromToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { email: string };
    return decoded.email;
  } catch {
    return null;
  }
}

function generateSecureToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

app.get('/', (req, res) => {
  res.send('✅ Auth Server Running. Try /auth/login → /me');
});

app.get('/me', async (req: any, res: any) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).send('Unauthorized: No token');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { email: string };
    const user = await prisma.user.findUnique({ where: { email: decoded.email } });
    if (!user) return res.status(404).send('User not found');

    res.json({
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error('Error in /me:', err);
    res.status(403).send('Invalid or expired token');
  }
});

app.get('/auth/login', function loginRoute(req: Request, res: Response) {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['profile', 'email'],
    prompt: 'consent',
  });
  res.redirect(url);
});

app.get('/auth/callback', async (req: any, res: any) => {
  const code = req.query.code;

  try {
    const { tokens } = await oauth2Client.getToken(code);
    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID!,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) return res.status(400).send('Invalid payload');

    const accessToken = generateJWT({ email: payload.email, name: payload.name });
    const refreshToken = tokens.refresh_token;
    if (!refreshToken) return res.status(401).send('No refresh token from Google');

    const existingUser = await prisma.user.findUnique({ where: { email: payload.email } });

    if (!existingUser) {
      await prisma.user.create({
        data: {
          email: payload.email,
          name: payload.name || null,
          refreshToken,
        },
      });
    } else {
      await prisma.user.update({
        where: { email: payload.email },
        data: {
          refreshToken,
          name: payload.name || existingUser.name,
        },
      });
    }

    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie('token_version', existingUser?.tokenVersion ?? 0, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.send('✅ Login successful. Tokens set in cookie.');
  } catch (err) {
    console.error('Callback error:', err);
    res.status(500).send('Authentication failed.');
  }
});

app.get('/auth/refresh', async (req: any, res: any) => {
  const refreshToken = req.cookies.refresh_token;
  if (!refreshToken) return res.status(401).send('No refresh token found.');

  try {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();

    const ticket = await oauth2Client.verifyIdToken({
      idToken: credentials.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID!,
    });

    const payload = ticket.getPayload();
    if (!payload) return res.status(400).send('Invalid refresh');

    const newAccessToken = generateJWT({
      email: payload.email,
      name: payload.name,
    });

    res.cookie('token', newAccessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
    });

    res.send('✅ Access token refreshed');
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(403).send('Refresh failed');
  }
});

app.get('/auth/rotate', async (req: any, res: any) => {
  const refreshToken = req.cookies.refresh_token;
  const email = getEmailFromToken(req.cookies.token);

  if (!refreshToken || !email) return res.status(401).send('Missing token or user');

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.refreshToken !== refreshToken)
      return res.status(403).send('Invalid refresh token');

    const newRefreshToken = generateSecureToken();
    const newVersion = user.tokenVersion + 1;

    await prisma.user.update({
      where: { email },
      data: {
        refreshToken: newRefreshToken,
        tokenVersion: newVersion,
      },
    });

    res.cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie('token_version', newVersion, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.send('🔁 Refresh token rotated');
  } catch (err) {
    console.error('Rotation failed:', err);
    res.status(500).send('Token rotation failed');
  }
});

app.get('/auth/logout', async (req: any, res: any) => {
  const email = getEmailFromToken(req.cookies.token);

  if (email) {
    await prisma.user.update({
      where: { email },
      data: { refreshToken: null },
    });
  }

  res.clearCookie('token');
  res.clearCookie('refresh_token');
  res.clearCookie('token_version');
  res.send('✅ Logged out and refresh token revoked');
});

app.get('/dashboard', (req: any, res: any) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).send('Unauthorized');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    res.send(`Welcome, ${(decoded as any).name}`);
  } catch {
    res.status(403).send('Invalid token');
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
export default app;
