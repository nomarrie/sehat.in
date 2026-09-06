import { Skeleton } from "@/components/ui/skeleton";

export type RouteSkeletonVariant =
  | "dashboard"
  | "package"
  | "food"
  | "food-detail"
  | "profile"
  | "chat"
  | "onboarding"
  | "session";

type LineSize = "xs" | "sm" | "md" | "lg" | "xl" | "full";

function Line({ size = "full" }: { size?: LineSize }) {
  return <Skeleton className={`route-skeleton-line route-skeleton-line-${size}`} />;
}

function ModuleHeading() {
  return (
    <div className="route-skeleton-module-heading">
      <Skeleton className="route-skeleton-icon" />
      <div className="route-skeleton-copy">
        <Line size="xs" />
        <Line size="md" />
      </div>
    </div>
  );
}

function AppShellSkeleton({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: RouteSkeletonVariant;
}) {
  return (
    <div
      className="route-skeleton-shell"
      data-skeleton-shell
      data-skeleton-variant={variant}
      aria-hidden="true"
      inert
    >
      <aside className="route-skeleton-sidebar" data-skeleton-sidebar>
        <div className="route-skeleton-brand">
          <Skeleton className="route-skeleton-brand-mark" />
          <Line size="sm" />
        </div>
        <div className="route-skeleton-sidebar-links">
          {Array.from({ length: 5 }, (_, index) => (
            <div className="route-skeleton-sidebar-link" key={index}>
              <Skeleton className="route-skeleton-sidebar-icon" />
              <Line size={index === 2 ? "sm" : "md"} />
            </div>
          ))}
        </div>
        <div className="route-skeleton-sidebar-profile">
          <Skeleton className="route-skeleton-avatar-small" />
          <div className="route-skeleton-copy">
            <Line size="sm" />
            <Line size="md" />
          </div>
        </div>
      </aside>

      <div className="route-skeleton-viewport">
        <header className="route-skeleton-mobile-topbar" data-skeleton-mobile-topbar>
          <div className="route-skeleton-brand">
            <Skeleton className="route-skeleton-brand-mark" />
            <Line size="sm" />
          </div>
          <Skeleton className="route-skeleton-avatar-small" />
        </header>

        <main className="route-skeleton-main">{children}</main>

        <nav
          className="route-skeleton-mobile-navigation"
          data-skeleton-mobile-navigation
        >
          {Array.from({ length: 5 }, (_, index) => (
            <span key={index}>
              <Skeleton className="route-skeleton-mobile-nav-icon" />
              <Line size="xs" />
            </span>
          ))}
        </nav>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="route-skeleton-page route-skeleton-dashboard">
      <header
        className="route-skeleton-dashboard-heading"
        data-skeleton-section="dashboard-heading"
      >
        <div className="route-skeleton-copy">
          <Line size="sm" />
          <Line size="xl" />
        </div>
        <div className="route-skeleton-copy route-skeleton-copy-end">
          <Line size="lg" />
          <Line size="md" />
        </div>
      </header>

      <section
        className="route-skeleton-card route-skeleton-dashboard-weekly"
        data-skeleton-section="weekly-target"
      >
        <ModuleHeading />
        <Skeleton className="route-skeleton-progress" />
        <div className="route-skeleton-facts route-skeleton-facts-three">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="route-skeleton-copy" key={index}>
              <Line size="sm" />
              <Line size="md" />
            </div>
          ))}
        </div>
      </section>

      <section
        className="route-skeleton-card route-skeleton-card-hero route-skeleton-dashboard-workout"
        data-skeleton-section="today-workout"
      >
        <Line size="sm" />
        <div className="route-skeleton-copy route-skeleton-workout-copy">
          <Skeleton className="route-skeleton-icon" />
          <Line size="lg" />
          <Line size="full" />
          <Line size="md" />
        </div>
        <div className="route-skeleton-inline">
          <Line size="sm" />
          <Line size="sm" />
        </div>
      </section>

      <section
        className="route-skeleton-card route-skeleton-dashboard-streak"
        data-skeleton-section="streak-summary"
      >
        <ModuleHeading />
        <div className="route-skeleton-stat-row">
          <Skeleton className="route-skeleton-stat" />
          <Line size="sm" />
        </div>
        <Skeleton className="route-skeleton-progress route-skeleton-progress-small" />
      </section>

      <section
        className="route-skeleton-card route-skeleton-dashboard-weight"
        data-skeleton-section="weight-trend"
      >
        <ModuleHeading />
        <Skeleton className="route-skeleton-chart" />
        <div className="route-skeleton-facts route-skeleton-facts-four">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="route-skeleton-copy" key={index}>
              <Line size="sm" />
              <Line size="md" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function FoodCardSkeleton() {
  return (
    <article className="route-skeleton-card route-skeleton-food-card" data-skeleton-food-card>
      <div className="route-skeleton-card-heading">
        <div className="route-skeleton-copy">
          <Line size="xs" />
          <Line size="lg" />
        </div>
        <Skeleton className="route-skeleton-calories" />
      </div>
      <div className="route-skeleton-copy">
        <Line size="full" />
        <Line size="lg" />
      </div>
      <div className="route-skeleton-facts route-skeleton-facts-three">
        {Array.from({ length: 3 }, (_, index) => (
          <div className="route-skeleton-copy" key={index}>
            <Line size="xs" />
            <Line size="sm" />
          </div>
        ))}
      </div>
      <Line size="md" />
    </article>
  );
}

