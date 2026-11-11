import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { refreshDemo, resetDemo, saveDemo, subscribeDemo } from './database';

const Context = createContext(null);

export function FactoryProvider({ children }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await refreshDemo();
      setData(next);
      setError(null);
      return next;
    } catch (failure) {
      setError(failure.message);
      throw failure;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeDemo(setData);
    refresh().catch(() => {});
    const focus = () => {
      refresh().catch(() => {});
    };
    window.addEventListener('focus', focus);
    return () => {
      unsubscribe();
      window.removeEventListener('focus', focus);
    };
  }, [refresh]);

  return (
    <Context.Provider value={{ data, loading, error, refresh, save: saveDemo, reset: resetDemo }}>
      {children}
    </Context.Provider>
  );
}

export function useFactory() {
  const context = useContext(Context);
  if (!context) throw new Error('Factory provider is missing.');
  return context;
}
