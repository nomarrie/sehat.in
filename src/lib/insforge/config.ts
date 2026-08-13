export function getInsForgeConfig() {
  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
  const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;

  if (!baseUrl || !anonKey) {
    throw new Error(
      "Konfigurasi InsForge belum lengkap. Isi NEXT_PUBLIC_INSFORGE_URL dan NEXT_PUBLIC_INSFORGE_ANON_KEY.",
    );
  }

  return { baseUrl, anonKey };
}