function FoodSkeleton() {
  return (
    <div className="route-skeleton-page route-skeleton-food">
      <Line size="md" />
      <header className="route-skeleton-split-hero" data-skeleton-section="food-hero">
        <div className="route-skeleton-copy route-skeleton-hero-copy">
          <Line size="sm" />
          <Line size="xl" />
          <Line size="lg" />
          <Line size="md" />
        </div>
        <div className="route-skeleton-context-card">
          <Skeleton className="route-skeleton-icon-large" />
          <div className="route-skeleton-copy">
            <Line size="md" />
            <Skeleton className="route-skeleton-stat" />
            <Line size="sm" />
          </div>
        </div>
      </header>

      <section className="route-skeleton-food-plan" data-skeleton-section="food-day-plan">
        <div className="route-skeleton-section-heading">
          <div className="route-skeleton-copy">
            <Line size="lg" />
            <Line size="xl" />
          </div>
          <Line size="sm" />
        </div>
        <div className="route-skeleton-food-list" data-skeleton-section="food-card-list">
          {Array.from({ length: 4 }, (_, index) => (
            <FoodCardSkeleton key={index} />
          ))}
        </div>
      </section>

      <aside className="route-skeleton-note" data-skeleton-section="food-note">
        <Line size="md" />
        <Line size="xl" />
        <Line size="lg" />
      </aside>
    </div>
  );
}

function FoodDetailSkeleton() {
  return (
    <article className="route-skeleton-page route-skeleton-food-detail">
      <Line size="md" />
      <header
        className="route-skeleton-split-hero"
        data-skeleton-section="food-detail-hero"
      >
        <div className="route-skeleton-copy route-skeleton-hero-copy">
          <Line size="sm" />
          <Line size="xl" />
          <Line size="full" />
          <Line size="lg" />
          <div className="route-skeleton-inline">
            <Line size="sm" />
            <Line size="sm" />
          </div>
        </div>
        <div className="route-skeleton-context-card">
          <Skeleton className="route-skeleton-icon-large" />
          <Line size="sm" />
          <Line size="full" />
          <Line size="md" />
        </div>
      </header>

      <section className="route-skeleton-card route-skeleton-nutrition" data-skeleton-section="nutrition">
        <div className="route-skeleton-copy">
          <Line size="lg" />
          <Line size="full" />
          <Line size="md" />
        </div>
        <div className="route-skeleton-nutrition-facts">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton className="route-skeleton-nutrition-fact" key={index} />
          ))}
        </div>
      </section>

      <div className="route-skeleton-recipe-grid">
        <section className="route-skeleton-card" data-skeleton-section="ingredients">
          <Line size="lg" />
          <div className="route-skeleton-list">
            {Array.from({ length: 5 }, (_, index) => (
              <div className="route-skeleton-list-row" key={index}>
                <Line size="sm" />
                <Line size="lg" />
              </div>
            ))}
          </div>
        </section>
        <section className="route-skeleton-card" data-skeleton-section="cooking">
          <Line size="lg" />
          <div className="route-skeleton-list">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="route-skeleton-step" key={index}>
                <Skeleton className="route-skeleton-step-number" />
                <div className="route-skeleton-copy">
                  <Line size="full" />
                  <Line size="lg" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className="route-skeleton-note" data-skeleton-section="food-disclaimer">
        <Line size="md" />
        <Line size="xl" />
        <Line size="lg" />
      </aside>
    </article>
  );
}

