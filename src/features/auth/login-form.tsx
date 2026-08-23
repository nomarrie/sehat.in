"use client";

import { useActionState, useTransition } from "react";
import { SignInPage } from "@/components/ui/sign-in";
import { initiateOAuth, signInAction } from "./actions";

export function LoginForm({ notice }: { notice?: string }) {
  const [state, action, pending] = useActionState(signInAction, {});
  const [oauthPending, startOAuthTransition] = useTransition();

  function startOAuth(provider: "google" | "facebook") {
    startOAuthTransition(() => {
      void initiateOAuth(provider);
    });
  }

  return (
    <SignInPage
      notice={notice}
      state={state}
      pending={pending || oauthPending}
      formAction={action}
      onGoogleSignIn={() => startOAuth("google")}
      onFacebookSignIn={() => startOAuth("facebook")}
    />
  );
}
