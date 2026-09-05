"use client";

import { useActionState } from "react";
import { RegisterPage } from "@/components/ui/register";
import { signUpAction, verifyEmailAction } from "./actions";

export function RegisterForm() {
  const [state, action, pending] = useActionState(signUpAction, {});
  const [verifyState, verifyAction, verifying] = useActionState(verifyEmailAction, {});
  return (
    <RegisterPage
      state={state}
      verificationState={verifyState}
      pending={pending}
      verifying={verifying}
      formAction={action}
      verificationAction={verifyAction}
    />
  );
}
