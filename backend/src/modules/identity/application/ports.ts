export type Role = 'ADMIN' | 'RECRUITER';

export interface UserRecord {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  active: boolean;
}

export abstract class IdentityRepository {
  abstract createTenantWithAdmin(input: {
    companyName: string;
    slug: string;
    adminName: string;
    email: string;
    passwordHash: string;
  }): Promise<UserRecord>;
  abstract findUsersByEmail(email: string): Promise<UserRecord[]>;
  abstract findUserById(id: string): Promise<UserRecord | null>;
  abstract saveRefreshToken(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void>;
  /** Marca como revogado e devolve o dono; null se inexistente, expirado ou já revogado. */
  abstract consumeRefreshToken(tokenHash: string, now: Date): Promise<{ userId: string } | null>;
  abstract revokeRefreshToken(tokenHash: string): Promise<void>;
}

export abstract class PasswordHasher {
  abstract hash(plain: string): Promise<string>;
  abstract verify(hash: string, plain: string): Promise<boolean>;
}

export interface AccessClaims {
  sub: string;
  tid: string;
  role: Role;
}

/** Emissão e verificação do token de acesso (JWT é detalhe de infra). */
export abstract class AccessTokenService {
  abstract sign(claims: AccessClaims): Promise<string>;
  /** Lança se o token for inválido ou expirado. */
  abstract verify(token: string): Promise<AccessClaims>;
}
