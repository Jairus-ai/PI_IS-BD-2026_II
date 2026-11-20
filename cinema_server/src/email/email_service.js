import nodemailer from 'nodemailer';
import { REFUND_MINIMUM_DAYS } from '../purchase_module/controllers/purchase_controller.js';

const DEFAULT_SENDER = 'CinePI <no-reply@cinepi.com>';
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

const AMOUNT_FORMATTER = new Intl.NumberFormat('es-CR', {
  style: 'currency',
  currency: 'CRC'
});

const REFUND_POLICY_MESSAGE =
  'Puedes solicitar el reembolso de tu compra desde tu historial de compras ' +
  `con al menos ${REFUND_MINIMUM_DAYS} días de anticipación a la proyección. ` +
  'Una vez realizado el reembolso, los asientos quedan disponibles para la venta ' +
  'y los códigos QR de estas entradas dejan de ser válidos.';

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

async function sendPasswordRecoveryEmail({
  email,
  recoveryCode,
  expirationMinutes,
}) {
  const transporter = await getTransporter();

  return transporter.sendMail({
    from: process.env.EMAIL_FROM ?? DEFAULT_SENDER,
    to: email,
    subject: 'Código de recuperación de contraseña - CinePI',
    text: `Tu código de recuperación es ${recoveryCode}. Este código es válido durante ${expirationMinutes} minutos.`,
    html: `
      <p>Recibimos una solicitud para recuperar tu contraseña de CinePI.</p>
      <p>Tu código de verificación es:</p>
      <p><strong>${escapeHtml(recoveryCode)}</strong></p>
      <p>Este código es válido durante ${expirationMinutes} minutos.</p>
      <p>Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
    `,
  });
}

async function sendPasswordChangedEmail({ email }) {
  const transporter = await getTransporter();

  return transporter.sendMail({
    from: process.env.EMAIL_FROM ?? DEFAULT_SENDER,
    to: email,
    subject: 'Tu contraseña de CinePI fue modificada',
    text:
      'Tu contraseña de CinePI fue modificada correctamente. ' +
      'Si no realizaste este cambio, comunícate con soporte.',
    html: `
      <p>Tu contraseña de CinePI fue modificada correctamente.</p>
      <p>Si no realizaste este cambio, comunícate con soporte.</p>
    `,
  });
}

function getTicketDetails(purchase, seats) {
  const ticketDetails = [
    ['Cantidad de entradas', seats.length],
    ['Asientos', seats.join(', ')]
  ];

  if (!purchase)
    return ticketDetails;

  return [
    ['Número de compra', purchase.ID_RECEIPT],
    ['Sucursal', purchase.LOCATION_NAME],
    ['Película', purchase.MOVIE_TITLE],
    ['Sala', purchase.SCREEN],
    ['Fecha', purchase.SCREENING_DATE],
    ['Hora', purchase.SCREENING_TIME],
    ...ticketDetails,
    ['Monto pagado', AMOUNT_FORMATTER.format(purchase.TOTAL_AMOUNT)],
    ['Fecha y hora del pago', purchase.RECEIPT_DATE]
  ];
}

async function sendQREmail({
  email,
  pdfBuffer,
  seats = [],
  purchase = null,
  filename = 'entradas.pdf',
}) {
  const transporter = await getTransporter();
  const details = getTicketDetails(purchase, seats);
  const subject = 'Tus entradas de CinePI';
  const detailRows = details
    .map(([label, value]) => `
        <tr>
          <td style="padding: 4px 16px 4px 0;"><strong>${escapeHtml(label)}</strong></td>
          <td style="padding: 4px 0;">${escapeHtml(value)}</td>
        </tr>`)
    .join('');

  return transporter.sendMail({
    from: process.env.EMAIL_FROM ?? DEFAULT_SENDER,
    to: email,
    subject,
    text:
      'Gracias por tu compra en CinePI. ' +
      'Adjuntamos los códigos QR de tus entradas.\n\n' +
      details.map(([label, value]) => `${label}: ${value}`).join('\n') +
      `\n\nNota: ${REFUND_POLICY_MESSAGE}`,
    html: `
      <p>Gracias por tu compra en CinePI.</p>
      <p>Adjuntamos los códigos QR de tus entradas. Preséntalos al ingresar a la sala.</p>
      <table style="border-collapse: collapse;">${detailRows}
      </table>
      <p style="font-size: 12px; color: #666666;">
        <strong>Nota:</strong> ${escapeHtml(REFUND_POLICY_MESSAGE)}
      </p>
    `,
    attachments: [
      {
        filename,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
}

async function sendTemporaryPasswordEmail({
  email,
  firstName,
  temporaryPassword,
}) {
  const transporter = await getTransporter();

  return transporter.sendMail({
    from: process.env.EMAIL_FROM ?? DEFAULT_SENDER,
    to: email,
    subject: 'Tu acceso temporal a CinePI',
    text:
      `Hola ${firstName}, tu cuenta en CinePI fue creada. ` +
      `Tu contraseña temporal es ${temporaryPassword}. ` +
      'Debes cambiarla al iniciar sesión por primera vez. ' +
      'Esta contraseña temporal vence en 3 días.',
    html: `
      <p>Hola <strong>${escapeHtml(firstName)}</strong>,</p>
      <p>Tu cuenta en CinePI fue creada correctamente.</p>
      <p>Tu contraseña temporal es:</p>
      <p><strong>${escapeHtml(temporaryPassword)}</strong></p>
      <p>Debes cambiar esta contraseña al iniciar sesión por primera vez.</p>
      <p>La contraseña temporal vence en 3 días.</p>
    `,
  });
}

const emailService = {
  sendWelcomeEmail,
  sendPasswordRecoveryEmail,
  sendPasswordChangedEmail,
  sendQREmail,
  sendTemporaryPasswordEmail,
};

export default emailService;