import { CheckCircle2, ClipboardList, Eye, XCircle } from "lucide-react";
import type { KpiMetrics } from "../types";

interface KpiCardsProps {
  metrics: KpiMetrics;
}

const formatScore = (value: number) => (Number.isFinite(value) ? value.toFixed(1) : "0.0");
const formatCount = (value: number) => value.toLocaleString("en-US");

export function KpiCards({ metrics }: KpiCardsProps) {
  const cards = [
    {
      label: "الإجمالي",
      value: formatCount(metrics.total),
      icon: ClipboardList,
      accent: "text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-800",
    },
    {
      label: "مطابقة",
      value: formatCount(metrics.matched),
      icon: CheckCircle2,
      accent: "text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/10",
    },
    {
      label: "للمراجعة",
      value: formatCount(metrics.review),
      icon: Eye,
      accent: "text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/10",
    },
    {
      label: "مرفوضة",
      value: formatCount(metrics.rejected),
      icon: XCircle,
      accent: "text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-500/10",
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.label}
            className="rounded-xl border border-slate-200/80 bg-white/85 p-4 shadow-sm shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none"
          >
            <div className="flex items-center gap-3">
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.accent}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{card.label}</span>
            </div>
            <div className="mt-5 text-3xl font-semibold tracking-normal text-slate-950 dark:text-white" dir="ltr">
              {card.value}
            </div>
          </div>
        );
      })}
    </section>
  );
}
