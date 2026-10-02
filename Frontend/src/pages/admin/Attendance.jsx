import { useCallback, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { LogIn, LogOut, Clock3, Users, CalendarDays, RefreshCw, ScanLine } from 'lucide-react';
import { useGym } from '../../context/GymContext';
import { localDate } from '../../lib/domain';
import { api } from '../../lib/api';
import AttendanceScanner from '../../components/AttendanceScanner';
import {
  PageTitle,
  Panel,
  Button,
  Avatar,
  Badge,
  StatCard,
  Empty,
  dateLabel,
  timeLabel,
  duration,
} from '../../components/UI';
function GymQr({ enabled }) {
  const [qr, setQr] = useState(null),
    [error, setError] = useState(''),
    [now, setNow] = useState(Date.now()),
    [loading, setLoading] = useState(false);
  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      setQr(await api('/gym/attendance/qr'));
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [enabled]);
  useEffect(() => {
    let live = true;
    const load = async () => {
      if (!enabled) return;
      try {
        const result = await api('/gym/attendance/qr');
        if (live) {
          setQr(result);
          setError('');
        }
      } catch (e) {
        if (live) setError(e.message);
      }
    };
    load();
    const rotate = setInterval(() => {
        if (!document.hidden) load();
      }, 60000),
      tick = setInterval(() => setNow(Date.now()), 1000);
    window.addEventListener('focus', load);
    return () => {
      live = false;
      clearInterval(rotate);
      clearInterval(tick);
      window.removeEventListener('focus', load);
    };
  }, [enabled]);
  const remaining = qr
    ? Math.max(0, Math.ceil((new Date(qr.expiresAt).getTime() - now) / 1000))
    : 0;
  return (
    <Panel className="mb-6 p-5 sm:p-6">
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <div
          className="flex w-full max-w-[368px] shrink-0 items-center justify-center rounded-xl border border-line bg-white p-4 sm:w-[368px]"
          aria-label="Rotating gym attendance QR"
        >
          {qr && remaining > 0 ? (
            <QRCodeSVG
              value={`fit-district:attendance:${qr.token}`}
              size={336}
              className="h-auto w-full"
              marginSize={4}
              level="M"
              title="Scan this gym QR from My attendance"
            />
          ) : (
            <div className="text-center">
              <ScanLine className="mx-auto mb-3 text-muted" size={40} />
              <p className="text-xs text-muted">
                {enabled ? 'Waiting for a fresh gym QR…' : 'Connect the backend to display a QR.'}
              </p>
            </div>
          )}
        </div>
        <div className="max-w-lg">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-strong">
            Member self attendance
          </p>
          <h2 className="mt-2 text-xl font-bold">One scan. Visit recorded.</h2>
          <p className="mt-3 text-xs leading-6 text-muted">
            Keep this screen visible at the gym. Members open <strong>My attendance</strong> on
            their own device and scan to time in or time out. Visits appear below automatically.
          </p>
          <div className="my-4 flex items-center gap-2 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${remaining > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`}
            />
            {remaining > 0
              ? `QR valid for ${remaining}s · refreshes every minute`
              : 'QR unavailable or expired'}
          </div>
          <Button variant="secondary" disabled={!enabled || loading} onClick={refresh}>
            <RefreshCw size={14} />
            {loading ? 'Refreshing…' : 'Refresh gym QR'}
          </Button>
          {error && (
            <p role="alert" className="mt-3 text-xs text-rose-700">
              {error}
            </p>
          )}
        </div>
      </div>
    </Panel>
  );
}
export default function Attendance({ user = false }) {
  const { state, userId, authUser } = useGym();
  const [tab, setTab] = useState('today'),
    [day, setDay] = useState(localDate()),
    [page, setPage] = useState(0);
  const [data, setData] = useState({
      visits: [],
      total: 0,
      stats: { inside: 0, arrivals: 0, departures: 0 },
    }),
    [error, setError] = useState(''),
    [loaded, setLoaded] = useState(false);
  const refresh = useCallback(async () => {
    if (!authUser) return;
    const query = new URLSearchParams({
      scope: tab,
      limit: '25',
      offset: String(page * 25),
      ...(tab === 'today' ? { date: day } : {}),
    });
    setData(await api(`/gym/attendance?${query}`));
    setError('');
    setLoaded(true);
  }, [authUser?.id, tab, day, page]);
  useEffect(() => {
    if (!authUser) return;
    let live = true;
    const load = async () => {
      const query = new URLSearchParams({
        scope: tab,
        limit: '25',
        offset: String(page * 25),
        ...(tab === 'today' ? { date: day } : {}),
      });
      try {
        const result = await api(`/gym/attendance?${query}`);
        if (live) {
          setData(result);
          setError('');
          setLoaded(true);
        }
      } catch (e) {
        if (live) {
          setError(e.message);
          setLoaded(true);
        }
      }
    };
    setLoaded(false);
    load();
    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, 5000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [authUser?.id, tab, day, page]);
  const own = state.visits.filter((v) => !user || v.memberId === userId),
    sample = own.filter((v) =>
      tab === 'inside' ? !v.out : tab === 'today' ? localDate(v.in) === day : true,
    );
  const shown = authUser ? data.visits : sample.slice(page * 25, (page + 1) * 25),
    total = authUser ? data.total : sample.length,
    open = own.find((v) => !v.out);
  return (
    <>
      <PageTitle
        title={user ? 'Every visit counts' : 'Make every arrival count'}
        description={
          user
            ? 'Scan the gym QR. Keep your attendance up to date.'
            : 'Member scans are recorded here automatically.'
        }
      />
      {!user && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Currently inside"
            value={authUser ? data.stats.inside : own.filter((v) => !v.out).length}
            icon={Users}
            color="green"
            note="open visits"
          />
          <StatCard
            label="Today’s arrivals"
            value={
              authUser
                ? data.stats.arrivals
                : own.filter((v) => localDate(v.in) === localDate()).length
            }
            icon={LogIn}
            note="successful time-ins"
          />
          <StatCard
            label="Today’s departures"
            value={
              authUser
                ? data.stats.departures
                : own.filter((v) => v.out && localDate(v.out) === localDate()).length
            }
            icon={LogOut}
            color="blue"
            note="successful time-outs"
          />
        </div>
      )}
      {user ? (
        <AttendanceScanner open={open} onSaved={refresh} enabled={!!authUser} />
      ) : (
        <GymQr enabled={!!authUser} />
      )}
      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-4 text-xs text-rose-700">
          {error}{' '}
          <button className="underline" onClick={() => refresh().catch((e) => setError(e.message))}>
            Try again
          </button>
        </p>
      )}
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-5">
          <div className="flex rounded-lg bg-canvas p-1">
            {[
              ['today', 'By date'],
              ...(!user ? [['inside', 'Currently inside']] : []),
              ['all', 'All visits'],
            ].map(([key, label]) => (
              <button
                key={key}
                className={`tab ${tab === key ? 'tab-active' : ''}`}
                onClick={() => {
                  setTab(key);
                  setPage(0);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === 'today' && (
            <label className="flex items-center gap-2 text-xs text-muted">
              <CalendarDays size={15} />
              <input
                type="date"
                className="small-select"
                aria-label="Attendance date"
                max={localDate()}
                value={day}
                onChange={(e) => {
                  if (e.target.value) {
                    setDay(e.target.value);
                    setPage(0);
                  }
                }}
              />
            </label>
          )}
          <span className="text-[11px] text-muted">{total} visits · updates every 5s</span>
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
              </tr>
            </thead>
            <tbody>
              {shown.map((v) => {
                const m = v.member || state.members.find((m) => m.id === v.memberId);
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!shown.length && (
          <Empty
            icon={Clock3}
            title={authUser && !loaded ? 'Loading attendance…' : 'A fresh start'}
            description="Your next QR scan will appear here."
          />
        )}
        <div className="flex items-center justify-between border-t border-line p-4 text-xs text-muted">
          <span>
            Page {page + 1} of {Math.max(1, Math.ceil(total / 25))}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={!page} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button
              variant="secondary"
              disabled={(page + 1) * 25 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Panel>
      <p className="mt-4 text-[10px] text-muted">
        Times are recorded by the server and displayed in Asia/Manila.
      </p>
    </>
  );
}
