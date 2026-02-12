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
  private adminEmail: string; // This property is not strictly needed if you always retrieve from configService

  constructor(private configService: ConfigService) {
  const mailHost = this.configService.get<string>("MAIL_HOST");
  const mailPort = this.configService.get<number>("MAIL_PORT");
  
  // Force a real boolean check
  const isSecure = this.configService.get<string>("MAIL_SECURE") === 'true';

  this.adminTransporter = nodemailer.createTransport({
    host: mailHost,
    port: mailPort,
    secure: isSecure, // This will now be actual false
    auth: {
      user: this.configService.get<string>("MAIL_USER"),
      pass: this.configService.get<string>("MAIL_PASSWORD"),
    },
    tls: {
      // This ensures the connection doesn't fail on version mismatches
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
  // All methods previously using `this.transporter` will now use `this.adminTransporter`
  // and will use the `MAIL_USER` and `MAIL_FROM` from the .env

  async sendNewAgentNotification(agent: User): Promise<void> {
    const adminEmail = this.configService.get<string>("ADMIN_EMAIL") || "admin@feelafricasafaris.com";

    await this.adminTransporter.sendMail({
      from: `"Feel Africa Safaris" <${this.configService.get<string>("MAIL_FROM")}>`,
      to: adminEmail,
      subject: "New Agent Registration",
      html: `
        <h1>New Agent Registration</h1>
        <p>A new agent has registered and is awaiting approval:</p>
        <ul>
          <li><strong>Name:</strong> ${agent.name}</li>
          <li><strong>Email:</strong> ${agent.email}</li>
          <li><strong>Company:</strong> ${agent.companyName || "N/A"}</li>
          <li><strong>Phone:</strong> ${agent.phoneNumber || "N/A"}</li>
          <li><strong>Country:</strong> ${agent.country || "N/A"}</li>
        </ul>
        <p>Please login to the dashboard to approve or reject this agent.</p>
      `,
    });
  }

  async sendAgentActivationEmail(agent: User): Promise<void> {
    await this.adminTransporter.sendMail({
      from: `"Feel Africa Safaris" <${this.configService.get<string>("MAIL_FROM")}>`,
      to: agent.email,
      subject: "Your Agent Account has been Activated",
      html: `
        <h1>Account Activated</h1>
        <p>Dear ${agent.name},</p>
        <p>Your agent account with Feel Africa Safaris has been approved and activated. You can now log in to the dashboard and start managing tours.</p>
        <p><a href="${this.configService.get<string>("WEBSITE_URL")}/auth/login">Click here to login</a></p>
        <p>Thank you for partnering with us!</p>
      `,
    });
  }

  async sendAgentDeactivationEmail(agent: User): Promise<void> {
    await this.adminTransporter.sendMail({
      from: `"Feel Africa Safaris" <${this.configService.get<string>("MAIL_FROM")}>`,
      to: agent.email,
      subject: "Your Agent Account has been Deactivated",
      html: `
        <h1>Account Deactivated</h1>
        <p>Dear ${agent.name},</p>
        <p>Your agent account with Feel Africa Safaris has been deactivated. Please contact our admin team for more information.</p>
        <p>Email: ${this.configService.get<string>("ADMIN_EMAIL") || "admin@feelafricasafaris.com"}</p>
      `,
    });
  }

  async sendPasswordResetEmail(user: User, token: string): Promise<void> {
    const resetUrl = `${this.configService.get<string>("WEBSITE_URL")}/auth/reset-password/${token}`;

    await this.adminTransporter.sendMail({
      from: `"Feel Africa Safaris" <${this.configService.get<string>("MAIL_FROM")}>`,
      to: user.email,
      subject: "Password Reset Request",
      html: `
        <h1>Password Reset</h1>
        <p>Dear ${user.name},</p>
        <p>You requested a password reset. Please click the link below to reset your password:</p>
        <p><a href="${resetUrl}">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
      `,
    });

    
  }

  async sendPasswordChangedEmail(user: User): Promise<void> {
    await this.adminTransporter.sendMail({
      from: `\"Feel Africa Safaris\" <${this.configService.get<string>("MAIL_FROM")}>`,
      to: user.email,
      subject: "Password Changed Successfully",
      html: `
        <h1>Password Changed</h1>
        <p>Dear ${user.name},</p>
        <p>Your password has been changed successfully.</p>
        <p>If you did not make this change, please contact us immediately.</p>
      `,
    });
  }

  async sendNewBlogNotification(blog: Blog, subscribers: Subscriber[]): Promise<void> {
    const blogUrl = `${this.configService.get<string>("WEBSITE_URL")}/blogs/${blog.slug}`;

    // Send to each subscriber
    for (const subscriber of subscribers) {
      await this.adminTransporter.sendMail({
        from: `"Feel Africa Safaris" <${this.configService.get<string>("MAIL_FROM")}>`,
        to: subscriber.email,
        subject: `New Safari Update: ${blog.title}`,
        html: `
          <h1>${blog.title}</h1>
          <p>${blog.excerpt || blog.content.substring(0, 200)}...</p>
          <p><a href="${blogUrl}">Read More</a></p>
          <p>Thank you for subscribing to our newsletter!</p>
          <p>If you no longer wish to receive these emails, please <a href="${this.configService.get<string>("WEBSITE_URL")}/unsubscribe?email=${subscriber.email}">unsubscribe</a>.</p>
        `,
      });
    }
  }

  // --- NEW SUBSCRIPTION EMAIL METHODS ---

  async sendSubscriptionConfirmation(subscriber: Subscriber) {
    
    if (!subscriber.email) {
      
      throw new Error("No recipient email defined for subscription confirmation.");
    }

    const mailOptions = {
      from: `"Feel Africa Safaris" <${this.configService.get<string>("MAIL_FROM")}>`, // Changed to MAIL_FROM for consistency
      to: subscriber.email,
      subject: `Welcome to the Feel Africa Safaris Newsletter!`,
      html: `
        <h2>Hello there,</h2>
        <p>Thank you for subscribing to our newsletter! You'll now receive our latest news, tour updates, and exclusive offers.</p>
        <p>Get ready to explore the world with Feel Africa Safaris!</p>
        <p>Best regards,<br>The Feel Africa Safaris Team</p>
        <p>If you wish to unsubscribe at any time, please click here: <a href="${this.configService.get<string>("BASE_URL")}/unsubscribe?email=${subscriber.email}">Unsubscribe</a></p>
      `,
    };
    try {
      await this.adminTransporter.sendMail(mailOptions); // Use adminTransporter
      
    } catch (error) {
      
      throw error; // Re-throw to propagate the error
    }
  }

  async sendNewSubscriberNotification(subscriber: Subscriber) {
    const adminEmail = this.configService.get<string>("ADMIN_EMAIL") || "admin@feelafricasafaris.com";

    const mailOptions = {
      from: `"Feel Africa Safaris" <${this.configService.get<string>("MAIL_FROM")}>`, // Changed to MAIL_FROM for consistency
      to: adminEmail,
      subject: `New Newsletter Subscriber: ${subscriber.email}`,
      html: `
        <h2>New Newsletter Subscriber!</h2>
        <p>A new email address has subscribed to your newsletter:</p>
        <ul>
          <li><strong>Email:</strong> ${subscriber.email}</li>
          <li><strong>Subscribed On:</strong> ${new Date(subscriber.createdAt).toLocaleString()}</li>
        </ul>
        <p>View all subscribers in your dashboard: <a href="${this.configService.get<string>("BASE_URL")}/subscribers/dashboard">View Subscribers</a></p>
      `,
    };
    try {
      await this.adminTransporter.sendMail(mailOptions); // Use adminTransporter
      
    } catch (error) {
      
      throw error; // Re-throw to propagate the error
    }
  }

  // --- BOOKING EMAIL METHODS - NOW USING bookingsTransporter ---

  async sendBookingNotification(booking: Booking): Promise<void> {

    //  Safely get the tour title from the populated booking object
   const tourTitle = booking.tour && typeof booking.tour === 'object' && 'title' in booking.tour 
      ? (booking.tour as any).title 
          : "Custom Tour Request";
    // Send notification to the bookings email
    const bookingsAdminEmail = this.configService.get<string>("BOOKINGS_MAIL_USER") || "bookings@feelafricasafaris.com";

    await this.bookingsTransporter.sendMail({
      from: `"Feel Africa Safaris" <${this.configService.get<string>("BOOKINGS_MAIL_FROM")}>`,
      to: bookingsAdminEmail,
      subject: "New Tour Booking",
      html: `
        <h1>New Tour Booking</h1>
        <p>A new booking has been received:</p>
        <ul>
          <li><strong>Name:</strong> ${booking.fullName}</li>
          <li><strong>Email:</strong> ${booking.email}</li>
          <li><strong>Phone:</strong> ${booking.phoneNumber || "N/A"}</li>
          <li><strong>Country:</strong> ${booking.country || "N/A"}</li>
          <li><strong>Tour:</strong> ${tourTitle}</li>
          <li><strong>Travel Date:</strong> ${booking.travelDate ? new Date(booking.travelDate).toLocaleDateString() : "N/A"}</li>
          <li><strong>Adults:</strong> ${booking.numberOfAdults || 0}</li>
          <li><strong>Children:</strong> ${booking.numberOfChildren || 0}</li>
          <li><strong>Special Requirements:</strong> ${booking.specialRequirements || "None"}</li>
        </ul>
        ${booking.customTourRequest ? `<p><strong>Custom Tour Request:</strong> ${booking.customTourRequest}</p>` : ""}
        <p>Please login to the dashboard to manage this booking.</p>
      `,
    });
  }

  async sendBookingConfirmation(booking: Booking): Promise<void> {
    await this.bookingsTransporter.sendMail({
      from: `"Feel Africa Safaris" <${this.configService.get<string>("BOOKINGS_MAIL_FROM")}>`,
      to: booking.email,
      subject: "Your Safari Booking Confirmation",
      html: `
        <h1>Booking Received</h1>
        <p>Dear ${booking.fullName},</p>
        <p>Thank you for your booking with Feel Africa Safaris. We have received your request and will contact you shortly to discuss the details.</p>
        
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <p>We look forward to helping you plan your African adventure!</p>
      `,
    });
  }

  async sendBookingStatusUpdate(booking: Booking): Promise<void> {
    let statusMessage = "";
    let subject = "";

    switch (booking.status) {
      case "confirmed":
        subject = "Your Safari Booking is Confirmed";
        statusMessage = "Your booking has been confirmed. We are excited to have you join us on this adventure!";
        break;
      case "cancelled":
        subject = "Your Safari Booking has been Cancelled";
        statusMessage =
          "Your booking has been cancelled. If you did not request this cancellation, please contact us immediately.";
        break;
      case "completed":
        subject = "Thank You for Your Safari with Us";
        statusMessage = "Your safari has been marked as completed. We hope you had a wonderful experience with us!";
        break;
      default:
        subject = "Your Safari Booking Status Update";
        statusMessage = "There has been an update to your booking status.";
    }

    await this.bookingsTransporter.sendMail({
      from: `"Feel Africa Safaris" <${this.configService.get<string>("BOOKINGS_MAIL_FROM")}>`,
      to: booking.email,
      subject,
      html: `
        <h1>Booking Status Update</h1>
        <p>Dear ${booking.fullName},</p>
        <p>${statusMessage}</p>
        <h2>Booking Details:</h2>
        <ul>
          <li><strong>Tour:</strong> ${booking.tour ? "Selected Tour" : "Custom Tour Request"}</li>
          <li><strong>Travel Date:</strong> ${booking.travelDate ? new Date(booking.travelDate).toLocaleDateString() : "N/A"}</li>
          <li><strong>Status:</strong> ${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</li>
        </ul>
        <p>If you have any questions, please don't hesitate to contact us.</p>
      `,
    });
  }

  // --- ENQUIRY EMAIL METHOD - Remains with adminTransporter ---
  async sendEnquiryToAdmin(enquiry: CreateEnquiryDto): Promise<void> {
    const adminEmail = this.configService.get<string>("ADMIN_EMAIL") || "admin@feelafricasafaris.com";

    await this.adminTransporter.sendMail({ // Use adminTransporter
      from: `"Feel Africa Safaris" <${this.configService.get<string>("MAIL_FROM")}>`,
      to: adminEmail,
      subject: `New Safari Enquiry from ${enquiry.fullName}`,
      html: `
        <h1>Safari Enquiry</h1>
        <p>You have received a new enquiry from Feel Africa Safaris:</p>
        <ul>
          <li><strong>Full Name:</strong> ${enquiry.fullName}</li>
          <li><strong>Email Address:</strong> ${enquiry.email}</li>
          <li><strong>Phone Number:</strong> ${enquiry.phoneNumber}</li>
          <li><strong>Country of Residence:</strong> ${enquiry.country}</li>
          <li><strong>Preferred Travel Date:</strong> ${enquiry.travelDate || 'Not specified'}</li>
          <li><strong>Number of Travelers:</strong> ${enquiry.numberOfTravelers}</li>
        </ul>
        <h3>Message:</h3>
        <p>${enquiry.message}</p>
        <br>
        <p>Please respond to this enquiry as soon as possible.</p>
      `,
    });
  }
}
