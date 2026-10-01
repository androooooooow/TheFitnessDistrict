import { createContext, useContext, useEffect, useState } from 'react';
import { createSeed } from '../lib/seed';
import * as domain from '../lib/domain';

const GymContext = createContext(null);
const STORAGE_KEY = 'fitnessdistrict-preview-v1';
function loadState() {
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
  const [selectedUserId, setUserId] = useState(() => {
    try {
      return sessionStorage.getItem('fd-preview-member') || 'm1';
    } catch {
      return 'm1';
    }
  });
  const userId = state.members.some((m) => m.id === selectedUserId)
    ? selectedUserId
    : state.members[0]?.id;
  const [toast, setToast] = useState(null);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* Preview still works without persistence. */
    }
  }, [state]);
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
    state,
    userId,
    setUserId,
    notify,
    toast,
    dismissToast: () => setToast(null),
    checkIn: (id) => act(domain.checkIn, id),
    checkOut: (id) => act(domain.checkOut, id),
    activate: (id, planId, start) => act(domain.activateAccess, id, planId, start),
    suspend: (id, status) => act(domain.setAccessStatus, id, status),
    createMember: (input) => act(domain.createMember, input),
    addProgress: (input, author) => act(domain.addProgress, input, author),
    editProgress: (id, input, author) => act(domain.editProgress, id, input, author),
    updateMember: (id, values) => {
      setState({
        ...state,
        members: state.members.map((m) =>
          m.id === id ? { ...m, name: values.name, phone: values.phone } : m,
        ),
      });
      notify('Profile updated.');
    },
    saveSettings: (settings) => {
      setState({ ...state, settings });
      notify('Gym details saved.');
    },
    saveGoal: (goal) => {
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
