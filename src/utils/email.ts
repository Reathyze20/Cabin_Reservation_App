/* ============================================================================
   utils/email.ts — Email services via Amazon SES (SMTP)
   ============================================================================ */

import nodemailer from "nodemailer";
import logger from "./logger";
import { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM, FRONTEND_URL } from "../config/config";

// ─── Nodemailer transporter (Amazon SES SMTP) ────────────────────────────────

const createTransporter = () => {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    logger.warn("EMAIL", "SMTP credentials are not fully configured. Emails will not be sent.");
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465, false for 587
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
};

const transporter = createTransporter();
const EMAIL_APP_NAME = "Chatačeskéstředohoří";
const EMAIL_APP_FOOTER = `${EMAIL_APP_NAME} — Rodinná aplikace pro správu chaty`;
const DEFAULT_EMAIL_FROM = `"${EMAIL_APP_NAME}" <noreply@chataceskestredohori.cz>`;

function ensureEmailTransport(emailKind: string): void {
  if (transporter) {
    return;
  }

  if (process.env.NODE_ENV === "production") {
    logger.error("EMAIL", `${emailKind} email could not be sent because SMTP is not fully configured.`);
    throw new Error("SMTP_NOT_CONFIGURED");
  }
}

// ─── Legacy: Send verification email with PIN code ──────────────────────────

export const sendVerificationEmailWithPIN = async (email: string, code: string): Promise<void> => {
  ensureEmailTransport("Verification PIN");
  if (!transporter) {
    logger.warn("EMAIL", `[SIMULATION] Verification PIN email for ${email} with code ${code}`);
    return;
  }

  try {
    const htmlContent = `
<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', Arial, sans-serif;">
  <div style="background-color: #f3f4f6; padding: 40px 20px;">
    <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
      
      <div style="text-align: center; padding: 32px 32px 16px 32px;">
        <h1 style="margin: 0; color: #111827; font-size: 24px; font-weight: 600;">${EMAIL_APP_NAME}</h1>
      </div>

      <div style="padding: 0 32px 32px 32px;">
        <p style="color: #374151; font-size: 16px; line-height: 1.5; margin: 0 0 16px 0;">
          Dobrý den,
        </p>
        <p style="color: #374151; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">
          Váš ověřovací kód pro dokončení registrace je:
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 36px; font-weight: bold; color: #5d9b62; letter-spacing: 8px; padding: 16px 24px; border: 2px dashed #5d9b62; border-radius: 8px; display: inline-block;">
            ${code}
          </span>
        </div>

        <p style="color: #374151; font-size: 16px; line-height: 1.5; margin: 0 0 16px 0;">
          Tento kód zadejte do příslušného pole v aplikaci.
        </p>

        <p style="color: #9ca3af; font-size: 13px; line-height: 1.4; margin: 20px 0 0 0;">
          Pokud jste o registraci nežádali, tento e-mail prosím ignorujte.
        </p>
      </div>
    </div>

    <div style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 16px; padding: 0 20px;">
      <p style="margin: 0;">${EMAIL_APP_FOOTER}</p>
    </div>
  </div>
</body>
</html>`;

    const textContent = `Dobrý den,\n\nVáš ověřovací kód je: ${code}\n\nZadejte ho do příslušného pole v aplikaci.\n\nPokud jste o registraci nežádali, tento e-mail ignorujte.`;

    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to: email,
      subject: `Ověření e-mailu — ${EMAIL_APP_NAME}`,
      text: textContent,
      html: htmlContent,
    });

    logger.info("EMAIL", `Verification PIN email sent to ${email}`, { messageId: info.messageId });
  } catch (error) {
    logger.error("EMAIL", `Failed to send verification PIN email to ${email}`, { error: String(error) });
    throw error;
  }
};

// ─── New SaaS: Send verification email with activation link ─────────────────

