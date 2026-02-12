import { Injectable, UnauthorizedException } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import type { LoginUserDto } from "../users/dto/login-user.dto";
import { UserStatus, User } from "../users/schemas/user.schema";
import passport from 'passport';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
  ) {
    // Session management using Passport
    passport.serializeUser((user: User, done) => {
      done(null, user._id); // Store user ID in session
    });

    passport.deserializeUser(async (id: string, done) => {
      try {
        const user = await this.usersService.findById(id);
        if (!user) {
          return done(new UnauthorizedException('User not found during deserialization'), null);
        }
        done(null, user); // Reattach user to req.user
      } catch (error) {
        done(error, null);
      }
    });
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;

    const isPasswordValid = await user.comparePassword(password);
    if (isPasswordValid) {
      const { password, ...result } = user.toObject();
      return result;
    }

    return null;
  }

  async login(loginUserDto: LoginUserDto) {
    const user = await this.usersService.findByEmail(loginUserDto.email);
    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const isPasswordValid = await user.comparePassword(loginUserDto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    // Check status
    if (user.status === UserStatus.PENDING) {
      return {
        status: "pending",
        message: "Your account is pending approval from admin",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
        },
      };
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new UnauthorizedException("Your account has been deactivated. Please contact admin.");
    }

    // ✅ Session will take care of authentication — no token is returned
    return {
      status: "success",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    };
  }
}
