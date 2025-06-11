import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import ejs from 'ejs';

// Load environment variables as early as possible
dotenv.config();

// Configure the SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Render an EJS email template.
 * Checks both the compiled (dist) and source directories so it works in dev and prod.
 */
async function renderTemplate(
  templateName: string,
  data: Record<string, unknown>
): Promise<string> {
  // Path in dist after build
  const distPath = path.resolve(
    __dirname,
    '../email-templates',
    `${templateName}.ejs`
  );
  // Path in source during development
  const srcPath = path.resolve(
    process.cwd(),
    'apps/auth-service/src/utils/email-templates',
    `${templateName}.ejs`
  );

  // Choose which path exists
  let templatePath: string;
  if (fs.existsSync(distPath)) {
    templatePath = distPath;
  } else if (fs.existsSync(srcPath)) {
    templatePath = srcPath;
  } else {
    throw new Error(`Email template not found in dist or src: tried ${distPath} and ${srcPath}`);
  }

//   console.log('Rendering EJS template from:', templatePath);
  return await ejs.renderFile(templatePath, data, { async: true });
}

/**
 * Send an email using the specified EJS template and data.
 */
export async function sendEmail(
  to: string,
  subject: string,
  templateName: string,
  templateData: Record<string, unknown>
): Promise<boolean> {
  try {
    const html = await renderTemplate(templateName, templateData);

    const mailOptions = {
      from: process.env.SMTP_USER,
      to,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to} using template ${templateName}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}