export const sendVerificationEmailWithToken = async (email: string, token: string): Promise<void> => {
  ensureEmailTransport("Verification token");
  const frontendBaseUrl = FRONTEND_URL.endsWith("/") ? FRONTEND_URL.slice(0, -1) : FRONTEND_URL;
  if (!transporter) {
    logger.warn("EMAIL", `[SIMULATION] Verification token email for ${email} — token: ${token}`);
    logger.info("EMAIL", `Verify URL (no SMTP): ${frontendBaseUrl}/verify?token=${token}`);
    return;
  }

  const verifyUrl = `${frontendBaseUrl}/verify?token=${token}`;

  try {
    const htmlContent = `
<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', Arial, sans-serif;">
  <div style="background-color: #f3f4f6; padding: 40px 20px;">
    
    <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
      
      <div style="text-align: center; padding: 32px 32px 16px 32px;">
        <h1 style="margin: 0; color: #111827; font-size: 24px; font-weight: 600;">${EMAIL_APP_NAME}</h1>
      </div>

      <div style="padding: 0 32px 32px 32px;">
        <p style="color: #374151; font-size: 16px; line-height: 1.5; margin: 0 0 16px 0;">
          Dobrý den,
        </p>
        <p style="color: #374151; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">
          Děkujeme za registraci do aplikace <strong style="color: #111827;">${EMAIL_APP_NAME}</strong>. 
          Pro aktivaci účtu prosím klikněte na tlačítko níže:
        </p>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${verifyUrl}" 
             style="background-color: #5d9b62; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
            Aktivovat účet
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 24px 0 8px 0;">
          Pokud tlačítko nefunguje, zkopírujte tento odkaz do prohlížeče:
        </p>
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin-top: 8px;">
          <a href="${verifyUrl}" style="color: #5d9b62; font-size: 13px; word-break: break-all; text-decoration: none;">${verifyUrl}</a>
        </div>

        <p style="color: #9ca3af; font-size: 13px; line-height: 1.4; margin: 20px 0 0 0;">
          Pokud jste o registraci nežádali, tento e-mail prosím ignorujte. Odkaz je platný jednorázově.
        </p>
      </div>
    </div>

    <div style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 16px; padding: 0 20px;">
      <p style="margin: 0;">${EMAIL_APP_FOOTER}</p>
    </div>
  </div>
</body>
</html>`;

    const textContent = `Dobrý den,\n\nPro aktivaci účtu v aplikaci ${EMAIL_APP_NAME} klikněte na tento odkaz:\n${verifyUrl}\n\nPokud jste o registraci nežádali, tento e-mail ignorujte.`;

    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to: email,
      subject: `Aktivace účtu — ${EMAIL_APP_NAME}`,
      text: textContent,
      html: htmlContent,
    });

    logger.info("EMAIL", `Verification token email sent to ${email}`, { messageId: info.messageId });
  } catch (error) {
    logger.error("EMAIL", `Failed to send verification token email to ${email}`, { error: String(error) });
    throw error;
  }
};

export const sendSuperadminOnboardingEmail = async (
  email: string,
  token: string,
  tempPassword: string
): Promise<{ delivered: boolean }> => {
  ensureEmailTransport("Superadmin onboarding");
  const frontendBaseUrl = FRONTEND_URL.endsWith("/") ? FRONTEND_URL.slice(0, -1) : FRONTEND_URL;
  const verifyUrl = `${frontendBaseUrl}/verify?token=${token}`;

  if (!transporter) {
    logger.warn("EMAIL", `[SIMULATION] Superadmin onboarding email for ${email}`);
    logger.info("EMAIL", `Superadmin onboarding verify URL (no SMTP): ${verifyUrl}`);
    return { delivered: false };
  }

  try {
    const htmlContent = `
<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', Arial, sans-serif;">
  <div style="background-color: #f3f4f6; padding: 40px 20px;">
    <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
      <div style="text-align: center; padding: 32px 32px 16px 32px;">
        <h1 style="margin: 0; color: #111827; font-size: 24px; font-weight: 600;">${EMAIL_APP_NAME}</h1>
      </div>

      <div style="padding: 0 32px 32px 32px;">
        <p style="color: #374151; font-size: 16px; line-height: 1.5; margin: 0 0 16px 0;">
          Dobrý den,
        </p>
        <p style="color: #374151; font-size: 16px; line-height: 1.5; margin: 0 0 16px 0;">
          Backoffice vám vytvořil účet v aplikaci <strong style="color: #111827;">${EMAIL_APP_NAME}</strong>.
          Pro první přihlášení potřebujete aktivovat účet a použít dočasné heslo níže.
        </p>

        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; color: #111827; font-weight: 600; font-size: 14px;">Dočasné heslo</p>
          <code style="display: inline-block; background-color: #111827; color: #ffffff; padding: 10px 12px; border-radius: 6px; font-size: 16px; letter-spacing: 1px;">${tempPassword}</code>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${verifyUrl}"
             style="background-color: #5d9b62; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
            Aktivovat účet
          </a>
        </div>

        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; color: #111827; font-weight: 600; font-size: 14px;">Jak pokračovat</p>
          <ol style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.7;">
            <li>Klikněte na tlačítko pro aktivaci účtu.</li>
            <li>Po ověření se přihlaste svým e-mailem nebo uživatelským jménem a dočasným heslem.</li>
            <li>Po prvním přihlášení si heslo co nejdříve změňte.</li>
          </ol>
        </div>

        <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 24px 0 8px 0;">
          Pokud tlačítko nefunguje, zkopírujte tento odkaz do prohlížeče:
        </p>
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin-top: 8px;">
          <a href="${verifyUrl}" style="color: #5d9b62; font-size: 13px; word-break: break-all; text-decoration: none;">${verifyUrl}</a>
        </div>

        <p style="color: #9ca3af; font-size: 13px; line-height: 1.4; margin: 20px 0 0 0;">
          Pokud jste o vytvoření účtu nežádali, tento e-mail prosím ignorujte.
        </p>
      </div>
    </div>

    <div style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 16px; padding: 0 20px;">
      <p style="margin: 0;">${EMAIL_APP_FOOTER}</p>
    </div>
  </div>
</body>
</html>`;

    const textContent =
      `Dobrý den,\n\n` +
      `Backoffice vám vytvořil účet v aplikaci ${EMAIL_APP_NAME}.\n\n` +
      `Dočasné heslo: ${tempPassword}\n\n` +
      `Nejprve aktivujte účet na odkazu:\n${verifyUrl}\n\n` +
      `Poté se přihlaste svým e-mailem nebo uživatelským jménem a tímto dočasným heslem. Po prvním přihlášení si heslo změňte.`;

    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to: email,
      subject: `Aktivace účtu a dočasné heslo — ${EMAIL_APP_NAME}`,
      text: textContent,
      html: htmlContent,
    });

    logger.info("EMAIL", `Superadmin onboarding email sent to ${email}`, { messageId: info.messageId });
    return { delivered: true };
  } catch (error) {
    logger.error("EMAIL", `Failed to send superadmin onboarding email to ${email}`, { error: String(error) });
    throw error;
  }
};

