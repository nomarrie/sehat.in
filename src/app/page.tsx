import { redirect } from "next/navigation";
import { getOptionalAuthContext } from "@/lib/auth/guards";

export default async function HomePage() {
  const context = await getOptionalAuthContext();
  redirect(context.user ? (context.profile ? "/dashboard" : "/onboarding") : "/login");
}
