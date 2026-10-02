import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Activity,
  Clock3,
  Plus,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Flame,
  AlertCircle,
} from 'lucide-react';
import {
  Panel,
  PageTitle,
  PanelTitle,
  StatCard,
  Button,
  Avatar,
  Badge,
  TextLink,
  Empty,
  timeLabel,
  dateLabel,
} from '../../components/UI';
import { AttendanceChart, MembershipDonut } from '../../components/Charts';
import { useGym } from '../../context/GymContext';
import { localDate, addDays, accessStatus, plans } from '../../lib/domain';

export default function Overview() {
  const { state } = useGym();
  const navigate = useNavigate();
  const [days, setDays] = useState(7);
  const today = localDate();
  const active = state.members.filter((m) => accessStatus(m) === 'Active');
  const todayVisits = state.visits.filter((v) => localDate(v.in) === today);
  const inside = state.visits.filter((v) => !v.out);
  const period = state.visits.filter((v) => localDate(v.in) >= addDays(today, -days + 1));
  const expiring = active
    .filter((m) => m.access.end <= addDays(today, 7))
    .sort((a, b) => a.access.end.localeCompare(b.access.end));
  const pending = state.members.filter((m) => accessStatus(m) === 'Pending');
  const recent = state.visits.slice(0, 5);
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Manila',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(new Date()),
  );
  return (
    <>
      <PageTitle
        title={`Good ${hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}, Admin`}
        description="Here’s what’s happening in your district today."
        action={
          <Button onClick={() => navigate('/admin/attendance')}>
            <Plus size={16} />
            Show gym QR
          </Button>
        }
      />
      <div className="hero-banner relative mb-6 flex min-h-[152px] items-center overflow-hidden rounded-2xl border border-[#f1dfc0] bg-[#fff5e9] px-6 sm:px-8">
        <div className="relative z-10 max-w-[65%]">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-[#b56442]">
            <Flame size={12} />
            Built for better days
          </span>
          <h2 className="max-w-[400px] text-[23px] font-bold leading-[1.25] tracking-[-.8px] sm:text-[27px]">
            Stronger members.
            <br />A stronger community.
          </h2>
          <p className="mt-2 text-xs text-[#9c7767]">
            Every check-in is a step forward. Let’s make it count.
          </p>
        </div>
        <GymArt />
        <span className="absolute bottom-4 right-6 hidden items-center gap-1.5 text-[9px] font-medium text-[#a7755f] sm:flex">
          <CalendarDays size={12} />
          {dateLabel(today)}
        </span>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Total members"
          value={state.members.length}
          icon={Users}
          note="in your community"
        />
        <StatCard
          label="Active memberships"
          value={active.length}
          icon={UserCheck}
          color="green"
          note={`${state.members.length - active.length} need attention`}
        />
        <StatCard
          label="Today’s check-ins"
          value={todayVisits.length}
          icon={Activity}
          color="blue"
          note={`${new Set(todayVisits.map((v) => v.memberId)).size} unique members`}
        />
        <StatCard
          label="Currently in gym"
          value={inside.length}
          icon={Clock3}
          color="purple"
          note="members working on themselves"
        />
      </div>
      <div className="mb-6 grid gap-5 xl:grid-cols-[1.9fr_1fr]">
        <Panel className="p-5 sm:p-6">
          <PanelTitle
            title="Attendance activity"
            subtitle="A little consistency makes a big difference."
            action={
              <select
                aria-label="Attendance chart period"
                className="small-select"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
              </select>
            }
          />
          <div className="flex items-end justify-between">
            <div>
              <span className="text-[27px] font-bold tracking-tight">{period.length}</span>
              <span className="ml-2 text-xs text-muted">total visits</span>
            </div>
            <div className="flex gap-3 text-[9px] text-muted">
              <span className="flex items-center gap-1.5">
                <i className="h-2 w-2 rounded-sm bg-[#ffe1b3]" />
                Before noon
              </span>
              <span className="flex items-center gap-1.5">
                <i className="h-2 w-2 rounded-sm bg-brand" />
                After noon
              </span>
            </div>
          </div>
          <AttendanceChart visits={state.visits} days={days} />
        </Panel>
        <Panel className="p-5 sm:p-6">
          <PanelTitle title="Membership mix" subtitle="Active access, at a glance." />
          <MembershipDonut members={state.members} />
        </Panel>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.9fr_1fr]">
        <Panel className="overflow-hidden">
          <div className="px-5 pt-5 sm:px-6">
            <PanelTitle
              title="Recent check-ins"
              subtitle="The faces showing up for themselves."
              action={<TextLink onClick={() => navigate('/admin/attendance')}>View all</TextLink>}
            />
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Membership</th>
                  <th>Time in</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((v) => {
                  const member = state.members.find((m) => m.id === v.memberId);
                  return (
                    <tr key={v.id}>
                      <td>
                        <button
                          className="flex items-center gap-2.5 text-left"
                          onClick={() => navigate(`/admin/members?member=${member.id}`)}
                        >
                          <Avatar member={member} />
                          <span>
                            <span className="block font-semibold">{member.name}</span>
                            <span className="mt-1 block text-[10px] text-muted">{member.code}</span>
                          </span>
                        </button>
                      </td>
                      <td>{plans.find((p) => p.id === member.access?.planId)?.short || '—'}</td>
                      <td>{timeLabel(v.in)}</td>
                      <td>
                        <Badge status={v.out ? 'Completed' : 'In gym'} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!recent.length && (
            <Empty
              title="Ready for the first arrival"
              description="Member QR scans will appear in your attendance history."
            />
          )}
          <div className="flex items-center justify-between border-t border-line px-6 py-3 text-[10px] text-muted">
            <span>Showing {recent.length} most recent visits</span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Up to date
            </span>
          </div>
        </Panel>
        <Panel className="p-5 sm:p-6">
          <PanelTitle
            title="A little attention"
            subtitle="Keep your members moving."
            action={
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-orange-50 text-[11px] font-bold text-brand-strong">
                {expiring.length + pending.length}
              </span>
            }
          />
          <div className="space-y-4">
            {expiring.map((m) => (
              <button
                key={m.id}
                className="flex w-full items-center gap-3 text-left"
                onClick={() => navigate(`/admin/memberships?member=${m.id}`)}
              >
                <Avatar member={m} />
                <div className="flex-1">
                  <p className="text-xs font-semibold">{m.name}</p>
                  <p className="mt-1 text-[10px] text-muted">Expires {dateLabel(m.access.end)}</p>
                </div>
                <ArrowUpRight size={15} className="text-muted" />
              </button>
            ))}
            {pending.map((m) => (
              <button
                key={m.id}
                className="flex w-full items-center gap-3 text-left"
                onClick={() => navigate(`/admin/memberships?member=${m.id}`)}
              >
                <Avatar member={m} />
                <div className="flex-1">
                  <p className="text-xs font-semibold">{m.name}</p>
                  <p className="mt-1 text-[10px] text-amber-600">Waiting for activation</p>
                </div>
                <ArrowUpRight size={15} className="text-muted" />
              </button>
            ))}
            {!expiring.length && !pending.length && (
              <Empty title="All caught up" description="No memberships need attention this week." />
            )}
          </div>
          <div className="mt-6 rounded-lg bg-canvas p-3">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold">
              <AlertCircle size={13} className="text-brand-strong" />A friendly reminder
            </p>
            <p className="mt-1.5 text-[10px] leading-5 text-muted">
              Members pay at the counter. Activate or renew their access here afterward.
            </p>
          </div>
        </Panel>
      </div>
    </>
  );
}
export function GymArt() {
  return (
    <svg
      className="absolute -right-6 top-0 h-full w-[47%] max-w-[430px]"
      viewBox="0 0 430 200"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="275" cy="98" r="122" stroke="#f5dcad" strokeWidth="1" />
      <circle cx="275" cy="98" r="98" stroke="#f5dcad" strokeWidth="1" />
      <circle cx="275" cy="98" r="74" fill="#ffecc6" />
      <g transform="translate(265 93) rotate(-27)">
        <rect x="-55" y="-9" width="110" height="18" rx="4" fill="#c37621" />
        <rect x="-61" y="-47" width="20" height="94" rx="6" fill="#e4ad62" />
        <rect x="-80" y="-35" width="18" height="70" rx="5" fill="#efd0a3" />
        <rect x="41" y="-47" width="20" height="94" rx="6" fill="#e4ad62" />
        <rect x="62" y="-35" width="18" height="70" rx="5" fill="#efd0a3" />
        <rect x="-52" y="-8" width="3" height="16" rx="1.5" fill="#a96a24" />
        <rect x="49" y="-8" width="3" height="16" rx="1.5" fill="#a96a24" />
      </g>
      <path
        d="M150 39h10m-5-5v10M373 141h10m-5-5v10"
        stroke="#d1a169"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="168" cy="164" r="3" fill="#d1a169" />
      <circle cx="363" cy="33" r="3" fill="#d1a169" />
    </svg>
  );
}
