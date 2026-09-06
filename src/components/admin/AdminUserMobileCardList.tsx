"use client";

import type { AdminUserRow } from "@/lib/admin-api";
import { EMPTY_CELL } from "@/lib/ui-copy";

type AdminUserMobileCardListProps = {
  users: AdminUserRow[];
};

/**
 * M4: รายชื่อ user แบบ card บน mobile — md+ ใช้ตาราง
 */
export function AdminUserMobileCardList({ users }: AdminUserMobileCardListProps) {
  return (
    <ul className="space-y-3 md:hidden">
      {users.map((user) => (
        <li
          key={user.id}
          className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
        >
          <p className="break-all font-medium text-zinc-900">{user.email}</p>
          <p className="mt-1 text-sm text-zinc-600">
            {user.fullName ?? EMPTY_CELL}
          </p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span
              className={
                user.role === "ADMIN"
                  ? "rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800"
                  : "rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700"
              }
            >
              {user.role}
            </span>
            <span className="text-sm text-zinc-500">
              {user.createdAt.slice(0, 10)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
