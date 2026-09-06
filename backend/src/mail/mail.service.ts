import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initTransporter();
  }

  private initTransporter() {
    const host = this.configService?.get<string>('SMTP_HOST') || process.env.SMTP_HOST;
    const port = this.configService?.get<number>('SMTP_PORT') || process.env.SMTP_PORT || 587;
    const user = this.configService?.get<string>('SMTP_USER') || process.env.SMTP_USER;
    const pass = this.configService?.get<string>('SMTP_PASS') || process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        secure: Number(port) === 465,
        auth: {
          user,
          pass,
        },
      });
      this.logger.log(`SMTP Mailer initialized using host: ${host}:${port}`);
    } else {
      this.logger.warn('SMTP credentials not fully configured in environment variables.');
    }
  }

  async sendVerificationEmail(toEmail: string, name: string, token: string): Promise<boolean> {
    const frontendUrl =
      this.configService?.get<string>('FRONTEND_URL') || process.env.FRONTEND_URL || 'http://localhost:3000';
    const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;
    const fromAddress =
      this.configService?.get<string>('EMAIL_FROM') || process.env.EMAIL_FROM || 'no-reply@dealflow360.com';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify your DealFlow360 account</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #333; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
          .header { background: linear-gradient(135deg, #007FFF 0%, #0056b3 100%); padding: 30px; text-align: center; color: white; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
          .content { padding: 35px 30px; }
          .greeting { font-size: 18px; font-weight: 600; margin-bottom: 15px; color: #1e293b; }
          .text { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 25px; }
          .btn-container { text-align: center; margin: 30px 0; }
          .btn { background-color: #007FFF; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(0, 127, 255, 0.25); }
          .link-fallback { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; font-size: 13px; word-break: break-all; color: #64748b; margin-top: 20px; }
          .footer { background: #f8fafc; padding: 20px 30px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>DealFlow360</h1>
          </div>
          <div class="content">
            <div class="greeting">Hello ${name || 'User'},</div>
            <p class="text">Welcome to DealFlow360! Thank you for signing up. Please confirm your email address by clicking the button below to complete your registration and activate full workspace access.</p>
            <div class="btn-container">
              <a href="${verifyUrl}" target="_blank" class="btn">Verify Email Address</a>
            </div>
            <p class="text">Or copy and paste this verification link into your browser:</p>
            <div class="link-fallback">${verifyUrl}</div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} DealFlow360. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    if (!this.transporter) {
      this.logger.warn(`Transporter not configured. Verification URL for ${toEmail}: ${verifyUrl}`);
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"DealFlow360" <${fromAddress}>`,
        to: toEmail,
        subject: 'Verify your DealFlow360 Account',
        html: htmlContent,
      });

      this.logger.log(`Verification email sent to ${toEmail}: messageId=${info.messageId}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send verification email to ${toEmail}: ${error?.message || error}`, error?.stack);
      return false;
    }
  }

  async sendRoleChangeNotification(
    toEmail: string,
    name: string,
    oldRole: string,
    newRole: string,
  ): Promise<boolean> {
    const fromAddress =
      this.configService?.get<string>('EMAIL_FROM') || process.env.EMAIL_FROM || 'no-reply@dealflow360.com';
    const frontendUrl =
      this.configService?.get<string>('FRONTEND_URL') || process.env.FRONTEND_URL || 'http://localhost:3000';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Role Updated - DealFlow360</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #333; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
          .header { background: linear-gradient(135deg, #007FFF 0%, #0056b3 100%); padding: 30px; text-align: center; color: white; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
          .content { padding: 35px 30px; }
          .greeting { font-size: 18px; font-weight: 600; margin-bottom: 15px; color: #1e293b; }
          .text { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 25px; }
          .role-badge { display: inline-block; background-color: #e0f2fe; color: #0369a1; padding: 8px 18px; border-radius: 20px; font-weight: 700; font-size: 14px; border: 1px solid #bae6fd; }
          .btn-container { text-align: center; margin: 30px 0; }
          .btn { background-color: #007FFF; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; }
          .footer { background: #f8fafc; padding: 20px 30px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>DealFlow360</h1>
          </div>
          <div class="content">
            <div class="greeting">Hello ${name || 'User'},</div>
            <p class="text">Your enterprise role in DealFlow360 has been updated by an administrator.</p>
            <p class="text">
              Previous Role: <strong>${oldRole}</strong><br>
              New Assigned Role: <span class="role-badge">${newRole}</span>
            </p>
            <p class="text">Your system access and workspace permissions have been updated accordingly.</p>
            <div class="btn-container">
              <a href="${frontendUrl}/login" target="_blank" class="btn">Log In to Workspace</a>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} DealFlow360. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    if (!this.transporter) {
      this.logger.warn(`Transporter not configured. Role change notification for ${toEmail} (${oldRole} -> ${newRole})`);
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"DealFlow360 Admin" <${fromAddress}>`,
        to: toEmail,
        subject: 'Your DealFlow360 Account Role Has Been Updated',
        html: htmlContent,
      });

      this.logger.log(`Role change notification sent to ${toEmail}: messageId=${info.messageId}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send role change notification to ${toEmail}: ${error?.message || error}`, error?.stack);
      return false;
    }
  }

  async sendCustomerQuotationInvitation(
    toEmail: string,
    customerName: string,
    quotationNumber: string,
    total: number,
    currency: string,
    rawToken: string,
  ): Promise<boolean> {
    const frontendUrl =
      this.configService?.get<string>('FRONTEND_URL') || process.env.FRONTEND_URL || 'http://localhost:3000';
    const setupUrl = `${frontendUrl}/portal/activate?token=${rawToken}`;
    const fromAddress =
      this.configService?.get<string>('EMAIL_FROM') || process.env.EMAIL_FROM || 'no-reply@dealflow360.com';

    const formattedTotal = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(total);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Your DealFlow360 Quotation is Ready</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #333; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
          .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 30px; text-align: center; color: white; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
          .content { padding: 35px 30px; }
          .greeting { font-size: 18px; font-weight: 600; margin-bottom: 15px; color: #1e293b; }
          .text { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 25px; }
          .details-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 25px; }
          .details-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
          .details-row:last-child { margin-bottom: 0; font-weight: 700; font-size: 16px; border-top: 1px dashed #cbd5e1; padding-top: 10px; margin-top: 10px; }
          .btn-container { text-align: center; margin: 30px 0; }
          .btn { background-color: #0284c7; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25); }
          .link-fallback { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; font-size: 13px; word-break: break-all; color: #64748b; margin-top: 20px; }
          .footer { background: #f8fafc; padding: 20px 30px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>DealFlow360 Customer Portal</h1>
          </div>
          <div class="content">
            <div class="greeting">Hello ${customerName || 'Valued Customer'},</div>
            <p class="text">A new quotation has been generated for your review. You can activate your account and view the full details, request line item modifications, or confirm terms directly in our secure Customer Portal.</p>
            
            <div class="details-card">
              <div class="details-row"><span>Quotation Number:</span> <strong>${quotationNumber}</strong></div>
              <div class="details-row"><span>Total Amount:</span> <strong>${formattedTotal}</strong></div>
            </div>

            <div class="btn-container">
              <a href="${setupUrl}" target="_blank" class="btn">Set Password & View Quotation</a>
            </div>
            <p class="text">Or copy and paste this link into your browser:</p>
            <div class="link-fallback">${setupUrl}</div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} DealFlow360. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    if (!this.transporter) {
      this.logger.warn(`Transporter not configured. Customer setup invitation URL for ${toEmail}: ${setupUrl}`);
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"DealFlow360 Sales" <${fromAddress}>`,
        to: toEmail,
        subject: 'Your DealFlow360 Quotation is Ready',
        html: htmlContent,
      });

      this.logger.log(`Customer quotation invitation sent to ${toEmail}: messageId=${info.messageId}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send customer invitation email to ${toEmail}: ${error?.message || error}`, error?.stack);
      return false;
    }
  }

  async sendPasswordResetEmail(toEmail: string, name: string, otpCode: string): Promise<boolean> {
    const fromAddress =
      this.configService?.get<string>('EMAIL_FROM') || process.env.EMAIL_FROM || 'no-reply@dealflow360.com';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reset Your DealFlow360 Password</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #333; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
          .header { background: linear-gradient(135deg, #007FFF 0%, #0056b3 100%); padding: 30px; text-align: center; color: white; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
          .content { padding: 35px 30px; }
          .greeting { font-size: 18px; font-weight: 600; margin-bottom: 15px; color: #1e293b; }
          .text { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 25px; }
          .otp-box { background: #e0f2fe; border: 2px dashed #0284c7; padding: 18px; border-radius: 12px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0284c7; text-align: center; margin: 25px 0; }
          .footer { background: #f8fafc; padding: 20px 30px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>DealFlow360 Security</h1>
          </div>
          <div class="content">
            <div class="greeting">Hello ${name || 'User'},</div>
            <p class="text">We received a request to reset the password for your DealFlow360 account (${toEmail}). Use the 6-digit security code below to proceed with resetting your password.</p>
            <div class="otp-box">${otpCode}</div>
            <p class="text">This code will expire in 15 minutes. If you did not request a password reset, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} DealFlow360. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    if (!this.transporter) {
      this.logger.warn(`Transporter not configured. Password Reset OTP for ${toEmail}: ${otpCode}`);
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"DealFlow360 Security" <${fromAddress}>`,
        to: toEmail,
        subject: 'Reset Your DealFlow360 Password - Security Code',
        html: htmlContent,
      });

      this.logger.log(`Password reset email sent to ${toEmail}: messageId=${info.messageId}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send password reset email to ${toEmail}: ${error?.message || error}`, error?.stack);
      return false;
    }
  }
}
