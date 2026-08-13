import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import type { ProgressNotification } from "./dashboard.types";

export function ProgressNotice({ notification }: { notification: ProgressNotification }) {
  return (
    <aside className="dashboard-module progress-notice" aria-labelledby="progress-notice-title">
      <CheckCircleIcon size={24} weight="fill" aria-hidden="true" />
      <div>
        <h2 id="progress-notice-title">{notification.title}</h2>
        <p>{notification.message}</p>
      </div>
    </aside>
  );
}
