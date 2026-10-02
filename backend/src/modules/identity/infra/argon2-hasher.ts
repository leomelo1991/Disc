import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';
import { PasswordHasher } from '../application/ports.js';

/** Argon2id (padrão do @node-rs/argon2). */
@Injectable()
export class Argon2Hasher extends PasswordHasher {
  hash(plain: string) {
    return hash(plain);
  }
  async verify(hashed: string, plain: string) {
    try {
      return await verify(hashed, plain);
    } catch {
      return false;
    }
  }
}
