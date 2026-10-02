import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccessTokenService, type AccessClaims } from '../application/ports.js';

@Injectable()
export class JwtAccessTokenService extends AccessTokenService {
  constructor(@Inject(JwtService) private readonly jwt: JwtService) {
    super();
  }
  sign(claims: AccessClaims) {
    return this.jwt.signAsync(claims);
  }
  verify(token: string) {
    return this.jwt.verifyAsync<AccessClaims>(token);
  }
}
