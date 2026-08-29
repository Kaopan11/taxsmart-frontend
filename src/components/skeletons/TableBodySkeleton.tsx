import { LOADING } from "@/lib/ui-copy";
import { SkeletonBar } from "@/components/skeletons/SkeletonBar";

type TableBodySkeletonProps = {
  rows?: number;
  columnCount: number;
  /** ความกว้าง bar ต่อคอลัมน์ */
  columnWidths?: string[];
  /** ข้อความ sr-only — default loadingInvoices */
  loadingLabel?: string;
};

/**
 * Ticket 07: แถว skeleton ในตาราง — ใช้ใน tbody
 */
export function TableBodySkeleton({
  rows = 5,
  columnCount,
  columnWidths,
  loadingLabel = LOADING.loadingInvoices,
}: TableBodySkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} aria-hidden={rowIndex > 0 ? true : undefined}>
          {Array.from({ length: columnCount }).map((_, colIndex) => (
            <td key={colIndex} className="px-4 py-3">
              <SkeletonBar
                className={
                  columnWidths?.[colIndex] ?? "h-4 w-full max-w-[8rem]"
                }
              />
            </td>
          ))}
        </tr>
      ))}
      <tr className="sr-only">
        <td colSpan={columnCount}>{loadingLabel}</td>
      </tr>
    </>
  );
}
