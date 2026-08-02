import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// Transporter setup
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// College details from environment
const COLLEGE_NAME = process.env.COLLEGE_NAME || "Noorul Islam College of Engineering and Technology";
const COLLEGE_WEBSITE = process.env.COLLEGE_WEBSITE || "https://www.niceindia.com";
const ADMIN_EMAILS = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : [];

// ----- Shared email header & footer (no logo, mobile‑responsive) -----
function emailHeader(title) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body, table, td, p, a, div { margin: 0; padding: 0; border: 0; font-size: 100%; font-family: 'Segoe UI', Roboto, Arial, sans-serif; }
        body { background: #f2f6fc; padding: 20px; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,20,40,0.06); overflow: hidden; }
        .header { background: #003366; padding: 20px 20px 14px; text-align: center; }
        .header h1 { color: #ffffff; font-size: 22px; font-weight: 600; margin: 0; letter-spacing: 0.5px; }
        .body { padding: 24px 24px 18px; color: #1a2a4a; line-height: 1.6; }
        .body h2 { color: #003366; font-size: 20px; margin-top: 0; border-bottom: 2px solid #e8f0fe; padding-bottom: 8px; }
        .body p { margin: 0 0 12px 0; }
        .body strong { color: #003366; }
        .details { background: #f7faff; border-left: 4px solid #2b7be4; padding: 12px 16px; margin: 16px 0; border-radius: 4px; }
        .details p { margin: 4px 0; }
        .btn { display: inline-block; background: #2b7be4; color: #fff !important; padding: 10px 28px; text-decoration: none; border-radius: 30px; font-weight: 500; }
        .btn:hover { background: #1a5fc7; }
        .footer { background: #e8f0fe; padding: 14px 20px; text-align: center; font-size: 13px; color: #4a6a8a; border-top: 1px solid #d6e2f0; }
        .footer a { color: #2b7be4; text-decoration: none; }
        .footer .divider { color: #b0c4d8; margin: 0 6px; }
        @media (max-width: 480px) {
          .header h1 { font-size: 18px; }
          .body { padding: 16px; }
          .body h2 { font-size: 18px; }
          .details { padding: 10px 14px; }
          .btn { display: block; text-align: center; }
          .footer { font-size: 12px; padding: 12px 16px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${COLLEGE_NAME}</h1>
        </div>
        <div class="body">
  `;
}

function emailFooter() {
  return `
        </div>
        <div class="footer">
          <span>${COLLEGE_NAME}</span>
          <span class="divider">|</span>
          <a href="${COLLEGE_WEBSITE}">${COLLEGE_WEBSITE.replace(/^https?:\/\//, '')}</a>
          <br>
          <span style="font-size: 12px; color: #6b8ba0;">© ${new Date().getFullYear()} All rights reserved.</span>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ---------- 1. Send OTP ----------
export async function sendAdmissionOtp(email, otp) {
  const html = emailHeader('OTP Verification') + `
    <h2>Verify Your Email</h2>
    <p>Dear Applicant,</p>
    <p>Thank you for applying to ${COLLEGE_NAME}. To complete your admission application, please verify your email using the one‑time password (OTP) below.</p>
    <div style="background: #f0f4f8; border-radius: 8px; padding: 16px 20px; text-align: center; margin: 20px 0;">
      <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #003366; font-family: monospace;">${otp}</span>
    </div>
    <p style="font-size: 14px; color: #4a6a8a;">This OTP is valid for <strong>5 minutes</strong>. Please do not share it with anyone.</p>
    <p>If you did not request this, please ignore this email.</p>
  ` + emailFooter();

  await transporter.sendMail({
    from: `"${COLLEGE_NAME} Admissions" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'OTP for Admission Application',
    html,
  });
}

// ---------- 2. Application Received ----------
export async function sendApplicationReceived(email, name, applicationId) {
  const statusLink = `${process.env.PHP_URL || 'https://www.niceindia.com'}/admission-status.php?id=${applicationId}`;

  const html = emailHeader('Application Received') + `
    <h2>Application Received</h2>
    <p>Dear <strong>${name}</strong>,</p>
    <p>We are pleased to confirm that we have received your admission application for the academic year <strong>${new Date().getFullYear()}-${new Date().getFullYear()+1}</strong>.</p>
    <div class="details">
      <p><strong>Application ID:</strong> ${applicationId}</p>
      <p><strong>Submitted on:</strong> ${new Date().toLocaleString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
    </div>
    <p>You can track your application status anytime using the link below:</p>
    <p style="text-align: center; margin: 24px 0;">
      <a href="${statusLink}" class="btn">View Application Status</a>
    </p>
    <p style="font-size: 14px; color: #4a6a8a;">If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${statusLink}" style="word-break: break-all;">${statusLink}</a>
    </p>
    <p>We will review your application and update you on the status shortly.</p>
    <p>Thank you for choosing ${COLLEGE_NAME}.</p>
  ` + emailFooter();

  await transporter.sendMail({
    from: `"${COLLEGE_NAME} Admissions" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Application Received – Noorul Islam College',
    html,
  });
}

// ---------- 3. Application Status Update ----------
export async function sendApplicationStatusUpdate(email, name, status, comment) {
  const statusText = status === 'accepted' ? 'ACCEPTED' : 'REJECTED';
  const color = status === 'accepted' ? '#2e7d32' : '#c62828';
  const statusEmoji = status === 'accepted' ? '🎉' : '📢';

  const html = emailHeader('Application Status Update') + `
    <h2>Application Status Update</h2>
    <p>Dear <strong>${name}</strong>,</p>
    <p>We are writing to inform you about the status of your admission application to ${COLLEGE_NAME}.</p>
    <div style="background: #f7faff; border-radius: 8px; padding: 16px 20px; margin: 20px 0; text-align: center;">
      <span style="font-size: 24px; font-weight: 700; color: ${color};">${statusEmoji} ${statusText}</span>
    </div>
    ${comment ? `<div class="details"><p><strong>Admin Remark:</strong> ${comment}</p></div>` : ''}
    <p>We appreciate your interest in our institution. If you have any questions, feel free to contact our admissions office.</p>
    <p>Thank you for applying to ${COLLEGE_NAME}.</p>
  ` + emailFooter();

  await transporter.sendMail({
    from: `"${COLLEGE_NAME} Admissions" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Application ${statusText} – Noorul Islam College`,
    html,
  });
}

// ---------- 4. Notify Admin about New Application ----------
export async function notifyAdminNewApplication(application) {
  if (ADMIN_EMAILS.length === 0) return;

  const html = emailHeader('New Application Alert') + `
    <h2>New Admission Application Received</h2>
    <p>A new application has been submitted to ${COLLEGE_NAME}. Please review the details below:</p>
    <div class="details">
      <p><strong>Name:</strong> ${application.name}</p>
      <p><strong>Father / Guardian:</strong> ${application.fatherName}</p>
      <p><strong>Email:</strong> <a href="mailto:${application.email}">${application.email}</a></p>
      <p><strong>Hall Ticket No:</strong> ${application.hallTicketNo}</p>
      <p><strong>Branch Preferred:</strong> ${application.branchPreferred}</p>
      <p><strong>Admission For:</strong> ${application.admissionFor}</p>
      <p><strong>Cutoff Mark:</strong> ${application.cutoffMark || 'Not provided'}</p>
      <p><strong>Mobile:</strong> ${application.mobile}</p>
      <p><strong>Parent Mobile:</strong> ${application.parentMobile}</p>
      <p><strong>District:</strong> ${application.district}</p>
      <p><strong>State:</strong> ${application.state}</p>
      <p><strong>Submitted At:</strong> ${new Date(application.submittedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
    </div>
  ` + emailFooter();

  await transporter.sendMail({
    from: `"${COLLEGE_NAME} Admissions" <${process.env.SMTP_USER}>`,
    to: ADMIN_EMAILS.join(','),
    subject: `New Application – ${application.name}`,
    html,
  });
}