import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RegisterPage } from "./register";

const baseProps = {
  formAction: vi.fn(),
  verificationAction: vi.fn(),
  pending: false,
  verifying: false,
};

describe("RegisterPage", () => {
  it("renders registration inside the shared auth experience", () => {
    render(<RegisterPage {...baseProps} />);

    expect(screen.getByRole("heading", { name: "Mulai dengan satu langkah" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Nama lengkap" })).toHaveAttribute("autocomplete", "name");
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveAttribute("autocomplete", "username");
    expect(screen.getByLabelText("Kata sandi")).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getByRole("link", { name: "Masuk" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("complementary", { name: "Cara Sehat.in mendampingi programmu" })).toBeInTheDocument();
  });

  it("toggles new-password visibility with an accessible control", async () => {
    const user = userEvent.setup();
    render(<RegisterPage {...baseProps} />);

    const password = screen.getByLabelText("Kata sandi");
    expect(password).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Tampilkan kata sandi" }));
    expect(password).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Sembunyikan kata sandi" })).toBeInTheDocument();
  });

  it("shows field errors without clearing entered registration details", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<RegisterPage {...baseProps} />);

    const name = screen.getByRole("textbox", { name: "Nama lengkap" });
    const email = screen.getByRole("textbox", { name: "Email" });
    await user.type(name, "Naila");
    await user.type(email, "naila@example.com");

    rerender(
      <RegisterPage
        {...baseProps}
        state={{
          message: "Periksa kembali data pendaftaran kamu.",
          errors: {
            email: ["Masukkan alamat email yang valid."],
            password: ["Kata sandi minimal 8 karakter.", "Gunakan setidaknya satu angka."],
          },
        }}
      />,
    );

    expect(name).toHaveValue("Naila");
    expect(email).toHaveValue("naila@example.com");
    expect(screen.getByText("Masukkan alamat email yang valid.")).toBeInTheDocument();
    expect(screen.getByText("Kata sandi minimal 8 karakter.")).toBeInTheDocument();
    expect(screen.getByText("Gunakan setidaknya satu angka.")).toBeInTheDocument();
    expect(screen.getByRole("alert", { name: "Peringatan pendaftaran" })).toHaveTextContent(
      "Periksa kembali data pendaftaran kamu.",
    );
  });

  it("renders the animated verification state after signup", () => {
    render(
      <RegisterPage
        {...baseProps}
        state={{
          verificationEmail: "naila@example.com",
          message: "Kami mengirim kode 6 digit ke email kamu.",
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Periksa email kamu" })).toBeInTheDocument();
    expect(screen.getByText(/naila@example.com/)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Kode verifikasi" })).toHaveAttribute(
      "autocomplete",
      "one-time-code",
    );
    expect(screen.getByRole("button", { name: "Verifikasi dan lanjutkan" })).toBeEnabled();
    expect(screen.queryByRole("textbox", { name: "Nama lengkap" })).not.toBeInTheDocument();
  });
});
