import nodemailer, { Transporter } from "nodemailer";
import { ENV } from "../config/env.js";

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    if (ENV.SMTP_HOST && ENV.SMTP_USER) {
      this.transporter = nodemailer.createTransport({
        host: ENV.SMTP_HOST,
        port: ENV.SMTP_PORT,
        secure: ENV.SMTP_PORT === 465,
        auth: {
          user: ENV.SMTP_USER,
          pass: ENV.SMTP_PASS,
        },
      });
      this.isConfigured = true;
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    if (!this.isConfigured || !this.transporter) {
      console.log(`\n========================================`);
      console.log(`[Email Service (Dev Mode - No SMTP Configured)]`);
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Body:\n${options.text}`);
      console.log(`========================================\n`);
      return;
    }

    await this.transporter.sendMail({
      from: ENV.SMTP_FROM,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const link = `${ENV.APP_URL}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
    await this.sendEmail({
      to: email,
      subject: "Verify your email - Dev AI Workspace",
      text: `Welcome to Dev AI Workspace!\n\nPlease verify your email address by opening the following link:\n${link}\n\nThis link will expire in ${ENV.VERIFICATION_TOKEN_EXPIRY_HOURS} hours.`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Welcome to Dev AI Workspace</h2>
          <p>Please click the button below to verify your email address:</p>
          <p><a href="${link}" style="display: inline-block; padding: 10px 20px; background: #18181b; color: #ffffff; text-decoration: none; border-radius: 6px;">Verify Email</a></p>
          <p style="color: #71717a; font-size: 12px;">Or copy and paste this link: ${link}</p>
        </div>
      `,
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const link = `${ENV.APP_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    await this.sendEmail({
      to: email,
      subject: "Reset your password - Dev AI Workspace",
      text: `You requested a password reset for Dev AI Workspace.\n\nClick the link below to set a new password:\n${link}\n\nThis link expires in ${ENV.PASSWORD_RESET_TOKEN_EXPIRY_HOURS} hours. If you did not request this, you can ignore this email.`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Password Reset Request</h2>
          <p>Click below to reset your Dev AI Workspace password:</p>
          <p><a href="${link}" style="display: inline-block; padding: 10px 20px; background: #18181b; color: #ffffff; text-decoration: none; border-radius: 6px;">Reset Password</a></p>
          <p style="color: #71717a; font-size: 12px;">Link expires in ${ENV.PASSWORD_RESET_TOKEN_EXPIRY_HOURS} hours.</p>
        </div>
      `,
    });
  }

  async sendInvitationEmail(
    email: string,
    token: string,
    projectName: string,
    role: string,
    inviterName: string
  ): Promise<void> {
    const link = `${ENV.APP_URL}/invite/${token}`;
    await this.sendEmail({
      to: email,
      subject: `You have been invited to join ${projectName} on Dev AI Workspace`,
      text: `${inviterName} invited you to join the project "${projectName}" as a ${role}.\n\nAccept your invitation here:\n${link}\n\nThis link will expire in ${ENV.INVITATION_EXPIRY_DAYS} days.`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>You're invited to collaborate on ${projectName}</h2>
          <p><strong>${inviterName}</strong> has invited you to join <strong>${projectName}</strong> as a <strong>${role}</strong>.</p>
          <p><a href="${link}" style="display: inline-block; padding: 10px 20px; background: #18181b; color: #ffffff; text-decoration: none; border-radius: 6px;">Accept Invitation</a></p>
          <p style="color: #71717a; font-size: 12px;">Link: ${link}</p>
        </div>
      `,
    });
  }

  async sendRoleChangedEmail(
    email: string,
    projectName: string,
    newRole: string,
    actorName: string
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Your role in ${projectName} has been updated to ${newRole}`,
      text: `Your role in "${projectName}" has been updated to ${newRole} by ${actorName}.`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Project Role Updated</h2>
          <p>Your role in project <strong>${projectName}</strong> has been updated to <strong>${newRole}</strong> by ${actorName}.</p>
        </div>
      `,
    });
  }
}

export const emailService = new EmailService();
