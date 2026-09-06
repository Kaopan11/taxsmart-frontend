/**
 * Product detail — 3 จุดขาย
 * ไม่ใช้การ์ดหนา ๆ — แบ่งด้วยเส้น/ช่องว่างเพื่ออ่านง่าย
 */
const FEATURES = [
  {
    title: "AI receipt OCR",
    body: "Upload a photo or PDF. TaxSmart reads merchant, tax ID, date, and totals for you.",
  },
  {
    title: "Expense & tax dashboard",
    body: "See totals, categories, and processing status in one place so month-end stays clear.",
  },
  {
    title: "Duplicate check",
    body: "Catch repeats early by matching tax ID and invoice number before you save the same bill twice.",
  },
] as const;

export function ProductFeatures() {
  return (
    <section className="bg-white px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          Built for receipt-heavy workdays
        </h2>
        <p className="mt-3 max-w-2xl text-zinc-600">
          From capture to review — the flow TaxSmart covers for everyday SME tax
          prep.
        </p>

        <ul className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {FEATURES.map((feature, index) => {
            const delayClass =
              index === 0
                ? "home-delay-1"
                : index === 1
                  ? "home-delay-2"
                  : "home-delay-3";

            return (
              <li
                key={feature.title}
                className={`home-fade-up border-t border-emerald-700/20 pt-6 ${delayClass}`}
              >
                <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-3 text-lg font-semibold text-zinc-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  {feature.body}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
