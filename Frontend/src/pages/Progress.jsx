import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Target, TrendingUp, Scale, CalendarDays, Pencil, Dumbbell } from 'lucide-react';
import { useGym } from '../context/GymContext';
import {
  PageTitle,
  Panel,
  PanelTitle,
  Button,
  Avatar,
  Empty,
  dateLabel,
  StatCard,
} from '../components/UI';
import { ProgressChart } from '../components/Charts';
import { ProgressModal, GoalModal } from '../components/Forms';

export default function Progress({ user = false }) {
  const { state, userId } = useGym();
  const [params, setParams] = useSearchParams();
  const selected = user ? userId : params.get('member') || state.members[0]?.id;
  const [metric, setMetric] = useState('Weight');
  const [period, setPeriod] = useState('all');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [goalModal, setGoalModal] = useState(false);
  const member = state.members.find((m) => m.id === (user ? userId : selected)) || state.members[0];
  if (!member)
    return <Empty title="No members yet" description="Add a member to start tracking progress." />;
  const all = state.progress
    .filter((p) => p.memberId === member.id)
    .sort((a, b) => a.date.localeCompare(b.date));
  const selectedEntries = all.filter((p) => p.metric === metric);
  const entries = period === 'all' ? selectedEntries : selectedEntries.slice(-4);
  const latest = selectedEntries.at(-1);
  const first = selectedEntries[0];
  const delta = latest && first ? latest.value - first.value : null;
  const goal = state.goals.find((g) => g.memberId === member.id && g.metric === metric);
  const goalFraction =
    goal && latest && first
      ? Math.max(
          0,
          Math.min(
            1,
            goal.target === first.value
              ? latest.value === goal.target
                ? 1
                : 0
              : (latest.value - first.value) / (goal.target - first.value),
          ),
        )
      : 0;
  return (
    <>
      <PageTitle
        title={user ? 'Small steps. Real progress.' : 'Member progress'}
        description={
          user
            ? 'A space to notice how far you’ve come and where you want to go.'
            : 'View each member’s measurements, goals, and journal, including entries they recorded themselves.'
        }
        action={
          <Button onClick={() => setModal(true)}>
            <Plus size={16} />
            Record progress
          </Button>
        }
      />
      <Panel className="mb-6 flex flex-wrap items-center gap-4 p-5">
        <Avatar member={member} />
        <div className="flex-1">
          <p className="text-sm font-bold">{member.name}</p>
          <p className="mt-1 text-xs text-muted">{member.code} · A journey worth tracking</p>
        </div>
        {!user && (
          <label className="block w-full sm:w-auto">
            <span className="mb-1.5 block text-[10px] font-semibold text-muted">
              View member progress
            </span>
            <select
              className="input w-full sm:w-auto"
              aria-label="Select progress member"
              value={member.id}
              onChange={(e) => setParams({ member: e.target.value }, { replace: true })}
            >
              {state.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · {m.code}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="flex rounded-lg bg-canvas p-1">
          {['Weight', 'Bench press', 'Waist'].map((m) => (
            <button
              key={m}
              className={`tab ${metric === m ? 'tab-active' : ''}`}
              onClick={() => setMetric(m)}
            >
              {m}
            </button>
          ))}
        </div>
      </Panel>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label={`Latest ${metric.toLowerCase()}`}
          value={latest ? `${Number(latest.value.toFixed(1))} ${latest.unit}` : '—'}
          icon={metric === 'Bench press' ? Dumbbell : Scale}
          note={latest ? `Measured ${dateLabel(latest.date)}` : 'No measurement yet'}
        />
        <StatCard
          label="Change from first log"
          value={
            delta !== null
              ? `${delta > 0 ? '+' : ''}${Number(delta.toFixed(1))} ${latest.unit}`
              : '—'
          }
          icon={TrendingUp}
          color="blue"
          note="A comparison, not a fitness score"
        />
        <StatCard
          label="Measurements recorded"
          value={selectedEntries.length}
          icon={CalendarDays}
          color="green"
          note={`for ${metric.toLowerCase()}`}
        />
      </div>
      <div className="mb-6 grid gap-5 xl:grid-cols-[1.9fr_1fr]">
        <Panel className="p-5 sm:p-6">
          <PanelTitle
            title={`${metric} over time`}
            subtitle="Consistent measurements tell a clearer story."
            action={
              <select
                className="small-select"
                aria-label="Progress chart range"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="all">All entries</option>
                <option value="recent">Latest 4 entries</option>
              </select>
            }
          />
          <ProgressChart entries={entries} />
        </Panel>
        <Panel className="flex flex-col p-6">
          <PanelTitle
            title="A goal to work toward"
            subtitle="Your target. Your pace."
            action={<Target size={19} className="text-brand-strong" />}
          />
          {goal ? (
            <>
              <p className="mt-2 text-xs text-muted">{goal.metric} target</p>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-4xl font-bold tracking-tight">{goal.target}</span>
                <span className="mb-1 text-sm text-muted">{goal.unit}</span>
              </div>
              <div className="mt-6 h-2 overflow-hidden rounded-full bg-orange-50">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${goalFraction * 100}%` }}
                />
              </div>
              <p className="mt-2 text-[10px] text-muted">
                {Math.round(goalFraction * 100)}% of the change from your first log to this target
              </p>
              <p className="mt-4 text-xs leading-6 text-muted">
                {goalFraction >= 1
                  ? 'You reached this target. Take a moment to celebrate.'
                  : 'Show up, stay consistent, and notice the small wins along the way.'}
              </p>
            </>
          ) : (
            <Empty
              icon={Target}
              title="Give progress a direction"
              description="Set a target for this metric when you’re ready."
            />
          )}
          <Button variant="secondary" className="mt-auto w-full" onClick={() => setGoalModal(true)}>
            {goal ? 'Update goal' : 'Set a goal'}
            <Target size={14} />
          </Button>
        </Panel>
      </div>
      <Panel className="overflow-hidden">
        <div className="p-5">
          <PanelTitle title="Progress journal" subtitle="Every entry is part of the story." />
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Measured on</th>
                <th>Metric</th>
                <th>Measurement</th>
                <th>Notes</th>
                <th>Recorded by</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...all].reverse().map((p) => (
                <tr key={p.id}>
                  <td>{dateLabel(p.date)}</td>
                  <td>{p.metric}</td>
                  <td className="font-semibold">
                    {Number(p.value.toFixed(1))} {p.unit}
                  </td>
                  <td>
                    <span className="block max-w-64 whitespace-normal text-[11px] leading-5 text-muted">
                      {p.notes || '—'}
                    </span>
                  </td>
                  <td>{p.author === 'admin' ? 'Admin' : 'Member'}</td>
                  <td>
                    {(!user || p.author === userId) && (
                      <button
                        className="icon-btn"
                        aria-label={`Edit ${p.metric} entry on ${p.date}`}
                        onClick={() => setEditing(p)}
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!all.length && (
          <Empty
            title="Your story starts here"
            description="Record a measurement to begin your progress journal."
            action={
              <Button onClick={() => setModal(true)}>
                <Plus size={14} />
                Record progress
              </Button>
            }
          />
        )}
      </Panel>
      {(modal || editing) && (
        <ProgressModal
          member={member}
          entry={editing}
          author={user ? userId : 'admin'}
          onClose={() => {
            setModal(false);
            setEditing(null);
          }}
        />
      )}
      {goalModal && <GoalModal member={member} onClose={() => setGoalModal(false)} />}
    </>
  );
}
