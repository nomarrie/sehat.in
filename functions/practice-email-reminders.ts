import { createAdminClient } from "npm:@insforge/sdk@1.5.2";
import { Resend } from "npm:resend@6.26.0";

type ReminderKind = "new_session" | "missed_practice";

export type ReminderCandidate = {
  delivery_id: string;
  user_id: string;
  email: string;
  full_name: string;
  reminder_date: string;
  reminder_kind: ReminderKind;
  package_id: string;
  package_name: string;
  estimated_minutes: number;
  attempt_count: number;
};

type QueryResult<T> = { data: T | null; error: { message?: string } | null };

type ReminderAdminClient = {
  database: {
    rpc: (
      name: string,
      params: Record<string, unknown>,
    ) => Promise<QueryResult<ReminderCandidate[]>>;
    from: (table: string) => {
      update: (values: Record<string, unknown>) => {
        eq: (column: string, value: string) => Promise<QueryResult<unknown>>;
      };
    };
  };
};

type ReminderResendClient = {
  emails: {
    send: (
      email: {
        from: string;
        to: string;
        subject: string;
        html: string;
        text: string;
      },
      options: { idempotencyKey: string },
    ) => Promise<{
      data: { id?: string } | null;
      error: { message?: string; name?: string } | null;
    }>;
  };
};

type ReminderEmail = {
  subject: string;
  html: string;
  text: string;
};

const jsonHeaders = { "Content-Type": "application/json" };
const defaultSender = "Sehat.in <onboarding@resend.dev>";

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

function safeAppUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function buildReminderEmail(
  candidate: ReminderCandidate,
  appUrl?: string,
): ReminderEmail {
  const name = candidate.full_name.trim() || "teman Sehat.in";
  const isNewSession = candidate.reminder_kind === "new_session";
  const subject = isNewSession
    ? "Latihan barumu sudah tersedia"
    : "Masih ada latihan yang menunggumu";
  const headline = isNewSession
    ? "Sesi latihan hari ini sudah siap"
    : "Yuk, kembali ke ritmemu";
  const message = isNewSession
    ? `Kami sudah menyiapkan ${candidate.package_name} untukmu. Cukup sisihkan sekitar ${candidate.estimated_minutes} menit saat tubuhmu terasa nyaman.`
    : `Kamu masih punya ${candidate.package_name} yang belum selesai. Tidak apa-apa bila jadwalmu sempat berubah—mulai kembali dengan langkah yang terasa ringan.`;
  const baseUrl = safeAppUrl(appUrl);
  const packageUrl = baseUrl
    ? `${baseUrl}/packages/${encodeURIComponent(candidate.package_id)}`
    : null;
  const actionText = packageUrl ? `\nBuka latihan: ${packageUrl}` : "";
  const actionHtml = packageUrl
    ? `<a href="${escapeHtml(packageUrl)}" style="display:inline-block;margin-top:20px;padding:12px 20px;border-radius:999px;background:#166534;color:#ffffff;text-decoration:none;font-weight:700">Buka latihan</a>`
    : "";

  return {
    subject,
    text: `Halo ${name},\n\n${message}${actionText}\n\nKamu dapat mematikan pengingat kapan saja melalui Pengaturan Sehat.in.`,
    html: `<!doctype html>
<html lang="id">
  <body style="margin:0;background:#f4f7f3;font-family:Arial,sans-serif;color:#183224">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px">
      <div style="background:#ffffff;border:1px solid #dfe8df;border-radius:20px;padding:32px">
        <p style="margin:0 0 20px;color:#166534;font-size:14px;font-weight:700">SEHAT.IN</p>
        <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25">${headline}</h1>
        <p style="margin:0 0 12px;line-height:1.7">Halo ${escapeHtml(name)},</p>
        <p style="margin:0;line-height:1.7">${escapeHtml(message)}</p>
        ${actionHtml}
        <p style="margin:28px 0 0;color:#647268;font-size:13px;line-height:1.6">Kamu menerima email ini karena pengingat latihan aktif. Kamu dapat mematikannya kapan saja melalui Pengaturan Sehat.in.</p>
      </div>
    </div>
  </body>
</html>`,
  };
}

function compactError(error: unknown): string {
  const raw = error instanceof Error
    ? error.message
    : typeof error === "object" && error && "message" in error
    ? String(error.message)
    : "Unknown email delivery error";
  return raw
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[EMAIL]")
    .replace(/re_[A-Za-z0-9_-]+/g, "[REDACTED]")
    .slice(0, 500);
}

async function updateDelivery(
  admin: ReminderAdminClient,
  deliveryId: string,
  values: Record<string, unknown>,
): Promise<void> {
  const result = await admin.database
    .from("practice_email_deliveries")
    .update(values)
    .eq("id", deliveryId);
  if (result.error) throw new Error(result.error.message ?? "Delivery status update failed");
}

export async function runReminderJob(options: {
  admin: ReminderAdminClient;
  resend: ReminderResendClient;
  from?: string;
  appUrl?: string;
  testRecipient?: string;
  now?: Date;
  limit?: number;
}) {
  const now = options.now ?? new Date();
  const claimResult = await options.admin.database.rpc(
    "edge_claim_due_practice_reminders",
    {
      p_now: now.toISOString(),
      p_limit: options.limit ?? 25,
      p_test_email: options.testRecipient?.trim() || null,
    },
  );
  if (claimResult.error) {
    throw new Error(claimResult.error.message ?? "Could not claim due reminders");
  }

  const candidates = claimResult.data ?? [];
  let sent = 0;
  let failed = 0;

  for (const candidate of candidates) {
    const email = buildReminderEmail(candidate, options.appUrl);
    try {
      const result = await options.resend.emails.send(
        {
          from: options.from ?? defaultSender,
          to: candidate.email,
          subject: email.subject,
          html: email.html,
          text: email.text,
        },
        { idempotencyKey: `practice-reminder/${candidate.delivery_id}` },
      );
      if (result.error || !result.data?.id) {
        throw new Error(result.error?.message ?? "Resend returned no message id");
      }
      await updateDelivery(options.admin, candidate.delivery_id, {
        status: "sent",
        provider_message_id: result.data.id,
        last_error: null,
        sent_at: new Date().toISOString(),
      });
      sent += 1;
    } catch (error) {
      failed += 1;
      try {
        await updateDelivery(options.admin, candidate.delivery_id, {
          status: "failed",
          provider_message_id: null,
          last_error: compactError(error),
          sent_at: null,
        });
      } catch (statusError) {
        console.error("Reminder delivery status update failed", compactError(statusError));
      }
    }
  }

  return { claimed: candidates.length, sent, failed };
}

function env(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...jsonHeaders, Allow: "POST" },
    });
  }

  try {
    const cronSecret = env("REMINDER_CRON_SECRET");
    if (req.headers.get("Authorization") !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const admin = createAdminClient({
      baseUrl: env("INSFORGE_BASE_URL"),
      apiKey: env("API_KEY"),
    }) as unknown as ReminderAdminClient;
    const resend = new Resend(env("RESEND_API_KEY")) as unknown as ReminderResendClient;
    const result = await runReminderJob({
      admin,
      resend,
      from: Deno.env.get("RESEND_FROM")?.trim() || defaultSender,
      appUrl: Deno.env.get("APP_URL"),
      testRecipient: Deno.env.get("RESEND_TEST_RECIPIENT"),
    });

    return new Response(JSON.stringify(result), { status: 200, headers: jsonHeaders });
  } catch (error) {
    console.error("Practice reminder job failed", compactError(error));
    return new Response(JSON.stringify({ error: "Reminder job failed" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
}