function PackageSkeleton() {
  return (
    <article className="route-skeleton-page route-skeleton-package">
      <Line size="md" />
      <header className="route-skeleton-package-hero" data-skeleton-section="package-hero">
        <div className="route-skeleton-card route-skeleton-package-copy">
          <Line size="sm" />
          <Line size="xl" />
          <div className="route-skeleton-copy">
            <Line size="full" />
            <Line size="lg" />
          </div>
          <div className="route-skeleton-facts route-skeleton-facts-three">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton className="route-skeleton-package-fact" key={index} />
            ))}
          </div>
          <Skeleton className="route-skeleton-button" />
        </div>
        <div className="route-skeleton-card-hero route-skeleton-package-intent">
          <Skeleton className="route-skeleton-icon-large" />
          <Line size="sm" />
          <Line size="lg" />
          <Line size="full" />
          <Line size="md" />
        </div>
      </header>

      <aside className="route-skeleton-notice" data-skeleton-section="package-notice">
        <Skeleton className="route-skeleton-notice-icon" />
        <div className="route-skeleton-copy">
          <Line size="xl" />
          <Line size="lg" />
        </div>
      </aside>

      <section data-skeleton-section="exercise-sequence">
        <div className="route-skeleton-section-heading">
          <div className="route-skeleton-copy">
            <Line size="sm" />
            <Line size="lg" />
          </div>
          <div className="route-skeleton-copy">
            <Line size="xl" />
            <Line size="md" />
          </div>
        </div>
        <div className="route-skeleton-exercises">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="route-skeleton-exercise" key={index}>
              <Skeleton className="route-skeleton-exercise-number" />
              <div className="route-skeleton-copy">
                <Line size="lg" />
                <Line size="xl" />
                <Line size="md" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </article>
  );
}

function ProfileSkeleton() {
  return (
    <div className="route-skeleton-page route-skeleton-profile">
      <header className="route-skeleton-card route-skeleton-profile-hero" data-skeleton-section="profile-hero">
        <Skeleton className="route-skeleton-profile-avatar" />
        <div className="route-skeleton-copy">
          <Line size="sm" />
          <Line size="xl" />
          <Line size="lg" />
        </div>
      </header>
      <section className="route-skeleton-profile-actions" data-skeleton-section="profile-actions">
        {Array.from({ length: 3 }, (_, index) => (
          <div className="route-skeleton-card route-skeleton-profile-action" data-skeleton-profile-action key={index}>
            <Skeleton className="route-skeleton-icon" />
            <div className="route-skeleton-copy">
              <Line size="md" />
              <Line size="xl" />
            </div>
            <Skeleton className="route-skeleton-chevron" />
          </div>
        ))}
      </section>
    </div>
  );
}

function OnboardingFieldSkeleton() {
  return (
    <div className="route-skeleton-onboarding-field" data-skeleton-onboarding-field>
      <Line size="sm" />
      <Skeleton className="route-skeleton-onboarding-input" />
    </div>
  );
}

function GoalOptionSkeleton() {
  return (
    <div className="route-skeleton-goal-option" data-skeleton-goal-option>
      <Skeleton className="route-skeleton-goal-radio" />
      <Skeleton className="route-skeleton-goal-icon" />
      <div className="route-skeleton-copy">
        <Line size="lg" />
        <Line size="full" />
        <Line size="xl" />
      </div>
    </div>
  );
}

