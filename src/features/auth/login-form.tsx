"use client";

import { useActionState, useTransition } from "react";
import { SignInPage } from "@/components/ui/sign-in";
import { initiateOAuth, signInAction } from "./actions";

export function LoginForm({ notice }: { notice?: string }) {
  const [state, action, pending] = useActionState(signInAction, {});
  const [oauthPending, startOAuthTransition] = useTransition();

  function startOAuth(provider: "google" | "facebook", rememberMe: boolean) {
    startOAuthTransition(() => {
      void initiateOAuth(provider, rememberMe);
    });
  }

  return (
    <SignInPage
      notice={notice}
      state={state}
      pending={pending || oauthPending}
      formAction={action}
      onGoogleSignIn={(rememberMe) => startOAuth("google", rememberMe)}
      onFacebookSignIn={(rememberMe) => startOAuth("facebook", rememberMe)}
    />
  );
}
