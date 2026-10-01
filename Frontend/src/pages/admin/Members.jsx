import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Mail,
  Phone,
  CalendarDays,
  CreditCard,
  Users,
} from 'lucide-react';
import { useGym } from '../../context/GymContext';
import { accessStatus, plans } from '../../lib/domain';
import {
  PageTitle,
  Panel,
  Button,
  Badge,
  Avatar,
  Modal,
  Empty,
  dateLabel,
} from '../../components/UI';
import { MemberCreate, AccessModal } from '../../components/Forms';

export default function Members() {
  const { state, suspend } = useGym();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') || '');
  const [filter, setFilter] = useState('All members');
  const [page, setPage] = useState(0);
  const [create, setCreate] = useState(false);
  const [detailId, setDetailId] = useState(params.get('member'));
  const [activateId, setActivateId] = useState(null);
  useEffect(() => {
    setSearch(params.get('q') || '');
    if (params.get('member')) setDetailId(params.get('member'));
  }, [params]);
  const filtered = state.members.filter(
    (m) =>
      `${m.name} ${m.email} ${m.code}`.toLowerCase().includes(search.toLowerCase()) &&
      (filter === 'All members' ||
        (filter === 'Needs attention' ? accessStatus(m) !== 'Active' : accessStatus(m) === filter)),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / 8));
  const currentPage = Math.min(page, pageCount - 1);
  const shown = filtered.slice(currentPage * 8, currentPage * 8 + 8);
  const detail = state.members.find((m) => m.id === detailId);
  const activating = state.members.find((m) => m.id === activateId);
  function closeDetail() {
    setDetailId(null);
    if (params.has('member')) {
      params.delete('member');
      setParams(params, { replace: true });
    }
  }
  return (
    <>
      <PageTitle
        title="Your community"
        description="Good people. Big goals. Keep every member moving."
        action={
          <Button onClick={() => setCreate(true)}>
            <Plus size={16} />
            Add member
          </Button>
        }
      />
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-5">
          <div className="flex gap-1 rounded-lg bg-canvas p-1">
            {['All members', 'Active', 'Needs attention'].map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFilter(f);
                  setPage(0);
                }}
                className={`tab ${filter === f ? 'tab-active' : ''}`}
              >
                {f}
                <span className="ml-1.5 text-[10px] opacity-60">
                  {
                    state.members.filter(
                      (m) =>
                        f === 'All members' ||
                        (f === 'Needs attention'
                          ? accessStatus(m) !== 'Active'
                          : accessStatus(m) === 'Active'),
                    ).length
                  }
                </span>
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-3 text-muted" />
            <input
              className="input w-full pl-9 sm:w-64"
              aria-label="Search member list"
              placeholder="Search name, email or member ID"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Membership</th>
                <th>Status</th>
                <th>Valid until</th>
                <th>Sessions left</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((m) => (
                <tr key={m.id}>
                  <td>
                    <button
                      onClick={() => setDetailId(m.id)}
                      className="flex items-center gap-3 text-left"
                    >
                      <Avatar member={m} />
                      <span>
                        <span className="block font-semibold">{m.name}</span>
                        <span className="mt-1 block text-[10px] text-muted">
                          {m.code} · {m.email}
                        </span>
                      </span>
                    </button>
                  </td>
                  <td>{plans.find((p) => p.id === m.access?.planId)?.name || 'Not assigned'}</td>
                  <td>
                    <Badge status={accessStatus(m)} />
                  </td>
                  <td>{dateLabel(m.access?.end)}</td>
                  <td>
                    {m.access ? (
                      m.access.sessions === null ? (
                        <span className="text-muted">Unlimited</span>
                      ) : (
                        <span
                          className={m.access.sessions <= 2 ? 'font-semibold text-amber-600' : ''}
                        >
                          {m.access.sessions} / {m.access.totalSessions}
                        </span>
                      )
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <button
                      aria-label={`View ${m.name}`}
                      className="icon-btn"
                      onClick={() => setDetailId(m.id)}
                    >
                      <ArrowUpRight size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!shown.length && (
          <Empty
            icon={Users}
            title="No members found"
            description="Try a different name, member ID, or filter."
          />
        )}
        <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-4">
          <span className="text-[11px] text-muted">
            {filtered.length
              ? `${currentPage * 8 + 1}–${Math.min((currentPage + 1) * 8, filtered.length)}`
              : '0'}{' '}
            of {filtered.length} members
          </span>
          <div className="flex items-center gap-3">
            <button
              aria-label="Previous page"
              className="icon-btn border border-line disabled:opacity-30"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[11px] text-muted">
              Page {currentPage + 1} of {pageCount}
            </span>
            <button
              aria-label="Next page"
              className="icon-btn border border-line disabled:opacity-30"
              disabled={currentPage >= pageCount - 1}
              onClick={() => setPage(currentPage + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </Panel>
      {create && <MemberCreate onClose={() => setCreate(false)} />}
      {activating && <AccessModal member={activating} onClose={() => setActivateId(null)} />}
      {detail && (
        <Modal title="Member profile" onClose={closeDetail}>
          <div className="mb-6 flex items-center gap-4">
            <Avatar member={detail} size="large" />
            <div>
              <h3 className="text-xl font-bold">{detail.name}</h3>
              <p className="mt-1 text-xs text-muted">
                {detail.code} · Joined {dateLabel(detail.joined)}
              </p>
              <div className="mt-2">
                <Badge status={accessStatus(detail)} />
              </div>
            </div>
          </div>
          <div className="space-y-3 text-xs text-muted">
            <p className="flex items-center gap-2">
              <Mail size={15} />
              {detail.email}
            </p>
            <p className="flex items-center gap-2">
              <Phone size={15} />
              {detail.phone || 'No phone added'}
            </p>
          </div>
          <div className="my-6 rounded-xl border border-line bg-canvas p-4">
            <p className="flex items-center gap-2 text-sm font-bold">
              <CreditCard size={16} className="text-brand-strong" />
              {plans.find((p) => p.id === detail.access?.planId)?.name || 'Ready for a membership'}
            </p>
            <p className="mt-2 text-xs text-muted">
              {detail.access
                ? `${dateLabel(detail.access.start)} → ${dateLabel(detail.access.end)}`
                : 'Activate access after the member pays at the counter.'}
            </p>
            {detail.access?.sessions !== null && detail.access && (
              <p className="mt-2 text-xs">{detail.access.sessions} sessions remaining</p>
            )}
          </div>
          {detail.history?.length > 0 && (
            <div className="mb-5">
              <p className="mb-2 text-xs font-bold">Previous access</p>
              {detail.history.map((a) => (
                <p key={a.id} className="py-1 text-[11px] text-muted">
                  {plans.find((p) => p.id === a.planId)?.name} · {dateLabel(a.start)} →{' '}
                  {dateLabel(a.end)}
                </p>
              ))}
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            {detail.access && (
              <Button
                variant="secondary"
                onClick={() =>
                  suspend(detail.id, detail.access.status === 'suspended' ? 'active' : 'suspended')
                }
              >
                {detail.access.status === 'suspended' ? 'Resume access' : 'Suspend access'}
              </Button>
            )}
            <Button
              onClick={() => {
                setActivateId(detail.id);
                closeDetail();
              }}
            >
              {detail.access ? 'Renew access' : 'Activate access'}
              <ArrowUpRight size={14} />
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
