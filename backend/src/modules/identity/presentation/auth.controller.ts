import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { loginSchema, registerTenantSchema } from '@disc/contracts';
import { env } from '../../../env.js';
import { MetricsService } from '../../../shared/metrics.service.js';
import { ZodValidationPipe } from '../../../shared/zod-validation.pipe.js';
import { AuthService, type AuthTokens } from '../application/auth.service.js';

const COOKIE = 'refresh_token';

function setRefreshCookie(res: Response, t: AuthTokens) {
  res.cookie(COOKIE, t.refreshToken, {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.NODE_ENV === 'production',
    path: '/api/v1/auth',
    expires: t.refreshExpiresAt,
  });
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly metrics: MetricsService,
  ) {}

  @Post('register-tenant')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async register(
    @Body(new ZodValidationPipe(registerTenantSchema)) body: ReturnType<typeof registerTenantSchema.parse>,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.auth.registerTenant(body);
    setRefreshCookie(res, tokens);
    return { user, accessToken: tokens.accessToken };
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: ReturnType<typeof loginSchema.parse>,
    @Res({ passthrough: true }) res: Response,
  ) {
    let result;
    try {
      result = await this.auth.login(body.email, body.password);
    } catch (e) {
      this.metrics.logins.inc({ result: 'failure' });
      throw e;
    }
    this.metrics.logins.inc({ result: 'success' });
    const { user, tokens } = result;
    setRefreshCookie(res, tokens);
    return { user, accessToken: tokens.accessToken };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { user, tokens } = await this.auth.refresh(req.cookies?.[COOKIE]);
    setRefreshCookie(res, tokens);
    return { user, accessToken: tokens.accessToken };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[COOKIE]);
    res.clearCookie(COOKIE, { path: '/api/v1/auth' });
  }
}
