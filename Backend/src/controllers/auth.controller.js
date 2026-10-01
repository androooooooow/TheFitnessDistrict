import { opaque } from '../utils/security.js';
import { cookieOptions } from '../middleware/csrf.js';
export function authController(service, env) {
  const authOptions = { ...cookieOptions(env), path: '/api/v1/auth' };
  const sendSession = (res, result) => {
    res.cookie('fd_access', result.tokens.access, { ...cookieOptions(env), maxAge: 15 * 60000 });
    res.cookie('fd_refresh', result.tokens.refresh, {
      ...authOptions,
      maxAge: Math.max(0, result.tokens.expiresAt - Date.now()),
    });
    res.json(result.user ? { user: result.user } : { message: 'Session refreshed.' });
  };
  return {
    async signup(req, res) {
      const flow = /^[a-f\d]{64}$/.test(req.cookies.fd_signup || '')
        ? req.cookies.fd_signup
        : opaque();
      res.cookie('fd_signup', flow, { ...authOptions, maxAge: 20 * 60000 });
      const result = await service.signup(req.input, flow, req.csrfToken);
      res.status(202).json(result);
    },
    async verify(req, res) {
      const result = await service.verify(
        req.input.challengeId,
        req.input.code,
        req.cookies.fd_signup || '',
        req.csrfToken,
      );
      res.clearCookie('fd_signup', authOptions);
      sendSession(res, result);
    },
    async resend(req, res) {
      res.json(
        await service.resend(req.input.challengeId, req.cookies.fd_signup || '', req.csrfToken),
      );
    },
    async login(req, res) {
      sendSession(res, await service.login(req.input.email, req.input.password, req.csrfToken));
    },
    async refresh(req, res) {
      sendSession(res, await service.refresh(req.cookies.fd_refresh || '', req.csrfToken));
    },
    async logout(req, res) {
      await service.logout(req.cookies.fd_refresh || '', req.csrfToken);
      res.clearCookie('fd_access', cookieOptions(env));
      res.clearCookie('fd_refresh', authOptions);
      res.clearCookie('fd_signup', authOptions);
      res.clearCookie('fd_csrf', cookieOptions(env));
      res.json({ message: 'Signed out.' });
    },
    async me(req, res) {
      res.json({ user: await service.me(req.auth.user) });
    },
    async updateProfile(req, res) {
      res.json({ user: await service.updateProfile(req.auth.user, req.input) });
    },
  };
}
