import { useState } from 'react';
import ProfileEditor from '../../components/ProfileEditor';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  CreditCard,
  Clock3,
  Plus,
  ArrowUpRight,
  Dumbbell,
  CalendarDays,
  TrendingUp,
} from 'lucide-react';
import { useGym } from '../../context/GymContext';
import { accessStatus, plans, localDate, dailyRates, peso } from '../../lib/domain';
import {
  PageTitle,
  Panel,
  PanelTitle,
  StatCard,
  Button,
  Badge,
  Empty,
  dateLabel,
  timeLabel,
  duration,
  TextLink,
} from '../../components/UI';
import { ProgressChart } from '../../components/Charts';
import { ProgressModal } from '../../components/Forms';
import { GymArt } from '../admin/Overview';

function useMember() {
  const gym = useGym();
  return {
    ...gym,
    member: gym.state.members.find((m) => m.id === gym.userId) || gym.state.members[0],
  };
}
export function MemberCard({ member }) {
  return (
    <Panel className="p-6">
      <PanelTitle title="Your membership details" subtitle="Your account and gym access." />
      <div className="flex flex-col items-center rounded-xl border border-dashed border-orange-200 bg-[#fffcfa] px-5 py-6">
        <div className="rounded-xl border border-line bg-white p-3">
          <Dumbbell size={48} className="text-brand-strong" />
        </div>
        <p className="mt-4 text-sm font-bold">{member.name}</p>
        <p className="mt-1.5 font-mono text-xs tracking-widest text-muted">{member.code}</p>
        <div className="mt-3">
          <Badge status={accessStatus(member)} />
        </div>
      </div>
      <p className="mt-4 text-center text-[10px] leading-5 text-muted">
        Pay at the counter to activate access. Scan the gym QR from My attendance to time in or out.
      </p>
    </Panel>
  );
}
export function UserOverview() {
  const { state, member, userId } = useMember();
  const navigate = useNavigate();
  const [modal, setModal] = useState(false);
  if (!member)
    return (
      <Empty
        title="Welcome to the district"
        description="Your profile will appear here once it is linked."
      />
    );
  const visits = state.visits.filter((v) => v.memberId === member.id);
  const recent = visits.slice(0, 4);
  const weight = state.progress
    .filter((p) => p.memberId === member.id && p.metric === 'Weight')
    .sort((a, b) => a.date.localeCompare(b.date));
  const plan = plans.find((p) => p.id === (member.access?.planId || member.requestedMembership));
  return (
    <>
      <PageTitle
        title={`Welcome back, ${member.name.split(' ')[0]}`}
        description="Show up for yourself. We’ll take care of the little details."
        action={
          <Button onClick={() => setModal(true)}>
            <Plus size={15} />
            Record progress
          </Button>
        }
      />
      <div className="hero-banner relative mb-6 flex min-h-[166px] items-center overflow-hidden rounded-2xl border border-[#f1dfc0] bg-[#fff5e9] p-7">
        <div className="relative z-10 max-w-[62%]">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-[#b56442]">
            Your next chapter
          </p>
          <h2 className="text-[26px] font-bold leading-tight tracking-[-.8px]">
            One day stronger.
            <br />
            One step closer.
          </h2>
          <p className="mt-3 text-xs leading-5 text-[#9c7767]">
            You don’t have to do it all today.
            <br />
            You just have to keep showing up.
          </p>
        </div>
        <GymArt />
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Visits this month"
          value={
            visits.filter((v) => localDate(v.in).slice(0, 7) === localDate().slice(0, 7)).length
          }
          icon={Activity}
          note="every one is a small win"
        />
        <StatCard
          label="Membership status"
          value={accessStatus(member)}
          icon={CreditCard}
          color="green"
          note={plan?.name || 'Visit the counter to get started'}
        />
        <StatCard
          label="Latest weight log"
          value={weight.length ? `${Number(weight.at(-1).value.toFixed(1))} kg` : '—'}
          icon={TrendingUp}
          color="blue"
          note={weight.length ? dateLabel(weight.at(-1).date) : 'Your first log starts the story'}
        />
      </div>
      <div className="mb-6 grid gap-5 xl:grid-cols-[1.9fr_1fr]">
        <div className="space-y-5">
          <Panel className="p-6">
            <PanelTitle
              title="Your progress, in perspective"
              subtitle="Weight over time — one part of your personal journey."
              action={
                <TextLink onClick={() => navigate('/user/progress')}>Explore progress</TextLink>
              }
            />
            <ProgressChart entries={weight} />
          </Panel>
          <Panel className="overflow-hidden">
            <div className="px-6 pt-5">
              <PanelTitle
                title="Recent visits"
                action={<TextLink onClick={() => navigate('/user/attendance')}>View all</TextLink>}
              />
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time in</th>
                    <th>Duration</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((v) => (
                    <tr key={v.id}>
                      <td>{dateLabel(v.in)}</td>
                      <td>{timeLabel(v.in)}</td>
                      <td>{duration(v)}</td>
                      <td>
                        <Badge status={v.out ? 'Completed' : 'In gym'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!recent.length && (
              <Empty
                title="Your first visit awaits"
                description="Scan the gym QR from My attendance to time in. Your visits appear here."
              />
            )}
          </Panel>
        </div>
        <div className="space-y-5">
          <MemberCard member={member} />
          <Panel className="p-6">
            <PanelTitle title="Your membership" />
            <p className="text-lg font-bold">{plan?.name || 'Let’s get you started'}</p>
            <p className="mt-2 text-xs leading-6 text-muted">
              {member.access
                ? `Valid until ${dateLabel(member.access.end)} (exclusive).`
                : plan
                  ? 'Your preferred plan is saved. Pay at the counter; the admin will activate your access.'
                  : 'Visit the gym counter to choose a membership or session pass.'}
            </p>
            {member.access?.sessions !== null && member.access && (
              <p className="mt-3 text-sm font-semibold text-brand-strong">
                {member.access.sessions} sessions left
              </p>
            )}
            <Button
              variant="secondary"
              className="mt-4 w-full"
              onClick={() => navigate('/user/membership')}
            >
              Membership details <ArrowUpRight size={14} />
            </Button>
          </Panel>
        </div>
      </div>
      {modal && <ProgressModal member={member} author={userId} onClose={() => setModal(false)} />}
    </>
  );
}
export function UserMembership() {
  const { state, member } = useMember();
  if (!member) return null;
  const plan = plans.find((p) => p.id === (member.access?.planId || member.requestedMembership));
  return (
    <>
      <PageTitle
        title="Your pass to showing up"
        description="Your membership, remaining visits, and access history."
      />
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          <Panel className="p-6">
            <div className="flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-brand-strong">
                <CreditCard size={24} />
              </span>
              <Badge status={accessStatus(member)} />
            </div>
            <h2 className="mt-5 text-2xl font-bold tracking-tight">
              {plan?.name || 'A fresh start awaits'}
            </h2>
            {!member.access && plan && (
              <p className="mt-2 text-xs font-semibold text-brand-strong">
                Preferred membership ·{' '}
                {member.rateCategory === 'student' ? 'Student' : 'Non-student'}
              </p>
            )}
            <p className="mt-2 text-xs leading-6 text-muted">
              {plan?.description ||
                'Choose a plan at the counter. The admin will activate your access afterward.'}
            </p>
            {member.access && (
              <>
                {member.access.rateCategory && (
                  <p className="mt-4 text-xs text-muted">
                    {member.access.rateCategory === 'student' ? 'Student' : 'Non-student'}
                    {member.access.listedRate !== undefined
                      ? ` · ${peso(member.access.listedRate)} counter rate`
                      : ''}
                    {member.access.timeSlot
                      ? ` · Entry: ${dailyRates.find((r) => r.id === member.access.timeSlot)?.name}`
                      : ''}
                  </p>
                )}
                <div className="mt-6 grid grid-cols-2 gap-4 border-y border-line py-5">
                  <div>
                    <p className="text-[10px] text-muted">Starts on</p>
                    <p className="mt-2 text-sm font-bold">{dateLabel(member.access.start)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted">Ends on (exclusive)</p>
                    <p className="mt-2 text-sm font-bold">{dateLabel(member.access.end)}</p>
                  </div>
                </div>
                <div className="mt-5">
                  <p className="text-[10px] text-muted">Your visits</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight">
                    {member.access.sessions === null ? 'Unlimited' : member.access.sessions}
                    <span className="ml-2 text-xs font-normal text-muted">
                      {member.access.sessions === null ? 'gym access' : 'sessions remaining'}
                    </span>
                  </p>
                  {member.access.sessions !== null && (
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-orange-50">
                      <div
                        className="h-full bg-brand"
                        style={{
                          width: `${(member.access.sessions / member.access.totalSessions) * 100}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              </>
            )}
            <div className="mt-6 rounded-xl bg-canvas p-4">
              <p className="text-xs font-bold">
                {member.access ? 'Ready to renew?' : 'Activate at the counter'}
              </p>
              <p className="mt-2 text-xs leading-6 text-muted">
                Pay at the gym counter and ask the admin to update your membership. Membership
                changes are managed by the admin.
              </p>
            </div>
          </Panel>
          <Panel className="p-6">
            <PanelTitle
              title="Access history"
              subtitle="Your previous memberships are kept here."
            />
            {member.history?.length ? (
              member.history.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between border-b border-line py-3 last:border-0"
                >
                  <div>
                    <p className="text-xs font-bold">
                      {plans.find((p) => p.id === a.planId)?.name}
                    </p>
                    <p className="mt-1.5 text-[10px] text-muted">
                      {dateLabel(a.start)} → {dateLabel(a.end)}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted">Previous plan</span>
                </div>
              ))
            ) : (
              <p className="text-xs leading-6 text-muted">
                No previous access yet. Your next renewal will keep the current record here.
              </p>
            )}
          </Panel>
        </div>
        <MemberCard member={member} />
      </div>
    </>
  );
}
export function UserProfile() {
  const { member } = useMember();
  if (!member)
    return (
      <Empty title="Loading your profile…" description="Your saved details will appear here." />
    );
  return <ProfileEditor key={member.id} member={member} card={<MemberCard member={member} />} />;
}
