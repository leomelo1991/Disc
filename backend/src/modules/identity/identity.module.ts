import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { env } from '../../env.js';
import { AuthService } from './application/auth.service.js';
import { AccessTokenService, IdentityRepository, PasswordHasher } from './application/ports.js';
import { Argon2Hasher } from './infra/argon2-hasher.js';
import { JwtAccessTokenService } from './infra/jwt-access-token.service.js';
import { PrismaIdentityRepository } from './infra/prisma-identity.repository.js';
import { AuthController } from './presentation/auth.controller.js';
import { AuthGuard } from './presentation/auth.guard.js';

@Global()
@Module({
  imports: [JwtModule.register({ secret: env.JWT_SECRET, signOptions: { expiresIn: '15m' } })],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthGuard,
    { provide: IdentityRepository, useClass: PrismaIdentityRepository },
    { provide: PasswordHasher, useClass: Argon2Hasher },
    { provide: AccessTokenService, useClass: JwtAccessTokenService },
  ],
  exports: [AuthService, AuthGuard, PasswordHasher],
})
export class IdentityModule {}
