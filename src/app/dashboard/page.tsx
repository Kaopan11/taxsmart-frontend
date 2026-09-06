import { Suspense } from "react";
import { DashboardAuthSkeleton } from "@/components/skeletons/DashboardAuthSkeleton";
import { DashboardClient } from "./DashboardClient";

/** Server wrapper — useSearchParams ใน DashboardClient ต้องอยู่ใต้ Suspense (Vercel build) */
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardAuthSkeleton />}>
      <DashboardClient />
    </Suspense>
  );
}
