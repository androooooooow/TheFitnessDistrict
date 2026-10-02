import { useEffect, useState } from 'react';
import { ScrollText, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import Pagination from '../../components/Pagination';
import { PAGE_SIZE, pagination } from '../../lib/pagination';
import { useGym } from '../../context/GymContext';
import { localDate } from '../../lib/domain';
import { PageTitle, Panel, Button, Empty, dateLabel, timeLabel } from '../../components/UI';
const actions = {
  'membership.activate': 'Membership activated',
  'membership.status': 'Access status changed',
  'attendance.time_in': 'QR time-in',
  'attendance.time_out': 'QR time-out',
  'account.created': 'Account verified',
  'account.login': 'Signed in',
  'account.logout': 'Signed out',
  'profile.updated': 'Profile updated',
  'progress.recorded': 'Progress recorded',
  'progress.updated': 'Progress updated',
  'goal.updated': 'Goal updated',
};
function details(e) {
  const d = e.details;
  if (e.action === 'membership.activate')
    return `${d.planId} · ${d.rateCategory === 'student' ? 'Student' : 'Non-student'} · ₱${d.listedRate?.toLocaleString()} · Counter payment confirmed`;
  if (e.action === 'membership.status') return `${d.from} → ${d.to}`;
  if (e.action.startsWith('attendance.')) return 'Saved by the member using the gym QR';
  if (e.action === 'goal.updated') return `${d.metric} goal`;
  if (e.action.startsWith('progress.'))
    return `${d.metric} · ${d.source === 'profile' ? 'From profile' : 'Progress journal'}`;
  return 'Account activity';
}
export default function AuditLog() {
  const { authUser } = useGym();
  const [action, setAction] = useState(''),
    [day, setDay] = useState(''),
    [page, setPage] = useState(0),
    [revision, setRevision] = useState(0),
    [data, setData] = useState({ entries: [], total: 0 }),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!authUser) {
      setLoading(false);
      return;
    }
    let live = true;
    const load = async () => {
      const query = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
        ...(action ? { action } : {}),
        ...(day ? { date: day } : {}),
      });
      try {
        const result = await api(`/gym/audit?${query}`);
        if (live) {
          const validPage = pagination(result.total, page).page;
          if (validPage !== page) {
            setPage(validPage);
            return;
          }
          setData(result);
          setError('');
        }
      } catch (e) {
        if (live) setError(e.message);
      } finally {
        if (live) setLoading(false);
      }
    };
    setLoading(true);
    load();
    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, 10000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [authUser?.id, action, day, page, revision]);
  return (
    <>
      <PageTitle
        title="A clear record of every action"
        description="Attendance, memberships, progress, goals, and account activity."
        action={
          <Button variant="secondary" onClick={() => setRevision((v) => v + 1)} disabled={loading}>
            <RefreshCw size={15} />
            Refresh
          </Button>
        }
      />
      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-4 text-xs text-rose-700">
          {error}
        </p>
      )}
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-5">
          <select
            className="small-select"
            aria-label="Audit action"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All actions</option>
            {Object.entries(actions).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <input
            type="date"
            aria-label="Audit date"
            className="small-select"
            max={localDate()}
            value={day}
            onChange={(e) => {
              setDay(e.target.value);
              setPage(0);
            }}
          />
          {day && (
            <button
              className="text-xs text-muted underline"
              onClick={() => {
                setDay('');
                setPage(0);
              }}
            >
              Clear date
            </button>
          )}
          <span className="ml-auto text-xs text-muted">{data.total} entries</span>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>Action</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((e) => (
                <tr key={e.id}>
                  <td>
                    {dateLabel(e.occurredAt)}
                    <span className="mt-1 block text-[10px] text-muted">
                      {timeLabel(e.occurredAt)}
                    </span>
                  </td>
                  <td>
                    <span className="font-semibold">{e.actor}</span>
                    <span className="mt-1 block text-[10px] capitalize text-muted">
                      {e.actorRole}
                    </span>
                  </td>
                  <td>
                    {actions[e.action] || e.action}
                    <span className="mt-1 block max-w-52 break-all text-[10px] text-muted">
                      {e.entityType}: {e.entityId}
                    </span>
                  </td>
                  <td className="max-w-xs whitespace-normal text-muted">{details(e)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.entries.length && (
          <Empty
            icon={ScrollText}
            title={loading ? 'Loading audit log…' : 'No activity in this view'}
            description={
              authUser
                ? 'New actions will appear here automatically.'
                : 'Audit logs are available with the connected backend.'
            }
          />
        )}
        <Pagination
          total={data.total}
          page={page}
          onPageChange={setPage}
          label="audit entries"
          disabled={loading}
        />
      </Panel>
      <p className="mt-4 text-[10px] text-muted">
        Records are read-only. Times are displayed in Asia/Manila.
      </p>
    </>
  );
}
