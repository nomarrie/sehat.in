import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SignInPage } from "./sign-in";

const baseProps = {
  formAction: vi.fn(),
  onGoogleSignIn: vi.fn(),
  onFacebookSignIn: vi.fn(),
  pending: false,
};

describe("SignInPage", () => {
  it("renders the localized sign-in experience and account routes", () => {
    render(<SignInPage {...baseProps} />);

    expect(screen.getByRole("heading", { name: "Selamat datang kembali" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveAttribute(
      "autocomplete",
      "username",
    );
    expect(screen.getByLabelText("Kata sandi")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
    expect(screen.getByRole("link", { name: "Lupa kata sandi?" })).toHaveAttribute(
      "href",
      "/reset-password",
    );
    expect(screen.getByRole("link", { name: "Daftar sekarang" })).toHaveAttribute(
      "href",
      "/register",
    );
  });

  it("toggles password visibility with an accessible control", async () => {
    const user = userEvent.setup();
    render(<SignInPage {...baseProps} />);

    const password = screen.getByLabelText("Kata sandi");
    expect(password).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Tampilkan kata sandi" }));
    expect(password).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Sembunyikan kata sandi" })).toBeInTheDocument();
  });

  it("shows validation and notice states from the existing auth action", () => {
    render(
      <SignInPage
        {...baseProps}
        notice="Kata sandi berhasil diperbarui."
        state={{
          message: "Periksa kembali data masuk kamu.",
          errors: { email: ["Masukkan alamat email yang valid."], password: ["Kata sandi wajib diisi."] },
        }}
      />,
    );

    expect(screen.getByRole("status", { name: "Pemberitahuan akun" })).toHaveTextContent(
      "Kata sandi berhasil diperbarui.",
    );
    expect(screen.getByText("Masukkan alamat email yang valid.")).toBeInTheDocument();
    expect(screen.getByText("Kata sandi wajib diisi.")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Status masuk" })).toHaveTextContent(
      "Periksa kembali data masuk kamu.",
    );
  });

  it("invokes the existing OAuth handlers and reflects pending state", async () => {
    const user = userEvent.setup();
    const onGoogleSignIn = vi.fn();
    const onFacebookSignIn = vi.fn();
    const { rerender } = render(
      <SignInPage
        {...baseProps}
        onGoogleSignIn={onGoogleSignIn}
        onFacebookSignIn={onFacebookSignIn}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Lanjutkan dengan Google" }));
    await user.click(screen.getByRole("button", { name: "Lanjutkan dengan Facebook" }));
    expect(
      screen.getByRole("button", { name: "Lanjutkan dengan Google" }).querySelector("img"),
    ).toHaveAttribute("src", "/images/auth/google.svg");
    expect(
      screen.getByRole("button", { name: "Lanjutkan dengan Facebook" }).querySelector("img"),
    ).toHaveAttribute("src", "/images/auth/facebook.svg");
    expect(onGoogleSignIn).toHaveBeenCalledOnce();
    expect(onFacebookSignIn).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Lanjutkan dengan GitHub" })).not.toBeInTheDocument();

    rerender(<SignInPage {...baseProps} pending />);
    expect(screen.getByRole("button", { name: "Memeriksa akun…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Lanjutkan dengan Google" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Lanjutkan dengan Facebook" })).toBeDisabled();
  });
});
