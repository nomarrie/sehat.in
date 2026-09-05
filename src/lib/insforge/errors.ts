export function isAuthenticationError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  if ("statusCode" in error && Number(error.statusCode) === 401) return true;
  if ("error" in error && /auth_(?:unauthorized|token_expired)|unauthorized/i.test(String(error.error))) {
    return true;
  }
  return "message" in error
    && /authentication required|token expired|unauthorized/i.test(String(error.message));
}

export function getBackendErrorMessage(error: unknown, fallback: string) {
  if (isAuthenticationError(error)) {
    return "Sesi kamu sudah berakhir. Silakan masuk kembali.";
  }
  if (error && typeof error === "object" && "message" in error) {
    const message = String(error.message);
    if (/duplicate|already exists/i.test(message)) {
      return "Data tersebut sudah tersedia.";
    }
  }
  return fallback;
}
