import { Injectable } from '@nestjs/common';
import { ApplicationError } from '../../../shared/application-error.js';
import { slugify } from '../../../shared/slug.js';
import { generateToken, sha256 } from '../../../shared/tokens.js';
import { AccessTokenService, IdentityRepository, PasswordHasher, type AccessClaims, type UserRecord } from './ports.js';

export type { AccessClaims };

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

const REFRESH_TTL_MS = 30 * 24 * 3600 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly repo: IdentityRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: AccessTokenService,
  ) {}

  async registerTenant(input: { companyName: string; adminName: string; email: string; password: string }) {
    const email = input.email.toLowerCase();
    const user = await this.repo.createTenantWithAdmin({
      companyName: input.companyName,
      slug: slugify(input.companyName),
      adminName: input.adminName,
      email,
      passwordHash: await this.hasher.hash(input.password),
    });
    return { user: this.publicUser(user), tokens: await this.issue(user) };
  }

  async login(emailRaw: string, password: string) {
    const candidates = await this.repo.findUsersByEmail(emailRaw.toLowerCase());
    // E-mail é único por empresa; se existir em várias, a senha escolhe a conta.
    for (const user of candidates) {
      if (user.active && (await this.hasher.verify(user.passwordHash, password))) {
        return { user: this.publicUser(user), tokens: await this.issue(user) };
      }
    }
    if (candidates.length === 0) await this.hasher.verify(await this.dummyHash(), password); // equaliza tempo
    throw new ApplicationError('UNAUTHORIZED', 'Credenciais inválidas');
  }

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) throw new ApplicationError('UNAUTHORIZED', 'Sessão inválida');
    const owner = await this.repo.consumeRefreshToken(sha256(refreshToken), new Date());
    if (!owner) throw new ApplicationError('UNAUTHORIZED', 'Sessão inválida');
    const user = await this.repo.findUserById(owner.userId);
    if (!user?.active) throw new ApplicationError('UNAUTHORIZED', 'Sessão inválida');
    return { user: this.publicUser(user), tokens: await this.issue(user) };
  }

  async logout(refreshToken: string | undefined) {
    if (refreshToken) await this.repo.revokeRefreshToken(sha256(refreshToken));
  }

  async verifyAccess(token: string): Promise<AccessClaims> {
    try {
      return await this.tokens.verify(token);
    } catch {
      throw new ApplicationError('UNAUTHORIZED', 'Token inválido');
    }
  }

  private async issue(user: UserRecord): Promise<AuthTokens> {
    const claims: AccessClaims = { sub: user.id, tid: user.tenantId, role: user.role };
    const refreshToken = generateToken();
    const refreshExpiresAt = new Date(Date.now() + REFRESH_TTL_MS);
    await this.repo.saveRefreshToken({ userId: user.id, tokenHash: sha256(refreshToken), expiresAt: refreshExpiresAt });
    return { accessToken: await this.tokens.sign(claims), refreshToken, refreshExpiresAt };
  }

  private dummy?: Promise<string>;
  /** Hash real calculado uma vez, só para gastar o mesmo tempo quando o e-mail não existe. */
  private dummyHash() {
    return (this.dummy ??= this.hasher.hash(generateToken()));
  }

  private publicUser(u: UserRecord) {
    return { id: u.id, name: u.name, email: u.email, role: u.role, tenantId: u.tenantId };
  }
}
