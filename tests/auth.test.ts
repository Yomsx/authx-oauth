import request from 'supertest';
import app from '../src/index';

describe('Auth endpoints', () => {
  it('should return 401 for /me when no token is set', async () => {
    const res = await request(app).get('/me');
    expect(res.statusCode).toBe(401);
  });
});
