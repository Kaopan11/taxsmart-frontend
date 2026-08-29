/** แถบ pulse เล็ก ๆ — ใช้ประกอบ skeleton */
export function SkeletonBar({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse rounded bg-zinc-200 ${className}`}
      aria-hidden
    />
  );
}
