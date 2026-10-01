import { createContext, useContext, useEffect, useState } from 'react';
import { createSeed } from '../lib/seed';
import * as domain from '../lib/domain';
import { api, clearCsrf } from '../lib/api';

const GymContext = createContext(null);
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
  useEffect(() => {
    let current = true;
    api('/auth/me')
      .then(({ user }) => {
        if (current) {
          setAuthUser(user);
          setState({ ...emptyState(), members: user.member ? [user.member] : [] });
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
    if (authUser) setState({ ...emptyState(), members: authUser.member ? [authUser.member] : [] });
    else if (!previewEnabled) setState(emptyState());
  }, [authUser]);
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
    previewEnabled: previewEnabled && !authUser,
    async loginAccount(input) {
      const result = await api('/auth/login', { method: 'POST', body: input });
      setAuthUser(result.user);
      setState({ ...emptyState(), members: result.user.member ? [result.user.member] : [] });
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
    activate: (id, planId, start, options) =>
      act(domain.activateAccess, id, planId, start, options),
    suspend: (id, status) => act(domain.setAccessStatus, id, status),
    createMember: (input) => act(domain.createMember, input),
    addProgress: (input, author) => act(domain.addProgress, input, author),
    editProgress: (id, input, author) => act(domain.editProgress, id, input, author),
    updateMember: async (id, values) => {
      if (authUser) {
        try {
          const result = await api('/me/profile', { method: 'PUT', body: values });
          setAuthUser(result.user);
          notify('Profile updated.');
          return true;
        } catch (error) {
          notify(error.message, true);
          return false;
        }
      }
      if (!previewEnabled) return false;
      setState({
        ...state,
        members: state.members.map((m) =>
          m.id === id ? { ...m, name: values.name, phone: values.phone } : m,
        ),
      });
      notify('Profile updated.');
    },
    saveSettings: (settings) => {
      if (authUser || !previewEnabled) {
        notify('Gym settings are not connected yet.', true);
        return;
      }
      setState({ ...state, settings });
      notify('Gym details saved.');
    },
    saveGoal: (goal) => {
      if (authUser || !previewEnabled) {
        notify('Goal tracking is not connected yet.', true);
        return;
      }
      setState({
        ...state,
        goals: [
          ...state.goals.filter((g) => !(g.memberId === goal.memberId && g.metric === goal.metric)),
          { ...goal, id: domain.uid() },
        ],
      });
      notify('Your goal is set. Let’s work toward it.');
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
export const useGym = () => useContext(GymContext);
