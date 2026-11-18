import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class PasswordService {
  async validatePassword(password: string, hashedPassword: string): Promise<boolean> {
    if (!hashedPassword) {
      return false;
    }
    try {
      return await argon2.verify(hashedPassword, password);
    } catch {
      // Missing or non-argon2 hash (e.g. a legacy bcrypt value): treat as a wrong password
      return false;
    }
  }

  hashPassword(password: string): Promise<string> {
    return argon2.hash(password);
  }
}
