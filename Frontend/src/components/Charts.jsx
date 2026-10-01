import { useId } from 'react';
import { localDate, addDays, accessStatus, plans } from '../lib/domain';

export function AttendanceChart({ visits, days = 7 }) {
  const today = localDate();
  const series = Array.from({ length: days }, (_, i) => {
    const day = addDays(today, i - days + 1);
    const selected = visits.filter((v) => localDate(v.in) === day);
    return {
      date: day,
      morning: selected.filter(
        (v) =>
          Number(
            new Intl.DateTimeFormat('en-GB', {
              timeZone: 'Asia/Manila',
              hour: '2-digit',
              hourCycle: 'h23',
            }).format(new Date(v.in)),
          ) < 12,
      ).length,
      total: selected.length,
    };
  });
  const max = Math.max(5, ...series.map((d) => d.total));
  return (
    <div
      role="img"
      aria-label={`Daily gym visits for the last ${days} days: ${series.map((d) => `${d.date}: ${d.total}`).join(', ')}`}
      className="relative mt-4 flex h-[190px] gap-3"
    >
      <div className="flex w-4 shrink-0 flex-col justify-between pb-6 text-[9px] text-slate-400">
        <span>{max}</span>
        <span>{Math.round(max / 2)}</span>
        <span>0</span>
      </div>
      <div className="relative flex flex-1 gap-3 sm:gap-5">
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-line" />
        <div className="absolute inset-x-0 top-[43%] border-t border-dashed border-line" />
        <div className="absolute inset-x-0 bottom-6 border-t border-line" />
        {series.map((d) => (
          <div
            key={d.date}
            className="relative flex flex-1 flex-col items-center justify-end gap-2"
          >
            <div
              className="group relative flex w-full max-w-12 flex-col justify-end overflow-visible"
              style={{ height: (164 * d.total) / max }}
            >
              <span className="invisible absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-ink px-2 py-1 text-[9px] text-white group-hover:visible">
                {d.total} visits
              </span>
              <div
                className="min-h-0 rounded-t-md bg-brand"
                style={{ height: `${d.total ? ((d.total - d.morning) / d.total) * 100 : 0}%` }}
              />
              <div
                className="min-h-0 bg-[#ffe1b3]"
                style={{
                  height: `${d.total ? (d.morning / d.total) * 100 : 0}%`,
                  borderTopLeftRadius: d.morning === d.total ? '6px' : 0,
                  borderTopRightRadius: d.morning === d.total ? '6px' : 0,
                }}
              />
            </div>
            <span className="h-4 text-[9px] text-muted">
              {new Date(`${d.date}T12:00:00+08:00`).toLocaleDateString('en-US', {
                weekday: 'short',
              })}
              {days > 7 ? <span className="hidden sm:inline"> {d.date.slice(-2)}</span> : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
export function MembershipDonut({ members }) {
  const active = members.filter((m) => accessStatus(m) === 'Active');
  const types = plans.map((p) => ({
    name: p.short,
    count: active.filter((m) => m.access?.planId === p.id).length,
  }));
  const colors = ['#f58b0a', '#ffc777', '#fff0d9'];
  const total = active.length;
  let offset = 0;
  const circumference = 2 * Math.PI * 52;
  return (
    <>
      <div className="relative mx-auto my-2 h-40 w-40">
        <svg
          viewBox="0 0 144 144"
          className="h-full w-full -rotate-90"
          role="img"
          aria-label={`Active membership mix: ${types.map((t) => `${t.name} ${t.count}`).join(', ')}`}
        >
          <circle cx="72" cy="72" r="52" fill="none" stroke="#f2f3f5" strokeWidth="17" />
          {types.map((t, i) => {
            const length = total ? (t.count / total) * circumference : 0;
            const before = offset;
            offset += length;
            return (
              <circle
                key={t.name}
                cx="72"
                cy="72"
                r="52"
                fill="none"
                stroke={colors[i]}
                strokeWidth="17"
                strokeDasharray={`${Math.max(0, length - 3)} ${circumference}`}
                strokeDashoffset={-before}
                strokeLinecap="butt"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[30px] font-bold tracking-tight">{total}</span>
          <span className="mt-1 text-[10px] text-muted">active members</span>
        </div>
      </div>
      <div className="space-y-2.5">
        {types.map((t, i) => (
          <div key={t.name} className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-2 text-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: colors[i] }} />
              {t.name}
            </span>
            <span className="font-semibold">
              {t.count}
              <span className="ml-2 font-normal text-slate-400">
                {total ? Math.round((t.count / total) * 100) : 0}%
              </span>
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
export function ProgressChart({ entries, color = '#f58b0a' }) {
  const gradientId = useId().replaceAll(':', '');
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  if (!sorted.length)
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted">
        Add your first measurement to see a trend.
      </div>
    );
  const values = sorted.map((e) => e.value);
  const min = Math.min(...values) - 2;
  const max = Math.max(...values) + 2;
  const points = sorted.map((e, i) => ({
    x: 40 + (sorted.length === 1 ? 0.5 : i / (sorted.length - 1)) * 500,
    y: 155 - ((e.value - min) / (max - min)) * 125,
  }));
  const line = points.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
  return (
    <svg
      viewBox="0 0 570 205"
      className="mt-3 w-full"
      role="img"
      aria-label={`${sorted[0].metric} measurements: ${sorted.map((e) => `${e.date}: ${e.value} ${e.unit}`).join(', ')}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".14" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <line
            x1="40"
            x2="545"
            y1={30 + i * 42}
            y2={30 + i * 42}
            stroke="#e9edf2"
            strokeDasharray="4 4"
          />
          <text x="4" y={34 + i * 42} fill="#98a1af" fontSize="9">
            {(max - (i * (max - min)) / 3).toFixed(0)}
          </text>
        </g>
      ))}
      <path
        d={`${line} L ${points.at(-1).x} 163 L ${points[0].x} 163 Z`}
        fill={`url(#${gradientId})`}
      />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((p, i) => (
        <g key={sorted[i].id}>
          <circle cx={p.x} cy={p.y} r="4" fill="white" stroke={color} strokeWidth="2">
            <title>{`${sorted[i].date}: ${sorted[i].value} ${sorted[i].unit}`}</title>
          </circle>
          {(sorted.length < 9 || i % 2 === 0) && (
            <text x={p.x} y="190" textAnchor="middle" fill="#8993a2" fontSize="9">
              {new Date(`${sorted[i].date}T12:00:00+08:00`).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
