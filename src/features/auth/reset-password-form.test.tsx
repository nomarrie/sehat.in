import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions", () => ({
  requestPasswordResetAction: vi.fn(),
  verifyPasswordResetCodeAction: vi.fn(),
  resetPasswordAction: vi.fn(),
}));

import { ResetPasswordFormView } from "./reset-password-form";

const actions = {
  requestAction: vi.fn(),
  verificationAction: vi.fn(),
  resetAction: vi.fn(),
};

describe("ResetPasswordFormView", () => {
  it("renders the recovery request inside the animated login experience", () => {
    render(
      <ResetPasswordFormView
        {...actions}
        state={{}}
        requesting={false}
        verifying={false}
        resetting={false}
      />,
    );

    expect(screen.getByRole("heading", { name: "Pulihkan akses akun" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Cara Sehat.in mendampingi programmu" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Kembali masuk" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("textbox", { name: "Email akun" })).toHaveAttribute("placeholder", "nama@email.com");
    expect(screen.getByRole("textbox", { name: "Email akun" }).parentElement).toHaveClass(
      "sign-in-field",
      "sign-in-reveal",
      "sign-in-delay-5",
    );
    expect(screen.getByRole("button", { name: "Kirim kode pemulihan" })).toHaveClass(
      "sign-in-reveal",
      "sign-in-delay-6",
    );
  });

  it("asks only for the recovery code before verification", () => {
    render(
      <ResetPasswordFormView
        {...actions}
        state={{
          passwordResetStep: "verify",
          verificationEmail: "naila@example.com",
          message: "Kode pemulihan sudah dikirim.",
        }}
        requesting={false}
        verifying={false}
        resetting={false}
      />,
    );

    expect(screen.getByRole("heading", { name: "Periksa email kamu" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("naila@example.com");
    expect(screen.getByRole("textbox", { name: "Kode pemulihan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Verifikasi kode" })).toBeEnabled();
    expect(screen.queryByLabelText("Kata sandi baru")).not.toBeInTheDocument();
  });

  it("asks for and can independently reveal the new password and its confirmation", async () => {
    const user = userEvent.setup();
    render(
      <ResetPasswordFormView
        {...actions}
        state={{
          passwordResetStep: "password",
          verificationEmail: "naila@example.com",
          message: "Kode berhasil diverifikasi.",
        }}
        requesting={false}
        verifying={false}
        resetting={false}
      />,
    );

    expect(screen.getByRole("heading", { name: "Buat kata sandi baru" })).toBeInTheDocument();
    const password = screen.getByLabelText("Kata sandi baru");
    const confirmation = screen.getByLabelText("Konfirmasi kata sandi baru");
    expect(password).toHaveAttribute("type", "password");
    expect(confirmation).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Tampilkan kata sandi baru" }));
    expect(password).toHaveAttribute("type", "text");
    expect(confirmation).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Tampilkan konfirmasi kata sandi" }));
    expect(confirmation).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Perbarui kata sandi" })).toBeEnabled();
    expect(screen.queryByRole("textbox", { name: "Kode pemulihan" })).not.toBeInTheDocument();
  });
});
