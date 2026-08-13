export function RouteSkeleton({
  variant,
}: {
  variant: "dashboard" | "package" | "food" | "food-detail" | "settings";
}) {
  const blockCount =
    variant === "dashboard" ? 6 : variant === "food" ? 5 : variant === "food-detail" ? 4 : variant === "settings" ? 4 : 5;

  return (
    <main className={`route-skeleton route-skeleton-${variant}`} aria-hidden="true" inert>
      <div className="skeleton-heading" />
      {Array.from({ length: blockCount }, (_, index) => (
        <div className="skeleton-block" key={index} />
      ))}
    </main>
  );
}
