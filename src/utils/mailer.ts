/* ============================================================================
   utils/mailer.ts — Email sending via Resend API
   ============================================================================ */

import { Resend } from "resend";
import logger from "./logger";
import { RESEND_API_KEY, EMAIL_FROM, FRONTEND_URL } from "../config/config";

// ─── Resend client singleton ─────────────────────────────────────────────────

let resend: Resend | null = null;

if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
} else {
  logger.warn(
    "MAILER",
    "RESEND_API_KEY is not configured — verification emails will be logged but NOT sent."
  );
}

// ─── Send verification e-mail (token-based link) ─────────────────────────────

export async function sendVerificationEmail(
  to: string,
  token: string
): Promise<void> {
  const verifyUrl = `${FRONTEND_URL}/#/verify?token=${token}`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', Arial, sans-serif;">
  <div style="background-color: #f3f4f6; padding: 40px 20px;">
    
    <!-- Hlavní bílý kontejner -->
    <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
      
      <!-- Čistá hlavička bez barevného pozadí -->
      <div style="text-align: center; padding: 32px 32px 16px 32px;">
        <div style="font-size: 48px; margin-bottom: 12px;">🏡</div>
        <h1 style="margin: 0; color: #111827; font-size: 24px; font-weight: 600;">Chata Třebenice</h1>
      </div>

      <!-- Tělo zprávy -->
      <div style="padding: 0 32px 32px 32px;">
        <p style="color: #374151; font-size: 16px; line-height: 1.5; margin: 0 0 16px 0;">
          Dobrý den,
        </p>
        <p style="color: #374151; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">
          Děkujeme za registraci do aplikace <strong style="color: #111827;">Chata Třebenice</strong>. 
          Pro aktivaci účtu prosím klikněte na tlačítko níže:
        </p>

        <!-- CTA tlačítko -->
        <div style="text-align: center; margin: 24px 0;">
          <a href="${verifyUrl}" 
             style="background-color: #5d9b62; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
            Aktivovat účet
          </a>
        </div>

        <!-- Záložní odkaz -->
        <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 24px 0 8px 0;">
          Pokud tlačítko nefunguje, zkopírujte tento odkaz do prohlížeče:
        </p>
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin-top: 8px;">
          <a href="${verifyUrl}" style="color: #5d9b62; font-size: 13px; word-break: break-all; text-decoration: none;">${verifyUrl}</a>
        </div>

        <!-- Poznámka o ignorování -->
        <p style="color: #9ca3af; font-size: 13px; line-height: 1.4; margin: 20px 0 0 0;">
          Pokud jste o registraci nežádali, tento e-mail prosím ignorujte. Odkaz je platný jednorázově.
        </p>
      </div>
    </div>

    <!-- Patička mimo bílý box -->
    <div style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 16px; padding: 0 20px;">
      <p style="margin: 0;">Odesláno z aplikace Chata Třebenice • kdynachatu.cz</p>
    </div>
  </div>
</body>
</html>`;

  const textContent = `Dobrý den,\n\nPro aktivaci účtu v aplikaci Chata Třebenice klikněte na tento odkaz:\n${verifyUrl}\n\nPokud jste o registraci nežádali, tento e-mail ignorujte.`;

  if (!resend) {
    logger.warn(
      "MAILER",
      `[SIMULATION] Verification email for ${to} — token: ${token}`
    );
    logger.info("MAILER", `Verify URL (no Resend API key): ${verifyUrl}`);
    return;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject: "Ověření e-mailu — Chata Třebenice",
      text: textContent,
      html: htmlContent,
    });

    if (error) {
      logger.error("MAILER", `Resend API error for ${to}`, {
        error: JSON.stringify(error),
      });
      throw new Error(`Resend error: ${error.message}`);
    }

    logger.info("MAILER", `Verification email sent to ${to}`, {
      emailId: data?.id,
    });
  } catch (error) {
    logger.error("MAILER", `Failed to send verification email to ${to}`, {
      error: String(error),
    });
    throw error;
  }
}
