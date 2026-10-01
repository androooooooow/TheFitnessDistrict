import { useEffect, useRef } from 'react';
import { X, ArrowUpRight, ChevronRight, Dumbbell, Check, AlertCircle } from 'lucide-react';
import { useGym } from '../context/GymContext';

export function Brand({ inverse = false }) {
  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center ${inverse ? 'rounded-2xl bg-white px-4 py-2' : ''}`}
    >
      <img
        src="/branding/fit-district-logo.png"
        alt="The Fit District — Fitness Hub"
        width="184"
        height="108"
        className="h-[108px] w-[184px] object-cover object-[center_40%]"
        fetchPriority="high"
      />
    </div>
  );
}
export function Button({ children, variant = 'primary', className = '', ...props }) {
  return (
    <button
      className={`btn ${variant === 'primary' ? 'btn-primary' : variant === 'danger' ? 'btn-danger' : variant === 'ghost' ? 'btn-ghost' : 'btn-secondary'} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
export function Badge({ status }) {
  const colors = {
    Active: 'bg-emerald-50 text-emerald-700',
    Expired: 'bg-rose-50 text-rose-600',
    Suspended: 'bg-amber-50 text-amber-700',
    Pending: 'bg-orange-50 text-orange-700',
    Exhausted: 'bg-rose-50 text-rose-600',
    Scheduled: 'bg-blue-50 text-blue-700',
    Revoked: 'bg-rose-50 text-rose-600',
    'In gym': 'bg-emerald-50 text-emerald-700',
    Completed: 'bg-slate-100 text-slate-600',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-semibold ${colors[status] || 'bg-slate-100 text-slate-600'}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}
const avatarColors = [
  'bg-orange-100 text-orange-700',
  'bg-violet-100 text-violet-700',
  'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700',
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
];
export function Avatar({ member, size = 'normal' }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${size === 'large' ? 'h-16 w-16 text-xl' : 'h-9 w-9 text-xs'} ${avatarColors[member?.color % 6] || avatarColors[0]}`}
    >
      {(member?.name || 'Admin')
        .split(' ')
        .slice(0, 2)
        .map((x) => x[0])
        .join('')}
    </span>
  );
}
export function Panel({ children, className = '', ...props }) {
  return (
    <section className={`panel ${className}`} {...props}>
      {children}
    </section>
  );
}
export function PageTitle({ eyebrow, title, description, action }) {
  return (
    <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.14em] text-muted">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[28px] font-bold leading-tight tracking-[-1px] sm:text-[30px]">
          {title}
        </h1>
        <p className="mt-2 text-[13px] text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
export function PanelTitle({ title, subtitle, action }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-[15px] font-bold tracking-[-.3px]">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
export function StatCard({ label, value, icon: Icon, note, trend, color = 'orange' }) {
  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted">{label}</p>
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${color === 'orange' ? 'bg-orange-50 text-brand-strong' : color === 'green' ? 'bg-emerald-50 text-emerald-600' : color === 'blue' ? 'bg-sky-50 text-sky-600' : 'bg-violet-50 text-violet-600'}`}
        >
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-3 text-[30px] font-bold leading-none tracking-[-1px]">{value}</p>
      <div className="mt-3 flex items-center gap-1.5 text-[11px]">
        {trend && (
          <span className="flex items-center font-semibold text-emerald-600">
            <ArrowUpRight size={13} />
            {trend}
          </span>
        )}
        <span className="text-muted">{note}</span>
      </div>
    </Panel>
  );
}
export function Empty({ icon: Icon = Dumbbell, title, description, action }) {
  return (
    <div className="flex flex-col items-center px-5 py-12 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-brand-strong">
        <Icon size={25} />
      </span>
      <h3 className="text-sm font-bold">{title}</h3>
      <p className="mt-2 max-w-sm text-xs leading-6 text-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[11px] text-muted">{hint}</span>}
    </label>
  );
}
export function Modal({ title, description, children, onClose }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const scroll = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector('input, select, button')?.focus();
    function key(event) {
      if (event.key === 'Escape') closeRef.current();
      if (event.key === 'Tab') {
        const items = [
          ...ref.current.querySelectorAll(
            'button:not(:disabled), input, select, textarea, a[href]',
          ),
        ];
        const first = items[0];
        const last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = scroll;
      document.removeEventListener('keydown', key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 id="modal-title" className="text-xl font-bold tracking-tight">
              {title}
            </h2>
            {description && <p className="mt-2 text-xs leading-5 text-muted">{description}</p>}
          </div>
          <button onClick={onClose} aria-label="Close dialog" className="icon-btn">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Toast() {
  const { toast, dismissToast } = useGym();
  return (
    toast && (
      <div
        role={toast.error ? 'alert' : 'status'}
        className="fixed bottom-5 right-5 z-[60] flex max-w-[calc(100vw-2.5rem)] items-center gap-3 rounded-xl border border-line bg-white px-5 py-4 shadow-xl"
      >
        {toast.error ? (
          <AlertCircle className="shrink-0 text-rose-500" size={19} />
        ) : (
          <Check className="shrink-0 text-emerald-600" size={19} />
        )}
        <p className="text-xs leading-5">{toast.message}</p>
        <button aria-label="Dismiss notification" onClick={dismissToast} className="icon-btn">
          <X size={16} />
        </button>
      </div>
    )
  );
}
export function TextLink({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-strong hover:underline"
    >
      {children}
      <ChevronRight size={14} />
    </button>
  );
}
export const dateLabel = (value) =>
  value
    ? new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(value.includes('T') ? value : `${value}T12:00:00+08:00`))
    : '—';
export const timeLabel = (value) =>
  value
    ? new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(new Date(value))
    : '—';
export function duration(visit) {
  if (!visit.out) return 'In progress';
  const minutes = Math.max(0, Math.round((new Date(visit.out) - new Date(visit.in)) / 60000));
  return `${Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)}h ` : ''}${minutes % 60}m`;
}
