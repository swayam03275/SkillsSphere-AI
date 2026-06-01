import nodemailer from "nodemailer";

import logger from "./logger.js";

/**
 * Sends an email using either console or SMTP based on environment configuration.
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Plain text content
 * @param {string} html - HTML content (optional)
 */
export const sendEmail = async (to, subject, text, html) => {
  const mode = process.env.EMAIL_SERVICE_MODE || "console";

  if (mode === "console") {
    logger.log("=========================================");
    logger.log(`[EMAIL SERVICE] Mode: CONSOLE`);
    logger.log(`[EMAIL SERVICE] To: ${to}`);
    logger.log(`[EMAIL SERVICE] Subject: ${subject}`);
    logger.log(`[EMAIL SERVICE] Content: ${text}`);
    logger.log("=========================================");
    return;
  }

  // SMTP Mode
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    logger.error("[EMAIL SERVICE] SMTP Error: EMAIL_USER or EMAIL_PASS missing. Falling back to console.");
    logger.log(`[FALLBACK] To: ${to} | Subject: ${subject} | Content: ${text}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM || "SkillsSphere AI <no-reply@skillssphere.ai>",
    to,
    subject,
    text,
    html: html || text,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.log(`[EMAIL SERVICE] SMTP: Email sent to ${to}`);
  } catch (error) {
    logger.error(`[EMAIL SERVICE] SMTP Error: ${error.message}`);
    throw new Error(`Email delivery failed: ${error.message}`);
  }
};

/**
 * Specialized function for sending OTPs
 */
export const sendOTP = async (email, otp, type) => {
  const isVerification = type === "verification";
  const subject = isVerification 
    ? "[SkillsSphere AI] Verify Your Account" 
    : "[SkillsSphere AI] Password Reset Request";
    
  const title = isVerification ? "Verify Your Email Address" : "Reset Your Password";
  const actionText = isVerification 
    ? "Thank you for joining SkillsSphere AI. Please use the following One-Time Password (OTP) to verify your account:" 
    : "We received a request to reset your password. Please use the following One-Time Password (OTP) to proceed:";

  const text = `${actionText} ${otp}. This code expires in 5 minutes.`;
  
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #4CAF50; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">SkillsSphere AI</h1>
      </div>
      <div style="padding: 30px; color: #333; line-height: 1.6;">
        <h2 style="color: #2c3e50; margin-top: 0;">${title}</h2>
        <p>${actionText}</p>
        <div style="background-color: #f8f9fa; border: 1px dashed #4CAF50; border-radius: 4px; padding: 20px; text-align: center; margin: 25px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4CAF50;">${otp}</span>
        </div>
        <p style="font-size: 14px; color: #666;">This code is valid for <b>5 minutes</b>. If you did not request this, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">
          &copy; ${new Date().getFullYear()} SkillsSphere AI. All rights reserved.<br/>
          Building the future of skill-based hiring.
        </p>
      </div>
    </div>
  `;
  
  await sendEmail(email, subject, text, html);
};
