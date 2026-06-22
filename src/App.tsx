import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Moon, Sun } from "lucide-react";
import { Filters } from "./components/Filters";
import { KpiCards } from "./components/KpiCards";
import { OpportunityDrawer } from "./components/OpportunityDrawer";
import { OpportunitiesTable } from "./components/OpportunitiesTable";
import { hasSupabaseConfig, supabase } from "./lib/supabase";
import type { FiltersState, KpiMetrics, Opportunity } from "./types";

const defaultFilters: FiltersState = {
  search: "",
  decision: "ALL",
  serviceArea: "ALL",
  minFitScore: 0,
  sortBy: "fit_score",
};

const filterStorageKey = "etimad-dashboard-filters";
const themeStorageKey = "etimad-dashboard-theme";

function loadFilters(): FiltersState {
  try {
    const stored = localStorage.getItem(filterStorageKey);
    return stored ? { ...defaultFilters, ...JSON.parse(stored) } : defaultFilters;
  } catch {
    return defaultFilters;
  }
}

function App() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [filters, setFilters] = useState<FiltersState>(loadFilters);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem(themeStorageKey) === "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    localStorage.setItem(themeStorageKey, isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem(filterStorageKey, JSON.stringify(filters));
  }, [filters]);

  const fetchOpportunities = useCallback(async () => {
    if (!hasSupabaseConfig || !supabase) return;

    setIsLoading(true);
    setError(null);

    const { data, error: supabaseError } = await supabase
      .from("matched_opportunities")
      .select("*")
      .order("fit_score", { ascending: false });

    if (supabaseError) {
      setError(supabaseError.message);
      setOpportunities([]);
    } else {
      setOpportunities((data ?? []) as Opportunity[]);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const serviceAreas = useMemo(
    () =>
      Array.from(
        new Set(opportunities.map((item) => item.best_service_area).filter((area): area is string => Boolean(area))),
      ).sort((a, b) => a.localeCompare(b)),
    [opportunities],
  );

  const filteredOpportunities = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    const filtered = opportunities.filter((opportunity) => {
      const searchable = [
        opportunity.title,
        opportunity.reference_number,
        opportunity.government_entity,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const score = opportunity.fit_score ?? 0;
      const decision = opportunity.decision?.toUpperCase();
      const matchesDecision =
        filters.decision === "ALL"
          ? decision === "MATCHED" || decision === "REVIEW"
          : decision === filters.decision;

      return (
        (!query || searchable.includes(query)) &&
        matchesDecision &&
        (filters.serviceArea === "ALL" || opportunity.best_service_area === filters.serviceArea) &&
        score >= filters.minFitScore
      );
    });

    return filtered.sort((a, b) => compareBySortKey(a, b, filters.sortBy));
  }, [filters, opportunities]);

  const metrics = useMemo<KpiMetrics>(() => {
    return {
      total: filteredOpportunities.length,
      matched: filteredOpportunities.filter((item) => item.decision?.toUpperCase() === "MATCHED").length,
      review: filteredOpportunities.filter((item) => item.decision?.toUpperCase() === "REVIEW").length,
      rejected: filteredOpportunities.filter((item) => item.decision?.toUpperCase() === "REJECTED").length,
    };
  }, [filteredOpportunities]);

  const exportCsv = () => {
    const headers = [
      "reference_number",
      "title",
      "government_entity",
      "main_activity",
      "opening_date",
      "details_url",
      "decision",
      "fit_score",
      "confidence",
      "best_service_area",
      "reason_ar",
      "recommended_action",
      "last_seen_at",
    ];
    const csvRows = [
      headers.join(","),
      ...filteredOpportunities.map((row) =>
        headers.map((header) => csvEscape(row[header as keyof Opportunity])).join(","),
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `etimad-opportunities-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (!hasSupabaseConfig) {
    return <SetupMessage isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode((value) => !value)} />;
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-right text-slate-950 dark:bg-slate-950 dark:text-white" dir="rtl" lang="ar">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white/80 px-5 py-5 shadow-sm shadow-slate-200/50 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-slate-950 dark:text-white sm:text-3xl">
              فرص اعتماد الذكية
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              مناقصات مطابقة أو تحتاج مراجعة، جاهزة للفرز السريع.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsDarkMode((value) => !value)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
            title="تبديل الوضع الداكن"
          >
            {isDarkMode ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
            {isDarkMode ? "فاتح" : "داكن"}
          </button>
        </header>

        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <div className="font-semibold">تعذر تحميل الفرص</div>
              <div className="mt-1">{error}</div>
            </div>
          </div>
        )}

        <KpiCards metrics={metrics} />

        <Filters
          filters={filters}
          serviceAreas={serviceAreas}
          onFiltersChange={setFilters}
          onRefresh={fetchOpportunities}
          onExportCsv={exportCsv}
          isLoading={isLoading}
        />

        {isLoading ? <LoadingState /> : <OpportunitiesTable opportunities={filteredOpportunities} onSelect={setSelectedOpportunity} />}
      </div>

      <OpportunityDrawer opportunity={selectedOpportunity} onClose={() => setSelectedOpportunity(null)} />
    </main>
  );
}

function compareBySortKey(a: Opportunity, b: Opportunity, key: FiltersState["sortBy"]) {
  if (key === "fit_score") return (b.fit_score ?? -1) - (a.fit_score ?? -1);
  const left = a[key] ? new Date(a[key] as string).getTime() : 0;
  const right = b[key] ? new Date(b[key] as string).getTime() : 0;
  return right - left;
}

function csvEscape(value: Opportunity[keyof Opportunity]) {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
}

function LoadingState() {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/85 p-10 text-center shadow-sm shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
      <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900 dark:border-slate-700 dark:border-t-white" />
      <div className="mt-4">
        <h2 className="text-sm font-semibold text-slate-950 dark:text-white">جاري تحميل الفرص</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">يتم جلب أحدث تقييمات الذكاء الاصطناعي.</p>
      </div>
    </section>
  );
}

function SetupMessage({ isDarkMode, onToggleTheme }: { isDarkMode: boolean; onToggleTheme: () => void }) {
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-right text-slate-950 dark:bg-slate-950 dark:text-white" dir="rtl" lang="ar">
      <section className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-slate-500 dark:text-slate-400">
              فرص اعتماد الذكية
            </p>
            <h1 className="mt-1 text-2xl font-semibold">إعداد Supabase مطلوب</h1>
          </div>
          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            title="تبديل الوضع الداكن"
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          أضف رابط مشروع Supabase ومفتاح anon العام داخل ملف البيئة المحلي، ثم أعد تشغيل خادم Vite.
          لن يتم عرض بيانات تجريبية قبل ضبط هذه القيم.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-md bg-slate-950 p-4 text-sm text-slate-100">
{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key`}
        </pre>
      </section>
    </main>
  );
}

export default App;
