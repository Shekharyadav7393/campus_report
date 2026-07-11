import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

export class EmailService {
  private static transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: parseInt(process.env.SMTP_PORT || '2525'),
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  });

  /**
   * Send mail wrapper. If SMTP configs are not set, it logs email contents instead of throwing.
   */
  public static async sendMail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        logger.info(`[MOCK EMAIL] To: ${to} | Subject: ${subject} | Content: ${html.substring(0, 100)}...`);
        return true;
      }

      await this.transporter.sendMail({
        from: '"CampusReport" <no-reply@campusreport.com>',
        to,
        subject,
        html,
      });
      logger.info(`Email sent to ${to}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send email to ${to}: ${error}`);
      return false;
    }
  }

  /**
   * Send account verification link
   */
  public static async sendVerificationEmail(email: string, token: string): Promise<boolean> {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
    const html = `
      <h2>Welcome to CampusReport!</h2>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${verificationUrl}" target="_blank">Verify Email Address</a>
      <p>If you did not request this, please ignore this email.</p>
    `;
    return this.sendMail(email, 'Verify your CampusReport account', html);
  }

  /**
   * Send status update notification
   */
  public static async sendStatusUpdateEmail(email: string, ticketId: string, title: string, status: string): Promise<boolean> {
    const html = `
      <h3>Update on your report: ${ticketId}</h3>
      <p>Title: <strong>${title}</strong></p>
      <p>The status of your ticket has been updated to: <strong>${status}</strong></p>
      <p>Log in to the dashboard to see comments or details.</p>
    `;
    return this.sendMail(email, `Ticket [${ticketId}] Updated`, html);
  }
}
