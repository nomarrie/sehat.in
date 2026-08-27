"use client";

import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { IdentificationCardIcon } from "@phosphor-icons/react/dist/ssr/IdentificationCard";
import { SignOutIcon } from "@phosphor-icons/react/dist/ssr/SignOut";
import { TargetIcon } from "@phosphor-icons/react/dist/ssr/Target";
import Link from "next/link";
import type { ProfileSettings } from "@/features/settings/settings.types";
import { signOutAction } from "@/features/auth/actions";

export function ProfileOverview({ profile }: { profile: ProfileSettings }) {
  return (
    <div className="settings-page profile-page">
      <header className="profile-hero">
        <span className="profile-avatar" aria-hidden="true">{profile.fullName.charAt(0)}</span>
        <div><span className="eyebrow">Akun saya</span><h1>{profile.fullName}</h1><p>{profile.email}</p></div>
      </header>
      <section className="profile-actions" aria-label="Kelola profil">
        <Link href="/profile/preferences" className="profile-action-card">
          <span className="settings-section-icon"><IdentificationCardIcon size={24} /></span>
          <span><strong>Preferensi pribadi</strong><small>Kelola nama, email, usia, dan pengingat.</small></span>
          <ArrowRightIcon size={20} aria-hidden="true" />
        </Link>
        <Link href="/profile/program" className="profile-action-card">
          <span className="settings-section-icon"><TargetIcon size={24} /></span>
          <span><strong>Data program</strong><small>Atur tinggi, berat, target, aktivitas, dan makanan.</small></span>
          <ArrowRightIcon size={20} aria-hidden="true" />
        </Link>
        <form action={signOutAction}><button className="profile-action-card profile-logout" type="submit">
          <span className="settings-section-icon"><SignOutIcon size={24} /></span>
          <span><strong>Keluar</strong><small>Akhiri sesi akun Sehat.in.</small></span>
          <ArrowRightIcon size={20} aria-hidden="true" />
        </button></form>
      </section>
    </div>
  );
}
