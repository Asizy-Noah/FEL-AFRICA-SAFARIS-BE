import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { UsersModule } from "../users/users.module";
import { MailModule } from "../mail/mail.module";
import { LocalStrategy } from './strategies/local.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ session: true }), // ✅ Enable session support
    MailModule,
    ConfigModule,
  ],
  providers: [
    AuthService,
    LocalStrategy, // ✅ Local strategy for login using session
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