function OnboardingSection({
  children,
  section,
}: {
  children: React.ReactNode;
  section: "onboarding-about" | "onboarding-program";
}) {
  return (
    <section className="route-skeleton-onboarding-section" data-skeleton-section={section}>
      <Line size="md" />
      <div className="route-skeleton-onboarding-divider" />
      {children}
    </section>
  );
}

function OnboardingSkeleton() {
  return (
    <main
      className="route-skeleton-onboarding"
      data-skeleton-onboarding
      data-skeleton-variant="onboarding"
      aria-hidden="true"
      inert
    >
      <header
        className="route-skeleton-onboarding-heading"
        data-skeleton-section="onboarding-heading"
      >
        <Line size="sm" />
        <Skeleton className="route-skeleton-onboarding-title" />
        <Line size="xl" />
        <Line size="lg" />
      </header>

      <div className="route-skeleton-onboarding-form">
        <OnboardingSection section="onboarding-about">
          <div className="route-skeleton-onboarding-fields">
            {Array.from({ length: 3 }, (_, index) => (
              <OnboardingFieldSkeleton key={index} />
            ))}
          </div>
        </OnboardingSection>

        <OnboardingSection section="onboarding-program">
          <div className="route-skeleton-onboarding-fields">
            <div className="route-skeleton-goal-fieldset">
              <Line size="sm" />
              <div className="route-skeleton-goal-options">
                <GoalOptionSkeleton />
                <GoalOptionSkeleton />
              </div>
            </div>
            {Array.from({ length: 5 }, (_, index) => (
              <OnboardingFieldSkeleton key={index} />
            ))}
          </div>
        </OnboardingSection>

        <aside className="route-skeleton-note" data-skeleton-section="onboarding-note">
          <Line size="md" />
          <Line size="xl" />
          <Line size="lg" />
        </aside>

        <section
          className="route-skeleton-onboarding-consent"
          data-skeleton-section="onboarding-consent"
        >
          <Skeleton className="route-skeleton-consent-check" />
          <div className="route-skeleton-copy">
            <Line size="md" />
            <Line size="full" />
            <Line size="full" />
            <Line size="xl" />
          </div>
        </section>

        <Skeleton className="route-skeleton-onboarding-button" />
      </div>
    </main>
  );
}

function ChatThreadSkeleton({ active = false }: { active?: boolean }) {
  return (
    <div className={`route-skeleton-chat-thread${active ? " is-active" : ""}`}>
      <Skeleton className="route-skeleton-chat-thread-icon" />
      <div className="route-skeleton-copy">
        <Line size="lg" />
        <Line size="full" />
      </div>
      <Line size="sm" />
    </div>
  );
}

function ChatMessageSkeleton({ user = false }: { user?: boolean }) {
  return (
    <div
      className={`route-skeleton-chat-message${user ? " is-user" : ""}`}
      data-skeleton-chat-message
    >
      {user ? null : <Skeleton className="route-skeleton-chat-message-avatar" />}
      <div className="route-skeleton-chat-bubble">
        <Line size="full" />
        <Line size="xl" />
        {user ? null : <Line size="md" />}
      </div>
    </div>
  );
}

