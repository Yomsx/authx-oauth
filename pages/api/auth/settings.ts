export default function handler(req: NextApiRequest, res: NextApiResponse) {
    // TODO: allow changing scopes or preferences
    res.status(200).json({ message: '⚙️ Settings page: scope and preference settings' });
  }