"use client";

import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { CaretUpIcon } from "@phosphor-icons/react/dist/ssr/CaretUp";
import { IdentificationCardIcon } from "@phosphor-icons/react/dist/ssr/IdentificationCard";
import { SignOutIcon } from "@phosphor-icons/react/dist/ssr/SignOut";
import { TargetIcon } from "@phosphor-icons/react/dist/ssr/Target";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOutAction } from "@/features/auth/actions";

export function DesktopProfileMenu({ name, email }: { name: string; email: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function dismissOnPointerDown(event: PointerEvent) {
      if (!accountRef.current?.contains(event.target as Node)) setIsOpen(false);
    }

    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", dismissOnPointerDown);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOnPointerDown);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [isOpen]);

  return (
    <div className="sidebar-account" ref={accountRef}>
      {isOpen && <div className="sidebar-profile-popover" id="sidebar-profile-menu">
        <div className="sidebar-popover-identity">
          <strong>{name}</strong>
          <small>{email}</small>
        </div>
        <nav className="sidebar-account-actions" aria-label="Menu profil">
          <ul role="list">
            <li><Link href="/profile/preferences" onClick={() => setIsOpen(false)}><IdentificationCardIcon size={18} aria-hidden="true" /><span>Preferensi pribadi</span></Link></li>
            <li><Link href="/profile/program" onClick={() => setIsOpen(false)}><TargetIcon size={18} aria-hidden="true" /><span>Data program</span></Link></li>
            <li><form action={signOutAction}><button type="submit"><SignOutIcon size={18} aria-hidden="true" /><span>Keluar</span></button></form></li>
          </ul>
        </nav>
      </div>}
      <button
        className="sidebar-profile-trigger"
        type="button"
        ref={triggerRef}
        aria-label={`${isOpen ? "Tutup" : "Buka"} menu profil ${name}`}
        aria-expanded={isOpen}
        aria-controls="sidebar-profile-menu"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="profile-initial" aria-hidden="true">{name.charAt(0).toLocaleUpperCase("id-ID")}</span>
        <span className="sidebar-profile-copy">
          <strong>{name}</strong>
          <small>Program pemula</small>
        </span>
        <span className="sidebar-profile-caret" aria-hidden="true">
          {isOpen ? <CaretUpIcon size={17} /> : <CaretDownIcon size={17} />}
        </span>
      </button>
    </div>
  );
}
