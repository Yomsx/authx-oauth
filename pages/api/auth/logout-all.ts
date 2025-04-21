export default function handler(req: NextApiRequest, res: NextApiResponse) {
    // TODO: revoke all refresh tokens for this user in the DB
    res.status(200).json({ message: '❌ Logout Everywhere: revoke all sessions' });
  }
  