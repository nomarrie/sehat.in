import { BarbellIcon } from "@phosphor-icons/react/dist/ssr/Barbell";
import { HeartbeatIcon } from "@phosphor-icons/react/dist/ssr/Heartbeat";
import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import { ForkKnifeIcon } from "@phosphor-icons/react/dist/ssr/ForkKnife";
import { ChatCircleDotsIcon } from "@phosphor-icons/react/dist/ssr/ChatCircleDots";
import { UserCircleIcon } from "@phosphor-icons/react/dist/ssr/UserCircle";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/guards";
import { DesktopProfileMenu } from "./desktop-profile-menu";

export type AppShellProps = {
  activePath: "/dashboard" | "/packages" | "/food" | "/chat" | "/profile";
  children: React.ReactNode;
};

const navigation = [
  {
    href: "/dashboard",
    activePath: "/dashboard" as const,
    label: "Dashboard",
    icon: HouseIcon,
  },
  {
    href: "/packages/latihan-hari-ini",
    activePath: "/packages" as const,
    label: "Latihan",
    icon: BarbellIcon,
  },
  {
    href: "/food",
    activePath: "/food" as const,
    label: "Makanan",
    icon: ForkKnifeIcon,
  },
  {
    href: "/chat",
    activePath: "/chat" as const,
    label: "Chat",
    icon: ChatCircleDotsIcon,
  },
  {
    href: "/profile",
    activePath: "/profile" as const,
    label: "Profil",
    icon: UserCircleIcon,
  },
];

function Brand() {
  return (
    <Link className="brand" href="/dashboard" aria-label="Sehat.in, dashboard">
      <span className="brand-mark" aria-hidden="true">
        <HeartbeatIcon size={22} weight="bold" />
      </span>
      <span>Sehat.in</span>
    </Link>
  );
}

function NavigationLinks({ activePath, includeProfile = true }: Pick<AppShellProps, "activePath"> & { includeProfile?: boolean }) {
  const items = includeProfile ? navigation : navigation.filter((item) => item.activePath !== "/profile");
  return (
    <ul role="list">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activePath === item.activePath;

        return (
          <li key={item.activePath}>
            <Link
              href={item.href}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={22} weight={isActive ? "fill" : "regular"} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export async function AppShell({ activePath, children }: AppShellProps) {
  const { user, profile } = await requireOnboardedUser();
  const name = String(profile.full_name);
  const initial = name.charAt(0).toLocaleUpperCase("id-ID") || "S";
  return (
    <div className="app-frame">
      <a className="skip-link" href="#main-content">
        Lewati ke konten utama
      </a>

      <header className="mobile-topbar">
        <Brand />
        <Link className="profile-initial" href="/profile" aria-label={`Profil ${name}`}>
          {initial}
        </Link>
      </header>

      <aside className="desktop-sidebar" aria-label="Navigasi utama">
        <Brand />
        <nav aria-label="Menu aplikasi">
          <NavigationLinks activePath={activePath} includeProfile={false} />
        </nav>
        <DesktopProfileMenu name={name} email={user.email ?? ""} />
      </aside>

      <main id="main-content" className="app-content" tabIndex={-1}>
        {children}
      </main>

      <nav className="mobile-navigation" aria-label="Navigasi utama">
        <NavigationLinks activePath={activePath} />
      </nav>
    </div>
  );
}
