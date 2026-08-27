"use client";

import { BarbellIcon } from "@phosphor-icons/react/dist/ssr/Barbell";
import { ChatCircleDotsIcon } from "@phosphor-icons/react/dist/ssr/ChatCircleDots";
import { ForkKnifeIcon } from "@phosphor-icons/react/dist/ssr/ForkKnife";
import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import Link from "next/link";
import type { AppShellProps } from "./app-shell";
import { AppBrand } from "./app-brand";
import { DesktopProfileMenu } from "./desktop-profile-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const desktopNavigation = [
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
];

type AppSidebarProps = Pick<AppShellProps, "activePath"> & {
  name: string;
  email: string;
};

export function AppSidebar({ activePath, name, email }: AppSidebarProps) {
  return (
    <Sidebar
      aria-label="Navigasi utama"
      className="sehatin-sidebar"
      collapsible="icon"
      mobileBehavior="hidden"
      role="complementary"
    >
      <SidebarHeader className="sehatin-sidebar-header">
        <div className="sehatin-sidebar-brand-row">
          <AppBrand className="sehatin-sidebar-brand" />
          <SidebarTrigger
            aria-label="Perkecil atau perluas sidebar"
            className="sehatin-sidebar-trigger"
            title="Perkecil atau perluas sidebar"
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <nav aria-label="Menu aplikasi">
              <SidebarMenu>
                {desktopNavigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = activePath === item.activePath;

                  return (
                    <SidebarMenuItem key={item.activePath}>
                      <SidebarMenuButton
                        asChild
                        className="sehatin-sidebar-link"
                        isActive={isActive}
                        size="lg"
                        tooltip={item.label}
                      >
                        <Link
                          href={item.href}
                          aria-current={isActive ? "page" : undefined}
                        >
                          <Icon
                            aria-hidden="true"
                            size={20}
                            weight={isActive ? "fill" : "regular"}
                          />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="sehatin-sidebar-footer">
        <SidebarSeparator className="mx-0" />
        <DesktopProfileMenu name={name} email={email} />
      </SidebarFooter>

    </Sidebar>
  );
}
