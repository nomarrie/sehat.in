import { describe, expect, it, vi } from "vitest";
import {
  buildReminderEmail,
  runReminderJob,
  type ReminderCandidate,
} from "./practice-email-reminders";

const candidate: ReminderCandidate = {
  delivery_id: "266fcdb8-5c93-4d2d-acf7-aa55283dbd71",
  user_id: "4796912a-50b9-4d4a-801b-3bb1dbc1e14c",
  email: "naila@example.com",
  full_name: "Naila <Putri>",
  reminder_date: "2026-09-05",
  reminder_kind: "new_session",
  package_id: "2f97f29f-1960-4973-af8d-31f475b26371",
  package_name: "Latihan Hari Ini",
  estimated_minutes: 30,
  attempt_count: 1,
};

function adminWithCandidates(candidates: ReminderCandidate[]) {
  const updates: Array<Record<string, unknown>> = [];
  const eq = vi.fn(async () => ({ data: null, error: null }));
  const update = vi.fn((values: Record<string, unknown>) => {
    updates.push(values);
    return { eq };
  });
  return {
    updates,
    client: {
      database: {
        rpc: vi.fn(async () => ({ data: candidates, error: null })),
        from: vi.fn(() => ({ update })),
      },
    },
  };
}

describe("practice reminder emails", () => {
  it("builds a safe localized new-session email with a package link", () => {
    const email = buildReminderEmail(candidate, "https://sehat.example/");

    expect(email.subject).toBe("Latihan barumu sudah tersedia");
    expect(email.text).toContain("Latihan Hari Ini");
    expect(email.text).toContain(`/packages/${candidate.package_id}`);
    expect(email.html).toContain("Naila &lt;Putri&gt;");
    expect(email.html).not.toContain("Naila <Putri>");
  });

  it("uses supportive missed-practice copy", () => {
    const email = buildReminderEmail({
      ...candidate,
      reminder_kind: "missed_practice",
    });

    expect(email.subject).toBe("Masih ada latihan yang menunggumu");
    expect(email.text).toContain("Tidak apa-apa bila jadwalmu sempat berubah");
  });

  it("sends claimed reminders idempotently and records provider ids", async () => {
    const admin = adminWithCandidates([candidate]);
    const send = vi.fn(async () => ({
      data: { id: "email_123" },
      error: null,
    }));

    const result = await runReminderJob({
      admin: admin.client,
      resend: { emails: { send } },
      from: "Sehat.in <onboarding@resend.dev>",
      testRecipient: "naila@example.com",
      now: new Date("2026-09-05T10:30:00.000Z"),
    });

    expect(result).toEqual({ claimed: 1, sent: 1, failed: 0 });
    expect(admin.client.database.rpc).toHaveBeenCalledWith(
      "edge_claim_due_practice_reminders",
      expect.objectContaining({ p_test_email: "naila@example.com" }),
    );
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ to: "naila@example.com" }),
      { idempotencyKey: `practice-reminder/${candidate.delivery_id}` },
    );
    expect(admin.updates).toContainEqual(expect.objectContaining({
      status: "sent",
      provider_message_id: "email_123",
    }));
  });

  it("records a failed delivery without exposing the recipient email", async () => {
    const admin = adminWithCandidates([candidate]);
    const send = vi.fn(async () => ({
      data: null,
      error: { message: "Cannot send to naila@example.com" },
    }));

    const result = await runReminderJob({
      admin: admin.client,
      resend: { emails: { send } },
      now: new Date("2026-09-05T10:30:00.000Z"),
    });

    expect(result).toEqual({ claimed: 1, sent: 0, failed: 1 });
    expect(admin.updates).toContainEqual(expect.objectContaining({
      status: "failed",
      last_error: "Cannot send to [EMAIL]",
    }));
  });
});
