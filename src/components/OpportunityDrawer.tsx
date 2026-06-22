import { ExternalLink, X } from "lucide-react";
import type { Opportunity } from "../types";
import { DecisionBadge } from "./OpportunitiesTable";

interface OpportunityDrawerProps {
  opportunity: Opportunity | null;
  onClose: () => void;
}

const fieldClass = "rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950";

const formatDateTime = (date: string | null) => {
  if (!date) return "-";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("ar-SA-u-nu-latn", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
};

export function OpportunityDrawer({ opportunity, onClose }: OpportunityDrawerProps) {
  if (!opportunity) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default bg-slate-950/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="إغلاق التفاصيل"
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col bg-white text-right shadow-2xl dark:bg-slate-900" dir="rtl" lang="ar">
        <header className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-3">
                <DecisionBadge decision={opportunity.decision} />
              </div>
              <h2 className="text-xl font-semibold leading-7 text-slate-950 dark:text-white" dir="auto">
                {opportunity.title || "فرصة بدون عنوان"}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400" dir="ltr">
                {opportunity.reference_number || "لا يوجد رقم مرجعي"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-300 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              title="إغلاق"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Detail label="الجهة الحكومية" value={opportunity.government_entity} autoDir />
            <Detail label="النشاط الرئيسي" value={opportunity.main_activity} autoDir />
            <Detail label="درجة الملاءمة" value={opportunity.fit_score?.toString() ?? "-"} />
            <Detail label="الثقة" value={opportunity.confidence?.toString() ?? "-"} />
            <Detail label="مجال الخدمة" value={opportunity.best_service_area} autoDir />
            <Detail label="تاريخ الفتح" value={formatDateTime(opportunity.opening_date)} />
          </div>

          <div className="mt-4 space-y-3">
            <div className={fieldClass}>
              <div className="text-xs font-semibold uppercase tracking-normal text-slate-500 dark:text-slate-400">
                سبب التقييم
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800 dark:text-slate-200" dir="rtl" lang="ar">
                {opportunity.reason_ar || "لا يوجد سبب مسجل."}
              </p>
            </div>

            <div className={fieldClass}>
              <div className="text-xs font-semibold uppercase tracking-normal text-slate-500 dark:text-slate-400">
                الإجراء المقترح
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800 dark:text-slate-200" dir="rtl" lang="ar">
                {opportunity.recommended_action || "لا توجد توصية مسجلة."}
              </p>
            </div>

            <Detail label="آخر ظهور" value={formatDateTime(opportunity.last_seen_at)} />
          </div>
        </div>

        <footer className="border-t border-slate-200 p-5 dark:border-slate-800">
          {opportunity.details_url ? (
            <a
              href={opportunity.details_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              فتح تفاصيل اعتماد
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="h-10 w-full rounded-md bg-slate-200 px-4 text-sm font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-500"
            >
              لا يوجد رابط اعتماد
            </button>
          )}
        </footer>
      </aside>
    </div>
  );
}

function Detail({ label, value, autoDir = false }: { label: string; value?: string | null; autoDir?: boolean }) {
  return (
    <div className={fieldClass}>
      <div className="text-xs font-semibold uppercase tracking-normal text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100" dir={autoDir ? "auto" : undefined}>
        {value || "-"}
      </div>
    </div>
  );
}
