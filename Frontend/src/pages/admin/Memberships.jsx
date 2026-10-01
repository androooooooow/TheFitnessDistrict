import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, ArrowRight, Plus, Search, CreditCard } from 'lucide-react';
import { plans, accessStatus } from '../../lib/domain';
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
      m.name.toLowerCase().includes(query.toLowerCase()) &&
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
        title="Access made simple"
        description="Flexible ways to show up. You handle the welcome; we track the access."
      />
      <div className="mb-7 grid gap-5 md:grid-cols-3">
        {plans.map((plan, i) => (
          <Panel key={plan.id} className={`relative p-6 ${i === 0 ? 'border-orange-200' : ''}`}>
            {i === 0 && (
              <span className="absolute right-4 top-4 rounded-full bg-orange-50 px-2.5 py-1 text-[9px] font-semibold text-brand-strong">
                The everyday favorite
              </span>
            )}
            <span
              className={`mb-5 flex h-10 w-10 items-center justify-center rounded-xl ${i === 0 ? 'bg-orange-50 text-brand-strong' : i === 1 ? 'bg-sky-50 text-sky-600' : 'bg-violet-50 text-violet-600'}`}
            >
              <CreditCard size={20} />
            </span>
            <h2 className="text-lg font-bold tracking-tight">{plan.name}</h2>
            <p className="mt-2 min-h-10 text-xs leading-5 text-muted">{plan.description}</p>
            <div className="my-5 border-y border-line py-4">
              <span className="text-[25px] font-bold tracking-tight">
                {plan.sessions === null ? 'Unlimited' : plan.sessions}
              </span>
              <span className="ml-2 text-xs text-muted">
                {plan.sessions === null ? 'visits' : plan.sessions === 1 ? 'visit' : 'sessions'}
              </span>
            </div>
            <ul className="space-y-2.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-muted">
                  <Check size={14} className="text-emerald-600" />
                  {f}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-[10px] text-muted">Payment at the counter · Admin activation</p>
            <Button
              variant="secondary"
              className="mt-4 w-full"
              onClick={() => {
                setPlanFilter(plan.id);
                document
                  .getElementById('access-list')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              View members <ArrowRight size={14} />
            </Button>
          </Panel>
        ))}
      </div>
      <Panel id="access-list" className="scroll-mt-24 overflow-hidden">
        <div className="p-5">
          <PanelTitle
            title="Member access"
            subtitle="Activate, renew, and keep everyone on track."
          />
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-3 text-muted" />
              <input
                className="input pl-9"
                aria-label="Search membership members"
                placeholder="Find a member..."
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
                <th>Status</th>
                <th>Valid until</th>
                <th></th>
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
                  <td>{plans.find((p) => p.id === m.access?.planId)?.name || 'Not assigned'}</td>
                  <td>
                    <Badge status={accessStatus(m)} />
                  </td>
                  <td>{dateLabel(m.access?.end)}</td>
                  <td>
                    <Button variant="secondary" onClick={() => setActivation(m.id)}>
                      {m.access ? 'Renew' : 'Activate'}
                      <ArrowRight size={13} />
                    </Button>
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
