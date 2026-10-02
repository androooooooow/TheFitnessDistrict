import { createContext, useContext } from 'react';

// Keep the context identity stable when the provider is refreshed during development.
export const GymContext = createContext(null);
export function useGym() {
  return useContext(GymContext);
}
