export function getBackendErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const message = String(error.message);
    if (/authentication required|unauthorized/i.test(message)) {
      return "Sesi kamu sudah berakhir. Silakan masuk kembali.";
    }
    if (/duplicate|already exists/i.test(message)) {
      return "Data tersebut sudah tersedia.";
    }
  }
  return fallback;
}
