import { useState } from 'react';
import { Search, LogIn, LogOut, ScanLine, Clock3, Users, CalendarDays } from 'lucide-react';
import { useGym } from '../../context/GymContext';
import { accessStatus, localDate, plans } from '../../lib/domain';
import {
  PageTitle,
  Panel,
  PanelTitle,
  Button,
  Avatar,
  Badge,
  StatCard,
  Empty,
  dateLabel,
  timeLabel,
  duration,
} from '../../components/UI';

export default function Attendance({ user = false }) {
  const { state, checkIn, checkOut, userId } = useGym();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('Today');
  const [day, setDay] = useState(localDate());
  const inside = state.visits.filter((v) => !v.out);
  const ownVisits = user ? state.visits.filter((v) => v.memberId === userId) : state.visits;
  const todayVisits = ownVisits.filter((v) => localDate(v.in) === localDate());
  const matches = query.trim()
    ? state.members
        .filter((m) => `${m.name} ${m.code} ${m.email}`.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5)
    : [];
  const shown = ownVisits.filter((v) =>
    tab === 'Currently inside' ? !v.out : tab === 'Today' ? localDate(v.in) === day : true,
  );
  return (
    <>
      <PageTitle
        title={user ? 'Every visit counts' : 'Make every arrival count'}
        description={
          user
            ? 'Your time, your consistency, your journey.'
            : 'A warm welcome in. A smooth check-out. All in one place.'
        }
      />
      {!user && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Currently inside"
            value={inside.length}
            icon={Users}
            color="green"
            note="open visits"
          />
          <StatCard
            label="Today’s arrivals"
            value={todayVisits.length}
            icon={LogIn}
            note="successful check-ins"
          />
          <StatCard
            label="Today’s departures"
            value={todayVisits.filter((v) => v.out).length}
            icon={LogOut}
            color="blue"
            note="completed visits"
          />
        </div>
      )}
      {!user && (
        <Panel className="mb-6 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-brand-strong">
              <ScanLine size={28} />
            </span>
            <div className="min-w-48 flex-1">
              <h2 className="text-sm font-bold">Check in a member</h2>
              <p className="mt-1.5 text-xs text-muted">
                Search their name, or enter the member ID from their card.
              </p>
            </div>
            <div className="relative w-full sm:w-80">
              <Search size={17} className="absolute left-3.5 top-3 text-muted" />
              <input
                aria-label="Find member to check in"
                className="input pl-10"
                placeholder="Name or member ID, e.g. FD-1001"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          {query && (
            <div className="mt-5 border-t border-line pt-2">
              {matches.length ? (
                matches.map((m) => {
                  const open = inside.find((v) => v.memberId === m.id);
                  return (
                    <div
                      key={m.id}
                      className="flex flex-wrap items-center gap-3 border-b border-line py-3 last:border-0"
                    >
                      <Avatar member={m} />
                      <div className="flex-1">
                        <p className="text-xs font-semibold">{m.name}</p>
                        <p className="mt-1 text-[10px] text-muted">
                          {m.code} ·{' '}
                          {plans.find((p) => p.id === m.access?.planId)?.short || 'No plan'}
                        </p>
                      </div>
                      <Badge status={open ? 'In gym' : accessStatus(m)} />
                      <Button
                        variant={open ? 'secondary' : 'primary'}
                        onClick={() => {
                          const result = open ? checkOut(open.id) : checkIn(m.id);
                          if (result) setQuery('');
                        }}
                      >
                        {open ? (
                          <>
                            <LogOut size={14} />
                            Check out
                          </>
                        ) : (
                          <>
                            <LogIn size={14} />
                            Check in
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })
              ) : (
                <p className="py-4 text-xs text-muted">
                  No member found. Try their name or full member ID.
                </p>
              )}
            </div>
          )}
        </Panel>
      )}
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-5">
          <div className="flex rounded-lg bg-canvas p-1">
            {['Today', ...(!user ? ['Currently inside'] : []), 'All visits'].map((t) => (
              <button
                key={t}
                className={`tab ${tab === t ? 'tab-active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          {tab === 'Today' && (
            <label className="flex items-center gap-2 text-xs text-muted">
              <CalendarDays size={15} />
              <input
                className="small-select"
                type="date"
                aria-label="Attendance date"
                max={localDate()}
                value={day}
                onChange={(e) => setDay(e.target.value)}
              />
            </label>
          )}
          <span className="text-[11px] text-muted">{shown.length} visits</span>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                {!user && <th>Member</th>}
                <th>Date</th>
                <th>Time in</th>
                <th>Time out</th>
                <th>Duration</th>
                <th>Status</th>
                {!user && <th></th>}
              </tr>
            </thead>
            <tbody>
              {shown.slice(0, 100).map((v) => {
                const m = state.members.find((m) => m.id === v.memberId);
                return (
                  <tr key={v.id}>
                    {!user && (
                      <td>
                        <div className="flex items-center gap-2.5">
                          <Avatar member={m} />
                          <span>
                            <span className="block font-semibold">{m?.name || 'Member'}</span>
                            <span className="mt-1 block text-[10px] text-muted">{m?.code}</span>
                          </span>
                        </div>
                      </td>
                    )}
                    <td>{dateLabel(v.in)}</td>
                    <td>{timeLabel(v.in)}</td>
                    <td>{timeLabel(v.out)}</td>
                    <td className="text-muted">{duration(v)}</td>
                    <td>
                      <Badge status={v.out ? 'Completed' : 'In gym'} />
                    </td>
                    {!user && (
                      <td>
                        {!v.out && (
                          <Button variant="secondary" onClick={() => checkOut(v.id)}>
                            <LogOut size={13} />
                            Check out
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!shown.length && (
          <Empty
            icon={Clock3}
            title="A fresh start"
            description="No visits in this view yet. Your next check-in will appear here."
          />
        )}
        {shown.length > 100 && (
          <p className="p-4 text-xs text-muted">Showing the 100 most recent matching visits.</p>
        )}
      </Panel>
      <p className="mt-4 text-[10px] text-muted">
        Times shown in Asia/Manila. Open visits are excluded from duration averages.
      </p>
    </>
  );
}
