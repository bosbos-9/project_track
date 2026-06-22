import { ArrowDownUp, Download, RefreshCw, Search } from "lucide-react";
import type { DecisionFilter, FiltersState, SortKey } from "../types";

interface FiltersProps {
  filters: FiltersState;
  serviceAreas: string[];
  onFiltersChange: (filters: FiltersState) => void;
  onRefresh: () => void;
  onExportCsv: () => void;
  isLoading: boolean;
}

const decisions: DecisionFilter[] = ["ALL", "MATCHED", "REVIEW", "REJECTED"];
const sortOptions: Array<{ value: SortKey; label: string }> = [
  { value: "fit_score", label: "درجة الملاءمة" },
  { value: "last_seen_at", label: "آخر تحديث" },
  { value: "opening_date", label: "تاريخ الفتح" },
];
const decisionLabels: Record<DecisionFilter, string> = {
  ALL: "كل القرارات",
  MATCHED: "مطابقة",
  REVIEW: "للمراجعة",
  REJECTED: "مرفوضة",
};

export function Filters({
  filters,
  serviceAreas,
  onFiltersChange,
  onRefresh,
  onExportCsv,
  isLoading,
}: FiltersProps) {
  const update = <K extends keyof FiltersState>(key: K, value: FiltersState[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/85 p-3 shadow-sm shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(280px,1.5fr)_repeat(4,minmax(130px,1fr))_auto_auto]">
        <label className="relative">
          <span className="sr-only">البحث في الفرص</span>
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={filters.search}
            onChange={(event) => update("search", event.target.value)}
            placeholder="ابحث بالعنوان أو الرقم المرجعي أو الجهة"
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-3 pr-9 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-200/60 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-slate-600 dark:focus:ring-slate-800"
          />
        </label>

        <label>
          <span className="sr-only">القرار</span>
          <select
            value={filters.decision}
            onChange={(event) => update("decision", event.target.value as DecisionFilter)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-sm text-slate-950 outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-200/60 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-slate-600 dark:focus:ring-slate-800"
          >
            {decisions.map((decision) => (
              <option key={decision} value={decision}>
                {decisionLabels[decision]}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">مجال الخدمة</span>
          <select
            value={filters.serviceArea}
            onChange={(event) => update("serviceArea", event.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-sm text-slate-950 outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-200/60 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-slate-600 dark:focus:ring-slate-800"
          >
            <option value="ALL">كل مجالات الخدمة</option>
            {serviceAreas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </label>

        <label className="relative">
          <span className="sr-only">ترتيب حسب</span>
          <ArrowDownUp className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            value={filters.sortBy}
            onChange={(event) => update("sortBy", event.target.value as SortKey)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-3 pr-9 text-sm text-slate-950 outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-200/60 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-slate-600 dark:focus:ring-slate-800"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                ترتيب: {option.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
          title="تحديث البيانات"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
          تحديث
        </button>

        <button
          type="button"
          onClick={onExportCsv}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          title="تصدير النتائج الحالية كملف CSV"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          تصدير
        </button>
      </div>
    </section>
  );
}
