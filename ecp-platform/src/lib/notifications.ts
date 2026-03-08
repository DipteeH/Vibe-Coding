import nodemailer from "nodemailer";
import type { SavedQuoteSummary } from "@/domain/ecp/types";

const defaultBaseUrl = process.env.AUTH_BASE_URL?.trim() || "http://127.0.0.1:3000";

function createTransport() {
  const host = process.env.EMAIL_SERVER_HOST?.trim();
  const port = Number(process.env.EMAIL_SERVER_PORT ?? 587);
  const user = process.env.EMAIL_SERVER_USER?.trim();
  const pass = process.env.EMAIL_SERVER_PASSWORD?.trim();

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  return nodemailer.createTransport({ jsonTransport: true });
}

function buildConfigurationLink(id: string) {
  return `${defaultBaseUrl}/saved-configurations/${id}`;
}

export async function sendConfigurationConfirmationEmail(input: {
  action: "created" | "updated";
  summary: SavedQuoteSummary;
}) {
  const fromAddress = process.env.EMAIL_FROM?.trim() || "noreply@ecp-platform.local";
  const transport = createTransport();
  const subject =
    input.action === "created"
      ? `ECP configuration saved for ${input.summary.customerName}`
      : `ECP configuration updated for ${input.summary.customerName}`;

  const configurationLink = buildConfigurationLink(input.summary.id);
  const text = [
    `Hello,`,
    "",
    `Your ${input.summary.pathType === "ORDER" ? "order" : "quote"} configuration has been ${input.action}.`,
    `Customer / account: ${input.summary.customerName}`,
    `Model: ${input.summary.modelCode}`,
    `Total: ${input.summary.currency} ${(input.summary.totalPriceCents / 100).toFixed(2)}`,
    `Access it here: ${configurationLink}`,
  ].join("\n");

  await transport.sendMail({
    from: fromAddress,
    to: input.summary.notificationEmail,
    subject,
    text,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
        <h2 style="margin:0 0 12px">Enterprise Car Configuration Platform</h2>
        <p>Your ${input.summary.pathType === "ORDER" ? "order" : "quote"} configuration has been <strong>${input.action}</strong>.</p>
        <ul>
          <li><strong>Customer / account:</strong> ${input.summary.customerName}</li>
          <li><strong>Model:</strong> ${input.summary.modelCode}</li>
          <li><strong>Total:</strong> ${input.summary.currency} ${(input.summary.totalPriceCents / 100).toFixed(2)}</li>
        </ul>
        <p><a href="${configurationLink}">Open saved configuration</a></p>
      </div>
    `,
  });
}

export async function sendPhoneVerificationCode(input: { phoneNumber: string; code: string }) {
  const webhookUrl = process.env.PHONE_AUTH_WEBHOOK_URL?.trim();
  const devMode = process.env.PHONE_AUTH_DEV_MODE?.trim() !== "false";

  if (webhookUrl) {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.PHONE_AUTH_WEBHOOK_TOKEN
          ? { Authorization: `Bearer ${process.env.PHONE_AUTH_WEBHOOK_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({
        phoneNumber: input.phoneNumber,
        code: input.code,
        message: `Your ECP sign-in verification code is ${input.code}`,
      }),
    });

    if (!response.ok) {
      throw new Error("Unable to send phone verification code.");
    }

    return { delivery: "webhook" as const };
  }

  if (devMode) {
    console.info(`[ECP auth] Verification code for ${input.phoneNumber}: ${input.code}`);
    return { delivery: "dev" as const, devCode: input.code };
  }

  throw new Error("Phone authentication delivery is not configured.");
}