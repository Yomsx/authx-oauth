export default function handler(req: NextApiRequest, res: NextApiResponse) {
    // TODO: return timestamp of last refresh token use
    res.status(200).json({ message: '🔁 Refresh Token Status: last used timestamp' });
  }