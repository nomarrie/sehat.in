"use client";

import { SignOutIcon } from "@phosphor-icons/react/SignOut";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useWorkoutSession } from "./workout-session-provider";

const closedByProps = { closedby: "any" } as Record<string, string>;

export function ExitSessionDialog({ packageId }: { packageId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const reset = useWorkoutSession((store) => store.reset);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || "closedBy" in HTMLDialogElement.prototype) return;

    const lightDismiss = (event: MouseEvent) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (!inside) dialog.close();
    };

    dialog.addEventListener("click", lightDismiss);
    return () => dialog.removeEventListener("click", lightDismiss);
  }, []);

  const confirmExit = () => {
    reset();
    dialogRef.current?.close();
    router.push(`/packages/${packageId}`);
  };

  return (
    <div className="exit-session">
      <button
        className="exit-session-trigger"
        type="button"
        aria-label="Keluar dari sesi"
        onClick={() => dialogRef.current?.showModal()}
      >
        <SignOutIcon size={19} weight="regular" aria-hidden="true" />
        <span>Keluar dari sesi</span>
      </button>

      <dialog
        className="exit-dialog"
        ref={dialogRef}
        aria-labelledby="exit-session-title"
        aria-describedby="exit-session-description"
        {...closedByProps}
      >
        <div className="dialog-content">
          <span className="dialog-icon" aria-hidden="true">
            <SignOutIcon size={25} weight="regular" />
          </span>
          <h2 id="exit-session-title">Keluar dari sesi?</h2>
          <p id="exit-session-description">
            Progres demo pada sesi ini akan dihapus dan tidak dapat dilanjutkan.
          </p>
          <div className="dialog-actions">
            <form method="dialog">
              <button className="button button-secondary" type="submit">
                Tetap berlatih
              </button>
            </form>
            <button className="button button-danger" type="button" onClick={confirmExit}>
              Keluar
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