export const sendPasswordResetEmail = async (email: string, token: string): Promise<void> => {
  ensureEmailTransport("Password reset");
  const frontendBaseUrl = FRONTEND_URL.endsWith("/") ? FRONTEND_URL.slice(0, -1) : FRONTEND_URL;
  const resetUrl = `${frontendBaseUrl}/reset-password?token=${token}`;

  if (!transporter) {
    logger.warn("EMAIL", `[SIMULATION] Password reset email for ${email}`);
    logger.info("EMAIL", `Password reset URL (no SMTP): ${resetUrl}`);
    return;
  }

  try {
    const htmlContent = `
<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', Arial, sans-serif;">
  <div style="background-color: #f3f4f6; padding: 40px 20px;">
    <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
      <div style="text-align: center; padding: 32px 32px 16px 32px;">
        <h1 style="margin: 0; color: #111827; font-size: 24px; font-weight: 600;">${EMAIL_APP_NAME}</h1>
      </div>

      <div style="padding: 0 32px 32px 32px;">
        <p style="color: #374151; font-size: 16px; line-height: 1.5; margin: 0 0 16px 0;">
          Dobrý den,
        </p>
        <p style="color: #374151; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">
          Obdrželi jsme žádost o nastavení nového hesla k vašemu účtu v aplikaci <strong style="color: #111827;">${EMAIL_APP_NAME}</strong>.
        </p>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetUrl}"
             style="background-color: #5d9b62; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
            Nastavit nové heslo
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 24px 0 8px 0;">
          Pokud tlačítko nefunguje, zkopírujte tento odkaz do prohlížeče:
        </p>
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin-top: 8px;">
          <a href="${resetUrl}" style="color: #5d9b62; font-size: 13px; word-break: break-all; text-decoration: none;">${resetUrl}</a>
        </div>

        <p style="color: #9ca3af; font-size: 13px; line-height: 1.4; margin: 20px 0 0 0;">
          Odkaz je platný 2 hodiny a lze jej použít pouze jednou. Pokud jste o změnu hesla nežádali, tento e-mail ignorujte.
        </p>
      </div>
    </div>

    <div style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 16px; padding: 0 20px;">
      <p style="margin: 0;">${EMAIL_APP_FOOTER}</p>
    </div>
  </div>
</body>
</html>`;

    const textContent = `Dobrý den,\n\nObdrželi jsme žádost o nastavení nového hesla k vašemu účtu v aplikaci ${EMAIL_APP_NAME}. Pokračujte zde:\n${resetUrl}\n\nOdkaz je platný 2 hodiny a lze jej použít pouze jednou. Pokud jste o změnu hesla nežádali, tento e-mail ignorujte.`;

    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to: email,
      subject: `Obnova hesla — ${EMAIL_APP_NAME}`,
      text: textContent,
      html: htmlContent,
    });

    logger.info("EMAIL", `Password reset email sent to ${email}`, { messageId: info.messageId });
  } catch (error) {
    logger.error("EMAIL", `Failed to send password reset email to ${email}`, { error: String(error) });
    throw error;
  }
};

