import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { signupSchema, loginSchema } from '../utils/validators.js';
import { authRateLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = Router();

router.post('/signup', authRateLimiter, validate(signupSchema), AuthController.signup);
router.post('/login', authRateLimiter, validate(loginSchema), AuthController.login);
router.post('/logout', AuthController.logout);
router.post('/refresh', AuthController.refresh);
router.get('/me', authenticate, AuthController.getMe);

// Upgraded Enterprise Auth Paths
router.put('/change-password', authenticate, AuthController.changePassword);
router.delete('/sessions/:sessionId', authenticate, AuthController.revokeSession);
router.delete('/sessions', authenticate, AuthController.revokeAllOtherSessions);
router.post('/2fa/toggle', authenticate, AuthController.toggle2FA);
router.post('/oauth', AuthController.oauthLogin);

export default router;
