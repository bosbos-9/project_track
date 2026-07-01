import { ExternalLink } from "lucide-react";
import type { Opportunity } from "../types";

interface OpportunitiesTableProps {
  opportunities: Opportunity[];
  onSelect: (opportunity: Opportunity) => void;
}

const badgeStyles: Record<string, string> = {
  MATCHED: "bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/20",
  REVIEW: "bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-500/20",
  REJECTED: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/20",
};
const badgeLabels: Record<string, string> = {
  MATCHED: "مطابقة",
  REVIEW: "للمراجعة",
  REJECTED: "مرفوضة",
  UNKNOWN: "غير معروف",
};

export function DecisionBadge({ decision }: { decision: string | null }) {
  const normalized = decision?.toUpperCase() || "UNKNOWN";
  const className = badgeStyles[normalized] ?? "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700";

  return (
    <span className={`inline-flex min-w-20 justify-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${className}`}>
      {badgeLabels[normalized] ?? normalized}
    </span>
  );
}

const formatDate = (date: string | null) => {
  if (!date) return "غير محدد";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("ar-SA-u-nu-latn", { year: "numeric", month: "short", day: "2-digit" }).format(parsed);
};

const formatNumber = (value: number | null) => (typeof value === "number" ? value.toFixed(0) : "غير محدد");
const missingText = "غير متوفر";

export function OpportunitiesTable({ opportunities, onSelect }: OpportunitiesTableProps) {
  if (opportunities.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white/85 px-6 py-14 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
        <h2 className="text-base font-semibold text-slate-950 dark:text-white">لا توجد فرص مطابقة</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          جرّب تغيير الفلاتر أو تحديث البيانات عند وصول تقييمات جديدة.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
      <div className="overflow-x-auto">
        <table className="min-w-[900px] w-full table-fixed border-collapse text-right text-sm">
          <thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-normal text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
            <tr>
              <th className="w-[30%] px-5 py-3">الفرصة</th>
              <th className="w-[18%] px-5 py-3">الجهة</th>
              <th className="w-[20%] px-5 py-3">النشاط الرئيسي</th>
              <th className="w-[16%] px-5 py-3">مجال الخدمة</th>
              <th className="w-[9%] px-5 py-3">القرار</th>
              <th className="w-[7%] px-5 py-3 text-left">الرابط</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {opportunities.map((opportunity, index) => (
              <tr
                key={`${opportunity.reference_number ?? "opportunity"}-${index}`}
                onClick={() => onSelect(opportunity)}
                className="cursor-pointer bg-white/70 transition hover:bg-slate-50 dark:bg-slate-900/40 dark:hover:bg-slate-800/70"
              >
                <td className="max-w-[380px] px-5 py-4 align-top">
                  <div className="font-medium leading-5 text-slate-950 dark:text-white" dir="auto">
                    {opportunity.title || "فرصة بدون عنوان"}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400" dir="ltr">
                    {opportunity.reference_number || "لا يوجد رقم مرجعي"}
                  </div>
                </td>
                <td className="max-w-[240px] px-5 py-4 align-top text-slate-700 dark:text-slate-300" dir="auto">
                  {opportunity.government_entity || missingText}
                </td>
                <td className="max-w-[240px] px-5 py-4 align-top text-slate-700 dark:text-slate-300" dir="auto">
                  {opportunity.main_activity || missingText}
                </td>
                <td className="px-5 py-4 align-top text-slate-700 dark:text-slate-300" dir="auto">
                  {opportunity.best_service_area || missingText}
                </td>
                <td className="px-5 py-4 align-top">
                  <DecisionBadge decision={opportunity.decision} />
                </td>
                <td className="px-5 py-4 text-left align-top">
                  {opportunity.details_url ? (
                    <a
                      href={opportunity.details_url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                      title="فتح تفاصيل اعتماد"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
