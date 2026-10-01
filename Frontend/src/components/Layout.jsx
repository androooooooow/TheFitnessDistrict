import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Clock3,
  CreditCard,
  TrendingUp,
  BarChart3,
  Settings,
  Search,
  Bell,
  ChevronDown,
  ArrowUpRight,
  HelpCircle,
  LogOut,
  Menu,
  X,
  CalendarDays,
  UserRound,
  ChevronRight,
  Dumbbell,
} from 'lucide-react';
import { Brand, Avatar, Modal, Button, Toast } from './UI';
import { useGym } from '../context/GymContext';
import { accessStatus, localDate } from '../lib/domain';

const adminNav = [
  ['', 'Overview', LayoutDashboard],
  ['members', 'Members', Users],
  ['attendance', 'Attendance', Clock3],
  ['memberships', 'Memberships', CreditCard],
  ['progress', 'Progress', TrendingUp],
  ['reports', 'Reports', BarChart3],
];
const userNav = [
  ['', 'Overview', LayoutDashboard],
  ['membership', 'My membership', CreditCard],
  ['attendance', 'My attendance', Clock3],
  ['progress', 'My progress', TrendingUp],
  ['profile', 'My profile', UserRound],
];
export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const admin = location.pathname.startsWith('/admin');
  const { state, userId } = useGym();
  const member = state.members.find((m) => m.id === userId) || state.members[0];
  const [menu, setMenu] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [help, setHelp] = useState(false);
  const [search, setSearch] = useState('');
  useEffect(() => {
    window.scrollTo(0, 0);
    setMenu(false);
    setNotifications(false);
  }, [location.pathname]);
  const base = admin ? '/admin' : '/user';
  const nav = admin ? adminNav : userNav;
  const current =
    nav.find(([path]) => location.pathname === `${base}${path ? `/${path}` : ''}`)?.[1] ||
    'Settings';
  const pending = state.members.filter((m) => accessStatus(m) === 'Pending');
  function go(path) {
    navigate(path);
    setMenu(false);
    setNotifications(false);
  }
  return (
    <div className="min-h-screen bg-canvas">
      {menu && (
        <button
          className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden"
          onClick={() => setMenu(false)}
          aria-label="Close navigation"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[232px] flex-col overflow-y-auto border-r border-line bg-white transition-transform lg:flex lg:translate-x-0 ${menu ? 'flex translate-x-0' : 'hidden -translate-x-full'}`}
      >
        <div className="relative flex h-[128px] shrink-0 items-center justify-center px-4">
          <Brand />
          <button
            onClick={() => setMenu(false)}
            className="icon-btn absolute right-2 top-2 lg:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mx-5 mb-6 flex shrink-0 items-center gap-2 rounded-lg border border-line px-3 py-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100">
            <Dumbbell size={14} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-bold">{state.settings.name}</p>
            <p className="mt-0.5 text-[10px] text-muted">Single location</p>
          </div>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
        </div>
        <p className="mb-3 px-7 text-[9px] font-bold uppercase tracking-[.15em] text-muted">
          {admin ? 'Workspace' : 'Your district'}
        </p>
        <nav aria-label="Main navigation" className="space-y-1 px-4">
          {nav.map(([path, label, Icon]) => (
            <NavLink
              key={label}
              end
              to={`${base}${path ? `/${path}` : ''}`}
              onClick={() => setMenu(false)}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
            >
              <Icon size={18} strokeWidth={1.7} />
              <span>{label}</span>
              {label === 'Members' && (
                <span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-muted">
                  {state.members.length}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto shrink-0 px-4 pb-5 pt-8">
          <div className="district-quote relative mb-5 overflow-hidden rounded-xl bg-[#fff5e5] p-4">
            <Dumbbell
              className="absolute -right-3 top-0 rotate-[-35deg] text-orange-200/50"
              size={88}
            />
            <p className="relative text-xs font-bold">Better, together.</p>
            <p className="relative mt-2 max-w-[145px] text-[11px] leading-[1.7] text-[#a66c52]">
              A little consistency.
              <br />A stronger community.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-brand-strong">
              Welcome to your district <ArrowUpRight size={12} />
            </span>
          </div>
          {admin && (
            <NavLink
              to="/admin/settings"
              onClick={() => setMenu(false)}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
            >
              <Settings size={17} />
              <span>Settings</span>
            </NavLink>
          )}
          <button onClick={() => setHelp(true)} className="nav-item w-full">
            <HelpCircle size={17} />
            <span>Help & support</span>
          </button>
          <button onClick={() => go('/login')} className="nav-item w-full">
            <LogOut size={17} />
            <span>Sign out of preview</span>
          </button>
          <div className="mt-4 border-t border-line px-2 pt-4 text-[9px] text-muted">
            © {new Date().getFullYear()} The Fit District
          </div>
        </div>
      </aside>
      <div className="lg:ml-[232px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between gap-3 border-b border-line bg-white/95 px-5 backdrop-blur-sm sm:px-8">
          <div className="flex items-center gap-3">
            <button
              className="icon-btn lg:hidden"
              onClick={() => setMenu(true)}
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>
            <div className="hidden items-center gap-2 text-[11px] sm:flex">
              <span className="text-muted">{admin ? 'Workspace' : 'My district'}</span>
              <ChevronRight size={12} className="text-slate-300" />
              <span className="font-semibold">{current}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            {admin && (
              <form
                className="hidden items-center gap-2 rounded-lg bg-canvas px-3 py-2 xl:flex"
                onSubmit={(e) => {
                  e.preventDefault();
                  go(`/admin/members?q=${encodeURIComponent(search)}`);
                  setSearch('');
                }}
              >
                <Search size={15} className="text-muted" />
                <input
                  aria-label="Search members globally"
                  placeholder="Search members..."
                  className="w-32 bg-transparent text-[11px] outline-none placeholder:text-slate-400"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <kbd className="rounded border border-line bg-white px-1 text-[9px] text-muted">
                  ↵
                </kbd>
              </form>
            )}
            <select
              aria-label="Preview role"
              value={admin ? 'admin' : 'user'}
              onChange={(e) => go(e.target.value === 'admin' ? '/admin' : '/user')}
              className="rounded-md border border-line bg-white px-2 py-1.5 text-[10px] font-medium text-muted"
            >
              <option value="admin">Admin preview</option>
              <option value="user">User preview</option>
            </select>
            <div className="relative">
              <button
                aria-label="Notifications"
                aria-expanded={notifications}
                onClick={() => setNotifications(!notifications)}
                className="icon-btn relative"
              >
                <Bell size={18} />
                {(admin ? pending.length : accessStatus(member) !== 'Active') > 0 && (
                  <span className="absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-brand" />
                )}
              </button>
              {notifications && (
                <div className="absolute right-0 top-12 w-72 rounded-xl border border-line bg-white p-4 shadow-xl">
                  <h3 className="mb-2 text-sm font-bold">Your notifications</h3>
                  {admin ? (
                    <>
                      <p className="text-xs leading-6 text-muted">
                        {pending.length
                          ? `${pending.length} member${pending.length > 1 ? 's' : ''} awaiting membership activation.`
                          : 'You’re all caught up.'}
                      </p>
                      {pending.length > 0 && (
                        <Button
                          variant="ghost"
                          className="mt-2"
                          onClick={() => go('/admin/memberships')}
                        >
                          Review memberships <ArrowUpRight size={14} />
                        </Button>
                      )}
                    </>
                  ) : (
                    <p className="text-xs leading-6 text-muted">
                      {accessStatus(member) === 'Active'
                        ? 'Your membership is active. Keep showing up!'
                        : 'Visit the gym counter to arrange your membership.'}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="hidden h-7 w-px bg-line sm:block" />
            <div className="flex items-center gap-2.5">
              <Avatar member={admin ? { name: 'Gym Admin', color: 0 } : member} />
              <div className="hidden sm:block">
                <p className="text-xs font-bold">{admin ? 'Gym admin' : member?.name}</p>
                <p className="mt-1 text-[10px] text-muted">{admin ? 'Administrator' : 'Member'}</p>
              </div>
            </div>
          </div>
        </header>
        <main id="main-content" className="mx-auto max-w-[1530px] px-5 py-7 sm:px-8 sm:py-8">
          <Outlet />
        </main>
      </div>
      <Toast />
      {help && (
        <Modal
          title="Welcome to your district"
          description="A quick guide to the interactive preview."
          onClose={() => setHelp(false)}
        >
          <div className="space-y-4 text-sm leading-6 text-muted">
            <p>
              Admins can add members, activate access, and manage arrivals and departures. Members
              can view their own records and log progress.
            </p>
            <p>
              Use the preview selector at the top to explore both roles. Changes are saved in this
              browser. You can restore sample data from Settings.
            </p>
            <p>
              This is a local preview. It does not send emails, process payments, or create a real
              account.
            </p>
            <Button onClick={() => setHelp(false)}>
              Got it <CheckIcon />
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function CheckIcon() {
  return <ChevronRight size={14} />;
}
