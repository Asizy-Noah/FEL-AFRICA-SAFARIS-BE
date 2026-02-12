import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import * as nodemailer from "nodemailer"
import { MailService } from "./mail.service"

const MailerProvider = {
  provide: "MAILER_TRANSPORT",
  useFactory: () => {
    return nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: process.env.MAIL_SECURE === 'true', 
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD, 
      },
    });
  },
};

@Module({
  imports: [ConfigModule],
  providers: [MailerProvider, MailService],
  exports: [MailService],
})
export class MailModule {}
