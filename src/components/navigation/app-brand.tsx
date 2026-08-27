import { HeartbeatIcon } from "@phosphor-icons/react/dist/ssr/Heartbeat";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function AppBrand({ className }: { className?: string }) {
  return (
    <Link className={cn("brand", className)} href="/dashboard" aria-label="Sehat.in, dashboard">
      <span className="brand-mark" aria-hidden="true">
        <HeartbeatIcon size={22} weight="bold" />
      </span>
      <span className="brand-name">Sehat.in</span>
    </Link>
  );
}
