import { Injectable } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import * as nodemailer from "nodemailer"

@Injectable()
export class MailConfig {
  constructor(private configService: ConfigService) {}

  createTransport() {
    return nodemailer.createTransport({
      host: this.configService.get<string>("MAIL_HOST"),
      port: this.configService.get<number>("MAIL_PORT"),
      secure: this.configService.get<boolean>("MAIL_SECURE"),
      auth: {
        user: this.configService.get<string>("MAIL_USER"),
        pass: this.configService.get<string>("MAIL_PASSWORD"),
      },
    })
  }
}
