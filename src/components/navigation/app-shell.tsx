import { BarbellIcon } from "@phosphor-icons/react/dist/ssr/Barbell";
import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import { ForkKnifeIcon } from "@phosphor-icons/react/dist/ssr/ForkKnife";
import { ChatCircleDotsIcon } from "@phosphor-icons/react/dist/ssr/ChatCircleDots";
import { UserCircleIcon } from "@phosphor-icons/react/dist/ssr/UserCircle";
import Link from "next/link";
import { cookies } from "next/headers";
import { requireOnboardedUser } from "@/lib/auth/guards";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppBrand } from "./app-brand";
import { AppSidebar } from "./app-sidebar";

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
  const [{ user, profile }, cookieStore] = await Promise.all([
    requireOnboardedUser(),
    cookies(),
  ]);
  const defaultSidebarOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const name = String(profile.full_name);
  const initial = name.charAt(0).toLocaleUpperCase("id-ID") || "S";
  return (
    <SidebarProvider
      className="app-frame"
      defaultOpen={defaultSidebarOpen}
      style={{
        "--sidebar-width": "15.5rem",
        "--sidebar-width-icon": "4rem",
      } as React.CSSProperties}
    >
      <a className="skip-link" href="#main-content">
        Lewati ke konten utama
      </a>

      <AppSidebar activePath={activePath} name={name} email={user.email ?? ""} />

      <div className="app-viewport">
        <header className="mobile-topbar">
          <AppBrand />
          <Link className="profile-initial" href="/profile" aria-label={`Profil ${name}`}>
            {initial}
          </Link>
        </header>

        <main id="main-content" className="app-content" tabIndex={-1}>
          {children}
        </main>
      </div>

      <nav className="mobile-navigation" aria-label="Navigasi utama">
        <NavigationLinks activePath={activePath} />
      </nav>
    </SidebarProvider>
  );
}
