import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Check, ArrowRight, Search, CalendarDays, Clock, TrendingUp } from 'lucide-react';
import { plans, currentPlans, dailyRates, accessStatus, peso } from '../../lib/domain';
import { useGym } from '../../context/GymContext';
import {
  PageTitle,
  Panel,
  PanelTitle,
  Button,
  Badge,
  Avatar,
  Empty,
  dateLabel,
} from '../../components/UI';
import { AccessModal } from '../../components/Forms';

export default function Memberships() {
  const { state } = useGym();
  const [params, setParams] = useSearchParams();
  const [activation, setActivation] = useState(params.get('member'));
  const [query, setQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  useEffect(() => {
    if (params.get('member')) setActivation(params.get('member'));
  }, [params]);
  const member = state.members.find((m) => m.id === activation);
  const filtered = state.members.filter(
    (m) =>
      `${m.name} ${m.code}`.toLowerCase().includes(query.toLowerCase()) &&
      (planFilter === 'all' || m.access?.planId === planFilter),
  );
  function close() {
    setActivation(null);
    params.delete('member');
    setParams(params, { replace: true });
  }
  return (
    <>
      <PageTitle
        title="Memberships & daily rates"
        description="Student and non-student rates. Activate member access after payment at the counter."
      />
      <div className="mb-7 grid gap-5 xl:grid-cols-[1fr_1.65fr]">
        <Panel className="p-5 sm:p-6">
          <PanelTitle
            title="Daily / per session"
            subtitle="Walk-in rates · One gym admission"
            action={<Clock size={20} className="text-brand-strong" />}
          />
          <div className="space-y-4">
            {dailyRates.map((slot) => (
              <div key={slot.id} className="rounded-xl border border-line p-4">
                <p className="mb-4 text-sm font-bold text-brand-strong">{slot.name}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted">Student</p>
                    <p className="mt-1 text-2xl font-bold">{peso(slot.student)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Non-student</p>
                    <p className="mt-1 text-2xl font-bold">{peso(slot.nonStudent)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-muted">
            The morning promo applies to entry before noon. At 12 noon, use the afternoon rate. A
            daily pass is used once at check-in.
          </p>
        </Panel>
        <Panel className="overflow-hidden">
          <div className="p-5 sm:p-6">
            <PanelTitle
              title="Monthly memberships"
              subtitle="Unlimited visits · Effective May 1"
              action={<CalendarDays size={20} className="text-brand-strong" />}
            />
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Duration</th>
                  <th>Student</th>
                  <th>Non-student</th>
                  <th>Included</th>
                </tr>
              </thead>
              <tbody>
                {currentPlans
                  .filter((p) => p.type === 'membership')
                  .map((plan) => (
                    <tr key={plan.id}>
                      <td>
                        <span className="font-semibold">{plan.short}</span>
                        <span className="mt-1 block text-[10px] text-muted">Unlimited visits</span>
                      </td>
                      <td className="font-bold">{peso(plan.rates.student)}</td>
                      <td className="font-bold">{peso(plan.rates.nonStudent)}</td>
                      <td>
                        <span className="flex items-center gap-1.5 text-xs">
                          <Check size={13} className="text-emerald-600" />
                          {plan.months > 1 ? 'Free T-shirt' : 'Gym access'}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="m-5 rounded-xl bg-orange-50 p-4 text-xs leading-5 text-brand-strong">
            Payments stay at the counter. Select the member below to activate or renew their plan,
            rate category, and daily entry time.
          </div>
        </Panel>
      </div>
      <Panel id="access-list" className="scroll-mt-24 overflow-hidden">
        <div className="p-5">
          <PanelTitle
            title="Member access"
            subtitle="Activate, renew, or view a member’s progress."
          />
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-48 flex-1">
              <Search size={15} className="absolute left-3 top-3 text-muted" />
              <input
                className="input pl-9"
                aria-label="Search membership members"
                placeholder="Find a member or ID..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select
              className="input w-auto"
              aria-label="Filter membership plan"
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
            >
              <option value="all">All plans</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.legacy ? ' (previous preview)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Current plan</th>
                <th>Category / entry</th>
                <th>Status</th>
                <th>Ends on (exclusive)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <Avatar member={m} />
                      <span>
                        <span className="block font-semibold">{m.name}</span>
                        <span className="mt-1 block text-[10px] text-muted">{m.code}</span>
                      </span>
                    </div>
                  </td>
                  <td>
                    {plans.find((p) => p.id === m.access?.planId)?.name || 'Not assigned'}
                    {m.access?.listedRate !== undefined && (
                      <span className="mt-1 block text-[10px] text-muted">
                        {peso(m.access.listedRate)} counter rate
                      </span>
                    )}
                  </td>
                  <td>
                    {m.access?.rateCategory
                      ? m.access.rateCategory === 'student'
                        ? 'Student'
                        : 'Non-student'
                      : 'Not recorded'}
                    {m.access?.timeSlot && (
                      <span className="mt-1 block text-[10px] text-muted">
                        {dailyRates.find((r) => r.id === m.access.timeSlot)?.name}
                      </span>
                    )}
                  </td>
                  <td>
                    <Badge status={accessStatus(m)} />
                  </td>
                  <td>{dateLabel(m.access?.end)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" onClick={() => setActivation(m.id)}>
                        {m.access ? 'Renew' : 'Activate'}
                        <ArrowRight size={13} />
                      </Button>
                      <Link
                        className="btn btn-secondary"
                        to={`/admin/progress?member=${m.id}`}
                        aria-label={`View progress for ${m.name}`}
                      >
                        <TrendingUp size={14} />
                        Progress
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <Empty title="No matching memberships" description="Try another plan or member name." />
        )}
      </Panel>
      {member && <AccessModal member={member} onClose={close} />}
    </>
  );
}
