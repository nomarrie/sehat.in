import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RouteSkeleton, type RouteSkeletonVariant } from "./route-skeleton";

const expectedSections: Record<Exclude<RouteSkeletonVariant, "chat" | "onboarding" | "session" | "login" | "register" | "reset-password">, string[]> = {
  dashboard: ["dashboard-heading", "weekly-target", "today-workout", "streak-summary", "weight-trend"],
  food: ["food-hero", "food-day-plan", "food-card-list", "food-note"],
  "food-detail": ["food-detail-hero", "nutrition", "ingredients", "cooking", "food-disclaimer"],
  package: ["package-hero", "package-notice", "exercise-sequence"],
  profile: ["profile-hero", "profile-actions"],
};

describe("RouteSkeleton", () => {
  it.each(Object.entries(expectedSections))(
    "composes the %s fallback from content-shaped sections",
    (variant, sections) => {
      const { container } = render(
        <RouteSkeleton variant={variant as RouteSkeletonVariant} />,
      );

      const shell = container.querySelector("[data-skeleton-shell]");
      expect(shell).toHaveAttribute("aria-hidden", "true");
      expect(shell).toHaveAttribute("inert");
      expect(shell).toHaveAttribute("data-skeleton-variant", variant);
      expect(container.querySelector("[data-skeleton-sidebar]")).toBeInTheDocument();
      expect(container.querySelector("[data-skeleton-mobile-topbar]")).toBeInTheDocument();
      expect(container.querySelector("[data-skeleton-mobile-navigation]")).toBeInTheDocument();
      expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(10);

      for (const section of sections) {
        expect(
          container.querySelector(`[data-skeleton-section="${section}"]`),
        ).toBeInTheDocument();
      }
    },
  );

  it("renders four recommendation cards in the food overview fallback", () => {
    const { container } = render(<RouteSkeleton variant="food" />);

    expect(container.querySelectorAll("[data-skeleton-food-card]")).toHaveLength(4);
  });

  it("renders three profile actions in the profile fallback", () => {
    const { container } = render(<RouteSkeleton variant="profile" />);

    expect(container.querySelectorAll("[data-skeleton-profile-action]")).toHaveLength(3);
  });

  it("uses the standalone full-screen structure for the chat fallback", () => {
    const { container } = render(<RouteSkeleton variant="chat" />);

    const chat = container.querySelector("[data-skeleton-chat]");
    expect(chat).toHaveAttribute("aria-hidden", "true");
    expect(chat).toHaveAttribute("inert");
    expect(chat).toHaveAttribute("data-skeleton-variant", "chat");
    expect(container.querySelector("[data-skeleton-shell]")).not.toBeInTheDocument();
    expect(container.querySelector('[data-skeleton-section="chat-topbar"]')).toBeInTheDocument();
    expect(container.querySelector('[data-skeleton-section="chat-sidebar"]')).toBeInTheDocument();
    expect(container.querySelector('[data-skeleton-section="chat-panel"]')).toBeInTheDocument();
    expect(container.querySelectorAll("[data-skeleton-chat-message]")).toHaveLength(2);
    expect(container.querySelector("[data-skeleton-chat-composer]")).toBeInTheDocument();
  });

  it("uses the standalone form structure for the onboarding fallback", () => {
    const { container } = render(<RouteSkeleton variant="onboarding" />);

    const onboarding = container.querySelector("[data-skeleton-onboarding]");
    expect(onboarding).toHaveAttribute("aria-hidden", "true");
    expect(onboarding).toHaveAttribute("inert");
    expect(onboarding).toHaveAttribute("data-skeleton-variant", "onboarding");
    expect(container.querySelector("[data-skeleton-shell]")).not.toBeInTheDocument();
    expect(container.querySelector('[data-skeleton-section="onboarding-heading"]')).toBeInTheDocument();
    expect(container.querySelector('[data-skeleton-section="onboarding-about"]')).toBeInTheDocument();
    expect(container.querySelector('[data-skeleton-section="onboarding-program"]')).toBeInTheDocument();
    expect(container.querySelector('[data-skeleton-section="onboarding-consent"]')).toBeInTheDocument();
    expect(container.querySelectorAll("[data-skeleton-onboarding-field]")).toHaveLength(8);
    expect(container.querySelectorAll("[data-skeleton-goal-option]")).toHaveLength(2);
  });

  it("uses the standalone training structure for the session fallback", () => {
    const { container } = render(<RouteSkeleton variant="session" />);

    const session = container.querySelector("[data-skeleton-session]");
    expect(session).toHaveAttribute("aria-hidden", "true");
    expect(session).toHaveAttribute("inert");
    expect(session).toHaveAttribute("data-skeleton-variant", "session");
    expect(container.querySelector("[data-skeleton-shell]")).not.toBeInTheDocument();
    expect(container.querySelector('[data-skeleton-section="session-header"]')).toBeInTheDocument();
    expect(container.querySelector('[data-skeleton-section="session-progress"]')).toBeInTheDocument();
    expect(container.querySelector('[data-skeleton-section="session-intro"]')).toBeInTheDocument();
    expect(container.querySelector('[data-skeleton-section="session-action"]')).toBeInTheDocument();
    expect(container.querySelectorAll("[data-skeleton-session-fact]")).toHaveLength(3);
  });

  it.each([
    ["login", 2, true],
    ["register", 3, false],
    ["reset-password", 1, false],
  ] as const)("adapts the %s fallback to its form", (variant, fieldCount, hasOauth) => {
    const { container } = render(<RouteSkeleton variant={variant} />);

    const auth = container.querySelector("[data-skeleton-auth]");
    expect(auth).toHaveAttribute("aria-hidden", "true");
    expect(auth).toHaveAttribute("inert");
    expect(auth).toHaveAttribute("data-skeleton-variant", variant);
    expect(container.querySelector("[data-skeleton-shell]")).not.toBeInTheDocument();
    expect(container.querySelector('[data-skeleton-section="auth-brand"]')).toBeInTheDocument();
    expect(container.querySelector('[data-skeleton-section="auth-heading"]')).toBeInTheDocument();
    expect(container.querySelector('[data-skeleton-section="auth-form"]')).toBeInTheDocument();
    expect(container.querySelector('[data-skeleton-section="auth-companion"]')).toBeInTheDocument();
    expect(container.querySelectorAll("[data-skeleton-auth-field]")).toHaveLength(fieldCount);
    expect(Boolean(container.querySelector('[data-skeleton-section="auth-oauth"]'))).toBe(hasOauth);
  });
});
