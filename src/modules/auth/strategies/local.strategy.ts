// src/modules/auth/strategies/local.strategy.ts
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service'; // Adjust path if needed

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email', // Tell Passport to use 'email' for the username field
    });
  }

  // This 'validate' method is what Passport calls when AuthGuard('local') is used
  async validate(email: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(email, password); // Use your existing validateUser

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    // If validation is successful, return the user object.
    // Passport will then pass this user to your serializeUser function.
    return user;
  }
}