// ─── Frost alert email ──────────────────────────────────────────────────────

export const sendFrostAlertEmail = async (
  email: string,
  username: string,
  cabinName: string,
  lowestTemp: number,
  frostDatesFormatted: string
): Promise<void> => {
  ensureEmailTransport("Frost alert");
  if (!transporter) {
    logger.warn("EMAIL", `[SIMULATION] Frost alert for ${email} — cabin "${cabinName}", lowest ${lowestTemp} °C`);
    return;
  }

  const subject = `Varování před mrazem — ${cabinName}`;

  const htmlContent = `<!DOCTYPE html>
<html lang="cs">
<head><meta charset="UTF-8" /></head>
<body style="margin: 0; padding: 20px; background-color: #f4f7f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', Arial, sans-serif;">
  <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">

    <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%); padding: 32px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 12px;">❄</div>
      <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">Pozor, hrozí mrazy!</h1>
    </div>

    <div style="padding: 32px;">
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Ahoj <strong>${username}</strong>,
      </p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
        Předpověď pro chatu <strong>${cabinName}</strong> ukazuje, že v příštích dnech klesne teplota pod bod mrazu:
      </p>

      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0 0 8px 0; font-weight: 700; color: #991b1b; font-size: 14px;">
          Nejnižší očekávaná teplota: <span style="font-size: 18px;">${lowestTemp} °C</span>
        </p>
        <p style="margin: 0; color: #991b1b; font-size: 13px;">
          Dny s mrazem: ${frostDatesFormatted}
        </p>
      </div>

      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 16px 0;">
        Pokud nemáte <strong>vypuštěnou vodu</strong> a zajištěné trubky, zvažte co nejdříve opatření, aby nedošlo k prasknutí potrubí.
      </p>

      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0 0 8px 0; font-weight: 700; color: #166534; font-size: 14px;">Co můžete udělat:</p>
        <ul style="margin: 0; padding-left: 20px; color: #166534; font-size: 13px; line-height: 1.8;">
          <li>Vypustit vodu z potrubí a bojleru</li>
          <li>Zavřít hlavní uzávěr vody</li>
          <li>Otevřít kohoutky pro odvzdušnění</li>
          <li>Označit chatu jako „zazimovanou" v aplikaci</li>
        </ul>
      </div>

      <p style="color: #9ca3af; font-size: 13px; line-height: 1.4; margin: 20px 0 0 0;">
        Toto varování posíláme maximálně jednou za 7 dní. Pokud jste vodu již vypustili,
        označte chatu jako „zazimovanou" v nastavení — upozornění se přestanou odesílat.
      </p>
    </div>
  </div>

  <div style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 16px; padding: 0 20px;">
    <p style="margin: 0;">${EMAIL_APP_FOOTER}</p>
  </div>
</body>
</html>`;

  const textContent =
    `Ahoj ${username},\n\n` +
    `Varování: Pro chatu „${cabinName}" předpověď ukazuje mrazy v příštích dnech.\n` +
    `Nejnižší teplota: ${lowestTemp} °C\n` +
    `Dny s mrazem: ${frostDatesFormatted}\n\n` +
    `Pokud nemáte vypuštěnou vodu, zvažte opatření proti prasknutí trubek.\n\n` +
    `— ${EMAIL_APP_NAME}`;

  try {
    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to: email,
      subject,
      text: textContent,
      html: htmlContent,
    });

    logger.info("EMAIL", `Frost alert sent to ${email} for cabin "${cabinName}"`, { messageId: info.messageId });
  } catch (error) {
    logger.error("EMAIL", `Failed to send frost alert to ${email}`, { error: String(error) });
    throw error;
  }
};

// ─── Backward compatibility aliases ──────────────────────────────────────────

/**
 * @deprecated Use sendVerificationEmailWithPIN instead
 */
export const sendVerificationEmail = sendVerificationEmailWithPIN;

// ─── Generic send email ──────────────────────────────────────────────────────

export const sendEmail = async (opts: { to: string; subject: string; html: string }): Promise<void> => {
  ensureEmailTransport("Transactional");
  if (!transporter) {
    logger.warn("EMAIL", `[SIMULATION] Email to ${opts.to}: ${opts.subject}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: EMAIL_FROM || DEFAULT_EMAIL_FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    logger.info("EMAIL", `Email sent to ${opts.to}`, { subject: opts.subject });
  } catch (error) {
    logger.error("EMAIL", `Failed to send email to ${opts.to}`, { error: String(error) });
    throw error;
  }
};
