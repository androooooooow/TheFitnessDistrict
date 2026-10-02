import { useState } from 'react';
import { Download, Users, Activity, Clock3, UserCheck } from 'lucide-react';
import {
  PageTitle,
  Panel,
  PanelTitle,
  StatCard,
  Button,
  dateLabel,
  timeLabel,
  duration,
  Empty,
} from '../../components/UI';
import { AttendanceChart, MembershipDonut } from '../../components/Charts';
import { localDate, addDays, accessStatus } from '../../lib/domain';
import { downloadCsv } from '../../lib/export';
import { useGym } from '../../context/GymContext';
import Pagination from '../../components/Pagination';
import { PAGE_SIZE, pagination } from '../../lib/pagination';

export default function Reports() {
  const { state, notify } = useGym();
  const [days, setDays] = useState(14);
  const [page, setPage] = useState(0);
  const start = addDays(localDate(), -days + 1);
  const visits = state.visits.filter((v) => localDate(v.in) >= start);
  const completed = visits.filter((v) => v.out);
  const average = completed.length
    ? Math.round(
        completed.reduce((sum, v) => sum + (new Date(v.out) - new Date(v.in)) / 60000, 0) /
          completed.length,
      )
    : 0;
  const dates = [...new Set(visits.map((v) => localDate(v.in)))].sort().reverse();
  const { page: currentPage, offset } = pagination(dates.length, page);
  const shownDates = dates.slice(offset, offset + PAGE_SIZE);
  function exportReport() {
    downloadCsv(
      `fitnessdistrict-attendance-${localDate()}.csv`,
      [
        'Member',
        'Member ID',
        'Date',
        'Time in (Manila)',
        'Time out (Manila)',
        'Duration',
        'Status',
      ],
      visits.map((v) => {
        const m = state.members.find((m) => m.id === v.memberId);
        return [
          m?.name,
          m?.code,
          dateLabel(v.in),
          timeLabel(v.in),
          timeLabel(v.out),
          duration(v),
          v.out ? 'Completed' : 'Open',
        ];
      }),
    );
    notify('Attendance report exported.');
  }
  return (
    <>
      <PageTitle
        title="See the bigger picture"
        description="Meaningful numbers for a community that keeps moving."
        action={
          <div className="flex gap-2">
            <select
              className="small-select"
              aria-label="Report period"
              value={days}
              onChange={(e) => {
                setDays(Number(e.target.value));
                setPage(0);
              }}
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
            <Button onClick={exportReport}>
              <Download size={15} />
              Export CSV
            </Button>
          </div>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Visits in this period"
          value={visits.length}
          icon={Activity}
          note={`since ${dateLabel(start)}`}
        />
        <StatCard
          label="Unique visitors"
          value={new Set(visits.map((v) => v.memberId)).size}
          icon={Users}
          color="blue"
          note="distinct members"
        />
        <StatCard
          label="Average visit duration"
          value={`${average}m`}
          icon={Clock3}
          color="purple"
          note={`${completed.length} completed visits only`}
        />
        <StatCard
          label="Active access today"
          value={state.members.filter((m) => accessStatus(m) === 'Active').length}
          icon={UserCheck}
          color="green"
          note="current status, not historical"
        />
      </div>
      <div className="mb-6 grid gap-5 xl:grid-cols-[1.9fr_1fr]">
        <Panel className="p-6">
          <PanelTitle
            title="Attendance by day"
            subtitle="Before noon in peach. After noon in orange."
          />
          <AttendanceChart visits={visits} days={Math.min(days, 14)} />
          {days === 30 && (
            <p className="mt-3 text-[10px] text-muted">
              Chart shows the latest 14 days; totals and exports include all 30 days.
            </p>
          )}
        </Panel>
        <Panel className="p-6">
          <PanelTitle title="Current membership mix" subtitle="Members with valid access today." />
          <MembershipDonut members={state.members} />
        </Panel>
      </div>
      <Panel className="overflow-hidden">
        <div className="p-5">
          <PanelTitle title="Daily summary" subtitle="Visits and people are counted separately." />
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Total visits</th>
                <th>Unique members</th>
                <th>Completed</th>
                <th>Missing check-outs</th>
              </tr>
            </thead>
            <tbody>
              {shownDates.map((date) => {
                const daily = visits.filter((v) => localDate(v.in) === date);
                return (
                  <tr key={date}>
                    <td className="font-semibold">{dateLabel(date)}</td>
                    <td>{daily.length}</td>
                    <td>{new Set(daily.map((v) => v.memberId)).size}</td>
                    <td>{daily.filter((v) => v.out).length}</td>
                    <td>{daily.filter((v) => !v.out).length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!dates.length && (
          <Empty title="No visits in this period" description="Try a wider date range." />
        )}
        <Pagination total={dates.length} page={currentPage} onPageChange={setPage} label="days" />
      </Panel>
    </>
  );
}
