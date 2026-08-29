"use client";

import { AppHeader } from "@/components/layout/AppHeader";
import { AdminAuthSkeleton } from "@/components/skeletons/AdminAuthSkeleton";
import { TableBodySkeleton } from "@/components/skeletons/TableBodySkeleton";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { listAdminUsers, type AdminUserRow } from "@/lib/admin-api";
import { ensureSession, fetchMe, logoutRequest } from "@/lib/auth-api";
import { isAdminRole, type StoredAuthUser } from "@/lib/auth-storage";
import { ADMIN_COPY, EMPTY_CELL, LOADING } from "@/lib/ui-copy";

/**
 * P3: หน้า Admin — เห็นได้เฉพาะ role === ADMIN
 */
export default function AdminPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<StoredAuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const ok = await ensureSession();
      if (cancelled) return;
      if (!ok) {
        router.replace("/login");
        return;
      }

      try {
        // อ่าน role จาก server (กรณีเพิ่งถูกโปรโมตเป็น ADMIN)
        const me = await fetchMe();
        if (cancelled) return;

        if (!isAdminRole(me.role)) {
          router.replace("/dashboard");
          return;
        }

        setAuthUser(me);
        setReady(true);

        const rows = await listAdminUsers();
        if (cancelled) return;
        setUsers(rows);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof Error && err.message === "UNAUTHORIZED") {
          await logoutRequest();
          router.replace("/login");
          return;
        }
        if (err instanceof Error && err.message === "FORBIDDEN") {
          router.replace("/dashboard");
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load admin");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [router]);

  function handleLogout() {
    void logoutRequest().then(() => router.push("/login"));
  }

  if (!ready) {
    return <AdminAuthSkeleton />;
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <AppHeader variant="admin" user={authUser} onLogout={handleLogout} />

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {ADMIN_COPY.pageSubtitle}
          </p>
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Full name</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody aria-busy={loading || undefined}>
              {loading && (
                <TableBodySkeleton
                  rows={6}
                  columnCount={4}
                  loadingLabel={LOADING.loadingUsers}
                  columnWidths={[
                    "h-4 w-full max-w-48",
                    "h-4 w-full max-w-32",
                    "h-5 w-14 rounded-md",
                    "h-4 w-20",
                  ]}
                />
              )}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                    No users found
                  </td>
                </tr>
              )}
              {!loading &&
                users.map((user) => (
                  <tr key={user.id} className="border-t border-zinc-100">
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">{user.fullName ?? EMPTY_CELL}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          user.role === "ADMIN"
                            ? "rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800"
                            : "rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700"
                        }
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {user.createdAt.slice(0, 10)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