function ChatSkeleton() {
  return (
    <div
      className="route-skeleton-chat"
      data-skeleton-chat
      data-skeleton-variant="chat"
      aria-hidden="true"
      inert
    >
      <header
        className="route-skeleton-chat-topbar"
        data-skeleton-section="chat-topbar"
      >
        <div className="route-skeleton-chat-navigation">
          <Skeleton className="route-skeleton-chat-back" />
          <div className="route-skeleton-chat-brand">
            <Skeleton className="route-skeleton-brand-mark" />
            <Line size="md" />
          </div>
        </div>
        <div className="route-skeleton-chat-assistant">
          <Skeleton className="route-skeleton-avatar-small" />
          <div className="route-skeleton-copy">
            <Line size="full" />
            <Line size="md" />
          </div>
        </div>
        <Skeleton className="route-skeleton-chat-badge" />
      </header>

      <div className="route-skeleton-chat-workspace">
        <aside
          className="route-skeleton-chat-sidebar"
          data-skeleton-section="chat-sidebar"
        >
          <Skeleton className="route-skeleton-chat-new-thread" />
          <div className="route-skeleton-chat-history">
            <Line size="sm" />
            <ChatThreadSkeleton active />
            <ChatThreadSkeleton />
            <ChatThreadSkeleton />
          </div>
          <div className="route-skeleton-chat-safety">
            <Skeleton className="route-skeleton-notice-icon" />
            <div className="route-skeleton-copy">
              <Line size="lg" />
              <Line size="full" />
              <Line size="md" />
            </div>
          </div>
        </aside>

        <section
          className="route-skeleton-chat-panel"
          data-skeleton-section="chat-panel"
        >
          <div className="route-skeleton-chat-mobile-history">
            <Line size="sm" />
            <Skeleton className="route-skeleton-chat-select" />
          </div>
          <div className="route-skeleton-chat-feed">
            <ChatMessageSkeleton />
            <ChatMessageSkeleton user />
          </div>
          <div className="route-skeleton-chat-input">
            <div className="route-skeleton-chat-prompts">
              <Skeleton />
              <Skeleton />
              <Skeleton />
            </div>
            <div className="route-skeleton-chat-composer" data-skeleton-chat-composer>
              <Line size="lg" />
              <Skeleton className="route-skeleton-chat-send" />
            </div>
            <Line size="md" />
          </div>
        </section>
      </div>
    </div>
  );
}

function SessionSkeleton() {
  return (
    <main
      className="route-skeleton-session"
      data-skeleton-session
      data-skeleton-variant="session"
      aria-hidden="true"
      inert
    >
      <header
        className="route-skeleton-session-header"
        data-skeleton-section="session-header"
      >
        <div className="route-skeleton-copy">
          <Line size="sm" />
          <Skeleton className="route-skeleton-session-title" />
        </div>
        <Skeleton className="route-skeleton-session-exit" />
      </header>

      <section
        className="route-skeleton-session-progress"
        data-skeleton-section="session-progress"
      >
        <div className="route-skeleton-session-progress-labels">
          <Line size="sm" />
          <Line size="sm" />
        </div>
        <Skeleton className="route-skeleton-session-progress-track" />
      </section>

      <section
        className="route-skeleton-session-intro"
        data-skeleton-section="session-intro"
      >
        <Skeleton className="route-skeleton-session-icon" />
        <Line size="sm" />
        <Skeleton className="route-skeleton-session-heading" />
        <div className="route-skeleton-copy route-skeleton-session-description">
          <Line size="full" />
          <Line size="lg" />
        </div>
        <div className="route-skeleton-session-facts">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="route-skeleton-session-fact" data-skeleton-session-fact key={index}>
              <Line size="md" />
              <Line size="lg" />
            </div>
          ))}
        </div>
      </section>

      <Skeleton
        className="route-skeleton-session-action"
        data-skeleton-section="session-action"
      />
      <Skeleton className="route-skeleton-session-note" />
    </main>
  );
}

const skeletons: Record<Exclude<RouteSkeletonVariant, "chat" | "onboarding" | "session">, () => React.ReactNode> = {
  dashboard: DashboardSkeleton,
  food: FoodSkeleton,
  "food-detail": FoodDetailSkeleton,
  package: PackageSkeleton,
  profile: ProfileSkeleton,
};

export function RouteSkeleton({ variant }: { variant: RouteSkeletonVariant }) {
  if (variant === "chat") {
    return <ChatSkeleton />;
  }

  if (variant === "onboarding") {
    return <OnboardingSkeleton />;
  }

  if (variant === "session") {
    return <SessionSkeleton />;
  }

  const ContentSkeleton = skeletons[variant];

  return (
    <AppShellSkeleton variant={variant}>
      <ContentSkeleton />
    </AppShellSkeleton>
  );
}
