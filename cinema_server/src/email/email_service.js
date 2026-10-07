import nodemailer from 'nodemailer';

const DEFAULT_SENDER = 'CinePI <no-reply@cinepi.com>';
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
let transporterPromise;

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}

async function createTransporter() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }

  const testAccount = await nodemailer.createTestAccount();
  console.log('No SMTP_HOST in .env, using an Ethereal test inbox');
  return nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
}

function getTransporter() {
  transporterPromise ??= createTransporter().catch((error) => {
    transporterPromise = undefined;
    throw error;
  });
  return transporterPromise;
}

async function sendWelcomeEmail({ email, firstName }) {
  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? DEFAULT_SENDER,
    to: email,
    subject: 'Tu cuenta en CinePI fue creada',
    text: `Hola ${firstName}, tu cuenta en CinePI fue creada con éxito. Ya puedes comprar tus entradas.`,
    html: `<p>Hola <strong>${escapeHtml(firstName)}</strong>,</p>
      <p>Tu cuenta en CinePI fue creada con éxito. Ya puedes comprar tus entradas.</p>`
  });
  
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`Welcome email preview: ${previewUrl}`);
  }
  return info;
}

const emailService = { sendWelcomeEmail };

export default emailService;
