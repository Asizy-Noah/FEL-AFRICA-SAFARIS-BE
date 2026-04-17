import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import { User } from "../users/schemas/user.schema";
import { Blog } from "../blogs/schemas/blog.schema";
import { Subscriber } from "../subscribers/schemas/subscriber.schema";
import { CreateEnquiryDto } from "../enquiry/dtos/enquiry.dto";
import { Booking } from "../bookings/schemas/booking.schema";

@Injectable()
export class MailService {
  private adminTransporter: nodemailer.Transporter;
  private bookingsTransporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const mailHost = this.configService.get<string>("MAIL_HOST");
    const mailPort = this.configService.get<number>("MAIL_PORT");
    const isSecure = this.configService.get<string>("MAIL_SECURE") === 'true';

    this.adminTransporter = nodemailer.createTransport({
      host: mailHost,
      port: mailPort,
      secure: isSecure,
      auth: {
        user: this.configService.get<string>("MAIL_USER"),
        pass: this.configService.get<string>("MAIL_PASSWORD"),
      },
      tls: {
        rejectUnauthorized: false,
        ciphers: 'SSLv3'
      }
    });

    this.bookingsTransporter = nodemailer.createTransport({
      host: mailHost,
      port: mailPort,
      secure: isSecure,
      auth: {
        user: this.configService.get<string>("BOOKINGS_MAIL_USER"),
        pass: this.configService.get<string>("BOOKINGS_MAIL_PASSWORD"),
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  async sendNewAgentNotification(agent: User): Promise<void> {
    const adminEmail = this.configService.get<string>("ADMIN_EMAIL") || "admin@feelafricasafaris.com";
    await this.adminTransporter.sendMail({
      from: `"Feel Africa Safaris" <${this.configService.get<string>("MAIL_FROM")}>`,
      to: adminEmail,
      subject: "New Agent Registration",
      html: `
        <h1>New Agent Registration</h1>
        <ul>
          <li><strong>Name:</strong> ${agent.name}</li>
          <li><strong>Email:</strong> ${agent.email}</li>
        </ul>
      `,
    });
  }

  async sendAgentActivationEmail(agent: User): Promise<void> {
    await this.adminTransporter.sendMail({
      from: `"Feel Africa Safaris" <${this.configService.get<string>("MAIL_FROM")}>`,
      to: agent.email,
      subject: "Your Agent Account has been Activated",
      html: `<p>Dear ${agent.name}, your account is active.</p>`,
    });
  }

  async sendAgentDeactivationEmail(agent: User): Promise<void> {
    await this.adminTransporter.sendMail({
      from: `"Feel Africa Safaris" <${this.configService.get<string>("MAIL_FROM")}>`,
      to: agent.email,
      subject: "Your Agent Account has been Deactivated",
      html: `<p>Dear ${agent.name}, your account has been deactivated.</p>`,
    });
  }

  async sendPasswordResetEmail(user: User, token: string): Promise<void> {
    const resetUrl = `${this.configService.get<string>("WEBSITE_URL")}/auth/reset-password/${token}`;
    await this.adminTransporter.sendMail({
      from: `"Feel Africa Safaris" <${this.configService.get<string>("MAIL_FROM")}>`,
      to: user.email,
      subject: "Password Reset Request",
      html: `<p>Click here to reset: <a href="${resetUrl}">Reset Password</a></p>`,
    });
  }

  async sendPasswordChangedEmail(user: User): Promise<void> {
    await this.adminTransporter.sendMail({
      from: `"Feel Africa Safaris" <${this.configService.get<string>("MAIL_FROM")}>`,
      to: user.email,
      subject: "Password Changed Successfully",
      html: `<p>Dear ${user.name}, your password was changed.</p>`,
    });
  }

  async sendNewBlogNotification(blog: Blog, subscribers: Subscriber[]): Promise<void> {
    const blogUrl = `${this.configService.get<string>("WEBSITE_URL")}/blogs/${blog.slug}`;
    // Casting to 'any' to avoid the "Property content does not exist" error 
    // while maintaining code functionality
    const blogData = blog as any;

    for (const subscriber of subscribers) {
      await this.adminTransporter.sendMail({
        from: `"Feel Africa Safaris" <${this.configService.get<string>("MAIL_FROM")}>`,
        to: subscriber.email,
        subject: `New Safari Update: ${blog.title}`,
        html: `
          <h1>${blog.title}</h1>
          <p>${blogData.excerpt || (blogData.content ? blogData.content.substring(0, 200) : '')}...</p>
          <p><a href="${blogUrl}">Read More</a></p>
        `,
      });
    }
  }

  async sendSubscriptionConfirmation(subscriber: Subscriber) {
    if (!subscriber.email) throw new Error("No recipient email defined.");
    await this.adminTransporter.sendMail({
      from: `"Feel Africa Safaris" <${this.configService.get<string>("MAIL_FROM")}>`,
      to: subscriber.email,
      subject: `Welcome to the Feel Africa Safaris Newsletter!`,
      html: `<p>Thank you for subscribing!</p>`,
    });
  }

  async sendNewSubscriberNotification(subscriber: Subscriber) {
    const adminEmail = this.configService.get<string>("ADMIN_EMAIL") || "admin@feelafricasafaris.com";
    await this.adminTransporter.sendMail({
      from: `"Feel Africa Safaris" <${this.configService.get<string>("MAIL_FROM")}>`,
      to: adminEmail,
      subject: `New Newsletter Subscriber: ${subscriber.email}`,
      html: `<p>New subscriber: ${subscriber.email}</p>`,
    });
  }

  async sendBookingNotification(booking: Booking): Promise<void> {
    const tourTitle = booking.tour && typeof booking.tour === 'object' && 'title' in booking.tour 
      ? (booking.tour as any).title 
      : "Custom Tour Request";
    const bookingsAdminEmail = this.configService.get<string>("BOOKINGS_MAIL_USER") || "bookings@feelafricasafaris.com";

    await this.bookingsTransporter.sendMail({
      from: `"Feel Africa Safaris" <${this.configService.get<string>("BOOKINGS_MAIL_FROM")}>`,
      to: bookingsAdminEmail,
      subject: "New Tour Booking",
      html: `<p>New booking for ${tourTitle} from ${booking.fullName}</p>`,
    });
  }

  async sendBookingConfirmation(booking: Booking): Promise<void> {
    await this.bookingsTransporter.sendMail({
      from: `"Feel Africa Safaris" <${this.configService.get<string>("BOOKINGS_MAIL_FROM")}>`,
      to: booking.email,
      subject: "Your Safari Booking Confirmation",
      html: `<p>Dear ${booking.fullName}, we received your booking.</p>`,
    });
  }

  async sendBookingStatusUpdate(booking: Booking): Promise<void> {
    await this.bookingsTransporter.sendMail({
      from: `"Feel Africa Safaris" <${this.configService.get<string>("BOOKINGS_MAIL_FROM")}>`,
      to: booking.email,
      subject: "Booking Status Update",
      html: `<p>Your booking status is now: ${booking.status}</p>`,
    });
  }

  async sendEnquiryToAdmin(enquiry: CreateEnquiryDto): Promise<void> {
    const adminEmail = this.configService.get<string>("ADMIN_EMAIL") || "admin@feelafricasafaris.com";
    await this.adminTransporter.sendMail({
      from: `"Feel Africa Safaris" <${this.configService.get<string>("MAIL_FROM")}>`,
      to: adminEmail,
      subject: `New Safari Enquiry from ${enquiry.fullName}`,
      html: `<p>${enquiry.message}</p>`,
    });
  }

  async sendQuoteRequestNotification(quoteData: any): Promise<void> {
  const adminEmail = this.configService.get<string>("ADMIN_EMAIL") || "admin@feelafricasafaris.com";
  
  await this.adminTransporter.sendMail({
    from: `"Feel Africa Safaris Quote System" <${this.configService.get<string>("MAIL_FROM")}>`,
    to: adminEmail,
    subject: `New Quote Request: ${quoteData.destination} - ${quoteData.firstName} ${quoteData.lastName}`,
    html: `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #2f4f2f;">New Safari Quote Request</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Name:</strong></td><td style="padding: 8px; border: 1px solid #eee;">${quoteData.firstName} ${quoteData.lastName}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Email:</strong></td><td style="padding: 8px; border: 1px solid #eee;">${quoteData.email}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Phone:</strong></td><td style="padding: 8px; border: 1px solid #eee;">${quoteData.phone}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Destination:</strong></td><td style="padding: 8px; border: 1px solid #eee;">${quoteData.destination}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Duration:</strong></td><td style="padding: 8px; border: 1px solid #eee;">${quoteData.duration} Days</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Travelers:</strong></td><td style="padding: 8px; border: 1px solid #eee;">${quoteData.travelers}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Travel Date:</strong></td><td style="padding: 8px; border: 1px solid #eee;">${quoteData.dates}</td></tr>
        </table>
        <h3 style="margin-top: 20px;">Message:</h3>
        <p style="background: #f9f9f9; padding: 15px; border-left: 4px solid #c4572d;">${quoteData.message}</p>
      </div>
    `,
  });
}
}