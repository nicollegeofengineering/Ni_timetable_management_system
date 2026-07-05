import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOtpEmail(email, otp) {
  await transporter.sendMail({
    from: `"Noorul Islam Timetable" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Your Admin Login OTP",
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin OTP · Noorul Islam Timetable</title>
        <style>
          @media only screen and (max-width: 480px) {
            .container { width: 100% !important; }
            .header-title { font-size: 20px !important; }
            .otp-code { font-size: 28px !important; letter-spacing: 6px !important; padding: 12px 18px !important; }
            .body-padding { padding: 24px 18px 20px 18px !important; }
            .header-padding { padding: 20px 18px 16px 18px !important; }
            .footer-padding { padding: 14px 18px 12px 18px !important; }
            .security-box { padding: 14px 14px !important; }
            .greeting-text { font-size: 15px !important; }
            .message-text { font-size: 14px !important; }
            .badge-text { font-size: 12px !important; }
            .footer-text { font-size: 11px !important; }
            .validity-box { padding: 10px 14px !important; }
            .header-sub { font-size: 12px !important; padding-left: 10px !important; }
            .admin-label { font-size: 12px !important; }
            .divider-spacing { margin: 20px 0 10px 0 !important; }
          }
        </style>
      </head>
      <body style="margin:0; padding:0; background-color:#f2f6fc; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">

        <table align="center" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:480px; width:100%; background-color:#ffffff; border-radius:28px; box-shadow:0 12px 32px rgba(10,37,64,0.10); overflow:hidden; margin:16px auto;">
          <tr>
            <td style="background: linear-gradient(145deg, #0a2a4a 0%, #1a4b6d 100%); padding:28px 30px 22px 30px; border-bottom: 4px solid #c9a227;" class="header-padding">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="color:#ffffff; font-size:24px; font-weight:600; letter-spacing:-0.3px; line-height:1.2;" class="header-title">
                    <span style="color:#f5d77b;">◆</span> Noorul Islam
                    <span style="display:inline-block; margin-left:4px; font-weight:300; color:#b6d6e8;">Timetable</span>
                  </td>
                  <td align="right" style="color:#b6d6e8; font-size:14px; font-weight:400; vertical-align:bottom; padding-bottom:2px;" class="admin-label">
                    Admin
                  </td>
                </tr>
              </table>
              <div style="margin-top:6px; font-size:14px; color:#b0d0e5; letter-spacing:0.2px; border-left:3px solid #c9a227; padding-left:14px; font-weight:300;" class="header-sub">
                secure · one‑time passcode
              </div>
            </td>
          </tr>

          <tr>
            <td style="background:#f9fcff; padding:34px 32px 28px 32px;" class="body-padding">

              <p style="margin:0 0 8px 0; font-size:16px; color:#1e3b5a; font-weight:500;" class="greeting-text">
                Hello Admin,
              </p>
              <p style="margin:0 0 18px 0; font-size:15px; color:#2c4a6a; line-height:1.5; font-weight:400;" class="message-text">
                Use the OTP below to complete your login to the <strong style="color:#0a2a4a;">College Timetable System</strong>.
              </p>

              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#eaf3fb; border-radius:18px; border-left:6px solid #c9a227; margin:18px 0 16px 0; box-shadow: inset 0 1px 4px rgba(0,0,0,0.02), 0 6px 14px rgba(10,37,64,0.06);">
                <tr>
                  <td style="padding:18px 10px; text-align:center;">
                    <span style="font-size:36px; font-weight:700; letter-spacing:8px; color:#0a2a4a; background:#ffffff; padding:10px 24px; border-radius:60px; display:inline-block; box-shadow:0 2px 8px rgba(0,0,0,0.02); font-family: 'Roboto Mono', 'Courier New', monospace;" class="otp-code">
                      ${otp}
                    </span>
                  </td>
                </tr>
              </table>

              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#ffffff; border-radius:16px; padding:12px 18px; margin:0 0 14px 0; border:1px solid #e2edf7; box-shadow:0 2px 6px rgba(0,0,0,0.01);" class="validity-box">
                <tr>
                  <td style="color:#1f4970; font-size:14px; vertical-align:middle;" class="badge-text">
                    <span style="display:inline-block; width:10px; height:10px; background:#c9a227; border-radius:20px; margin-right:10px;"></span>
                    <span style="font-weight:500;">Valid for 5 minutes</span>
                    <span style="color:#4e7a9f; margin-left:8px;">·</span>
                    <span style="color:#4e7a9f; margin-left:8px;">single‑use</span>
                  </td>
                </tr>
              </table>

              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#eef6fe; border-radius:14px; padding:16px 18px; border-left:3px solid #3c7ca5; margin:16px 0 6px 0;" class="security-box">
                <tr>
                  <td style="color:#1b4463; font-size:14px; line-height:1.5;" class="message-text">
                    <span style="display:inline-block; margin-right:6px;">🔒</span> 
                    If you didn't request this, please ignore this email.
                    <div style="margin-top:4px; color:#2f5e82; font-size:13px;" class="badge-text">Never share your OTP with anyone.</div>
                  </td>
                </tr>
              </table>

              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="border-top:1px solid #dbe8f2; padding:20px 0 10px 0;" class="divider-spacing"></td>
                </tr>
              </table>

              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="color:#3a6a8c; font-size:13px; font-weight:400; letter-spacing:0.2px;" class="badge-text">
                    <span style="color:#c9a227;">⏺</span>  Noorul Islam College of Engineering
                  </td>
                  <td align="right" style="color:#4a7a9e; font-size:13px;" class="badge-text">
                    <span style="background:#e2eef9; padding:2px 12px; border-radius:40px; font-weight:400;">admin · otp</span>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <tr>
            <td style="background:#0a2540; padding:18px 28px 16px 28px; border-top:3px solid #c9a227;" class="footer-padding">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="color:#aac5db; font-size:12px; font-weight:300; letter-spacing:0.3px;" class="footer-text">
                    <span style="color:#f5d77b;">●</span>  timetable system · v1.0
                  </td>
                  <td align="right" style="color:#7fa5c0; font-size:12px; font-weight:300;" class="footer-text">
                    <span style="border-right:1px solid #2f5f7e; padding-right:10px; margin-right:8px;">secure</span>
                    <span>${new Date().getFullYear()}</span>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top:8px; color:#6f93b0; font-size:11px; font-weight:300; letter-spacing:0.2px;" class="footer-text">
                    <span style="display:inline-block; background:#1a3b55; padding:2px 12px; border-radius:20px;">this is an automated message</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <div style="height:6px;"></div>

      </body>
      </html>
    `,
  });
}
