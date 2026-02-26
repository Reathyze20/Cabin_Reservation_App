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
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#d97706 0%,#b45309 100%);padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Chata Třebenice</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Ověření e-mailové adresy</p>
    </div>

    <!-- Body -->
    <div style="padding:32px 24px;">
      <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 24px;">
        Dobrý den,<br><br>
        děkujeme za registraci do aplikace <strong>Chata Třebenice</strong>.
        Pro aktivaci účtu prosím klikněte na tlačítko níže:
      </p>

      <!-- CTA Button -->
      <div style="text-align:center;margin:32px 0;">
        <a href="${verifyUrl}"
           style="display:inline-block;background:#d97706;color:#ffffff;text-decoration:none;
                  padding:14px 40px;border-radius:8px;font-size:16px;font-weight:600;
                  box-shadow:0 2px 8px rgba(217,119,6,0.3);">
          Aktivovat účet
        </a>
      </div>

      <p style="color:#6b7280;font-size:14px;line-height:1.5;margin:0 0 16px;">
        Pokud tlačítko nefunguje, zkopírujte tento odkaz do prohlížeče:
      </p>
      <p style="word-break:break-all;background:#f9fafb;padding:12px;border-radius:6px;
                font-size:13px;color:#4b5563;border:1px solid #e5e7eb;margin:0 0 24px;">
        ${verifyUrl}
      </p>

      <p style="color:#9ca3af;font-size:13px;line-height:1.5;margin:0;">
        Pokud jste o registraci nežádali, tento e-mail prosím ignorujte.
        Odkaz je platný jednorázově.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">
        Odesláno z aplikace Chata Třebenice &bull; kdynachatu.cz
      </p>
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
