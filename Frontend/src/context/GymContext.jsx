import { useEffect, useState, useCallback, useRef } from 'react';
import { GymContext } from './gym-context';
import { createSeed } from '../lib/seed';
import * as domain from '../lib/domain';
import { api, clearCsrf } from '../lib/api';

const STORAGE_KEY = 'fitnessdistrict-preview-v1';
const previewEnabled = import.meta.env.VITE_ENABLE_PREVIEW === 'true';
const emptyState = () => ({
  version: 1,
  members: [],
  visits: [],
  progress: [],
  goals: [],
  settings: { name: 'The Fit District', email: '', phone: '' },
});
function loadState() {
  if (!previewEnabled) return emptyState();
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (
      value?.version === 1 &&
      Array.isArray(value.members) &&
      Array.isArray(value.visits) &&
      Array.isArray(value.progress) &&
      Array.isArray(value.goals) &&
      value.settings
    )
      return {
        ...value,
        settings: {
          ...value.settings,
          name:
            value.settings.name === 'The FitnessDistrict'
              ? 'The Fit District'
              : value.settings.name,
        },
      };
  } catch {
    /* Start with sample data if storage is unavailable or corrupt. */
  }
  return createSeed();
}
export function GymProvider({ children }) {
  const [state, setState] = useState(loadState);
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [gymError, setGymError] = useState('');
  const [progressRevision, setProgressRevision] = useState(0);
  const authRef = useRef(authUser);
  authRef.current = authUser;
  const refreshSerial = useRef(0);
  const refreshGym = useCallback(async () => {
    const account = authRef.current;
    if (!account) return;
    const serial = ++refreshSerial.current;
    try {
      const data = await api('/gym/state');
      if (authRef.current?.id === account.id && serial === refreshSerial.current) {
        setState(data);
        setGymError('');
      }
    } catch (error) {
      if (authRef.current?.id === account.id && serial === refreshSerial.current)
        setGymError(error.message);
    }
  }, []);
  useEffect(() => {
    let current = true;
    api('/auth/me')
      .then(({ user }) => {
        if (current) {
          setAuthUser(user);
          setState({
            ...emptyState(),
            members: user.role === 'user' && user.member ? [user.member] : [],
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (current) setAuthLoading(false);
      });
    return () => {
      current = false;
    };
  }, []);
  useEffect(() => {
    if (!authUser) {
      if (!previewEnabled) setState(emptyState());
      return;
    }
    refreshGym();
    const refresh = () => {
      if (!document.hidden) refreshGym();
    };
    const timer = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [authUser?.id, authUser?.role, refreshGym]);
  const [selectedUserId, setUserId] = useState(() => {
    try {
      return sessionStorage.getItem('fd-preview-member') || 'm1';
    } catch {
      return 'm1';
    }
  });
  const userId =
    authUser?.member?.id ||
    (state.members.some((m) => m.id === selectedUserId) ? selectedUserId : state.members[0]?.id);
  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (!previewEnabled || authUser) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* Preview still works without persistence. */
    }
  }, [state, authUser]);
  useEffect(() => {
    try {
      sessionStorage.setItem('fd-preview-member', userId);
    } catch {
      /* Session storage is optional. */
    }
  }, [userId]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  function notify(message, error = false) {
    setToast({ message, error, id: Date.now() });
  }
  function act(fn, ...args) {
    if (authUser || !previewEnabled) {
      notify('This gym feature will be available when its backend is connected.', true);
      return null;
    }
    try {
      const result = fn(state, ...args);
      setState(result.state);
      notify(result.message);
      return result;
    } catch (error) {
      notify(error.message, true);
      return null;
    }
  }
  const value = {
    authUser,
    authLoading,
    gymError,
    refreshGym,
    progressRevision,
    previewEnabled: previewEnabled && !authUser,
    async loginAccount(input) {
      const result = await api('/auth/login', { method: 'POST', body: input });
      setAuthUser(result.user);
      setState({
        ...emptyState(),
        members: result.user.role === 'user' && result.user.member ? [result.user.member] : [],
      });
      return result.user;
    },
    signupAccount: (input) => api('/auth/signup', { method: 'POST', body: input }),
    async verifyAccount(input) {
      const result = await api('/auth/verify-email', { method: 'POST', body: input });
      setAuthUser(result.user);
      setState({ ...emptyState(), members: result.user.member ? [result.user.member] : [] });
      return result.user;
    },
    resendCode: (challengeId) =>
      api('/auth/resend-code', { method: 'POST', body: { challengeId } }),
    async logoutAccount() {
      await api('/auth/logout', { method: 'POST' });
      clearCsrf();
      setAuthUser(null);
      setState(previewEnabled ? loadState() : emptyState());
    },
    state,
    userId,
    setUserId,
    notify,
    toast,
    dismissToast: () => setToast(null),
    checkIn: (id) => act(domain.checkIn, id),
    checkOut: (id) => act(domain.checkOut, id),
    async activate(id, planId, start, options) {
      if (!authUser) return act(domain.activateAccess, id, planId, start, options);
      try {
        const result = await api(`/gym/members/${id}/access`, {
          method: 'POST',
          body: {
            requestId: options.requestId,
            planId,
            rateCategory: options.rateCategory,
            ...(planId === 'day' ? { timeSlot: options.timeSlot } : {}),
            paymentConfirmed: true,
          },
        });
        await refreshGym();
        notify(result.message);
        return result;
      } catch (error) {
        notify(error.message, true);
        return null;
      }
    },
    async suspend(id, status) {
      if (!authUser) return act(domain.setAccessStatus, id, status);
      try {
        const result = await api(`/gym/members/${id}/access/status`, {
          method: 'PUT',
          body: { status },
        });
        await refreshGym();
        notify(result.message);
        return result;
      } catch (error) {
        notify(error.message, true);
        return null;
      }
    },
    createMember: (input) => act(domain.createMember, input),
    async addProgress(input, author) {
      if (previewEnabled && !authRef.current) return act(domain.addProgress, input, author);
      const result = await api('/gym/progress', {
        method: 'POST',
        body: {
          memberId: input.memberId,
          metric: input.metric,
          value: Number(input.value),
          date: input.date,
          notes: input.notes || '',
          requestId: input.requestId,
        },
      });
      await refreshGym();
      setProgressRevision((n) => n + 1);
      notify(result.message);
      return result;
    },
    async editProgress(id, input, author) {
      if (previewEnabled && !authRef.current) return act(domain.editProgress, id, input, author);
      const result = await api(`/gym/progress/${id}`, {
        method: 'PUT',
        body: {
          metric: input.metric,
          value: Number(input.value),
          date: input.date,
          notes: input.notes || '',
          version: input.version,
        },
      });
      await refreshGym();
      setProgressRevision((n) => n + 1);
      notify(result.message);
      return result;
    },
    updateMember: async (id, values) => {
      if (authRef.current || !previewEnabled) {
        try {
          const result = await api('/me/profile', { method: 'PUT', body: values });
          setAuthUser(result.user);
          setState((s) => ({
            ...s,
            members: s.members.map((m) =>
              m.id === id
                ? { ...m, ...result.user.member, access: m.access, history: m.history }
                : m,
            ),
          }));
          await refreshGym();
          setProgressRevision((n) => n + 1);
          notify('Profile updated.');
          return true;
        } catch (error) {
          if (error.status === 409) await refreshGym();
          throw error;
        }
      }
      if (!previewEnabled) return false;
      let next = {
        ...state,
        members: state.members.map((m) =>
          m.id === id ? { ...m, ...values, name: values.fullName || values.name } : m,
        ),
      };
      if (state.members.find((m) => m.id === id)?.weight !== values.weight)
        next = domain.addProgress(
          next,
          {
            memberId: id,
            metric: 'Weight',
            value: values.weight,
            date: domain.localDate(),
            notes: 'Weight updated from profile.',
          },
          id,
        ).state;
      setState(next);
      notify('Profile updated.');
      return true;
    },
    saveSettings: (settings) => {
      if (authUser || !previewEnabled) {
        notify('Gym settings are not connected yet.', true);
        return;
      }
      setState({ ...state, settings });
      notify('Gym details saved.');
    },
    saveGoal: async (goal) => {
      if (authRef.current || !previewEnabled) {
        const result = await api('/gym/goals', {
          method: 'POST',
          body: {
            memberId: goal.memberId,
            metric: goal.metric,
            target: goal.target,
            requestId: goal.requestId,
            ...(goal.version ? { version: goal.version } : {}),
          },
        });
        await refreshGym();
        setProgressRevision((n) => n + 1);
        notify(result.message);
        return result;
      }
      if (!previewEnabled) return false;
      setState({
        ...state,
        goals: [
          ...state.goals.filter((g) => !(g.memberId === goal.memberId && g.metric === goal.metric)),
          { ...goal, id: domain.uid() },
        ],
      });
      notify('Your goal is set. Let’s work toward it.');
      return true;
    },
    reset: () => {
      if (authUser || !previewEnabled) return state;
      const next = createSeed();
      setState(next);
      setUserId('m1');
      notify('Sample data restored.');
      return next;
    },
  };
  return <GymContext.Provider value={value}>{children}</GymContext.Provider>;
}
export { useGym } from './gym-context';
