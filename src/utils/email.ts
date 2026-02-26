import nodemailer from "nodemailer";
import logger from "./logger";
import { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } from "../config/config";

const createTransporter = () => {
    if (!SMTP_HOST || (!SMTP_USER && !SMTP_PASS)) {
        logger.warn("EMAIL", "SMTP credentials are not fully configured. Emails will not be sent.");
        return null;
    }

    return nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
        },
    });
};

const transporter = createTransporter();

export const sendVerificationEmail = async (email: string, code: string) => {
    if (!transporter) {
        logger.warn("EMAIL", `Simulation: verification email for ${email} with code ${code}`);
        return;
    }

    try {
        const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
        <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333333; margin-bottom: 20px;">Ověření e-mailu</h2>
          <p style="color: #555555; line-height: 1.5;">
            Dobrý den,<br><br>
            Váš ověřovací kód pro dokončení registrace do aplikace Chata je:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #2a9d8f; letter-spacing: 5px; padding: 10px 20px; border: 2px dashed #2a9d8f; border-radius: 8px;">
              ${code}
            </span>
          </div>
          <p style="color: #555555; line-height: 1.5;">
            Tento kód zadejte do příslušného pole v aplikaci.<br><br>
            Pokud jste o registraci nežádali, tento e-mail prosím ignorujte.
          </p>
          <hr style="border: none; border-top: 1px solid #eeeeee; margin: 30px 0;">
          <p style="color: #999999; font-size: 12px; text-align: center;">
            Odesláno z aplikace Chata Reservation App.
          </p>
        </div>
      </div>
    `;

        const info = await transporter.sendMail({
            from: SMTP_FROM,
            to: email,
            subject: "Ověření e-mailu - Chata",
            text: `Dobrý den, váš ověřovací kód je: ${code}. Zadejte ho do aplikace.`,
            html: htmlContent,
        });

        logger.info("EMAIL", `Verification email sent to ${email}`, { messageId: info.messageId });
    } catch (error) {
        logger.error("EMAIL", `Failed to send verification email to ${email}`, { error: String(error) });
        throw error;
    }
};
