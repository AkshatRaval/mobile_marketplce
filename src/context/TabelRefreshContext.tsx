import React, { createContext, useCallback, useContext, useRef } from 'react';

interface TabRefreshContextType {
  triggerRefresh: (tabName: string) => void;
  subscribeToRefresh: (tabName: string, callback: () => void) => () => void;
}

const TabRefreshContext = createContext<TabRefreshContextType | undefined>(undefined);

export function TabRefreshProvider({ children }: { children: React.ReactNode }) {
  // ✅ Use useRef instead of useState to prevent re-render loops
  const callbacksRef = useRef<{ [key: string]: Set<() => void> }>({});

  const triggerRefresh = useCallback((tabName: string) => {
    const callbacks = callbacksRef.current[tabName];
    if (callbacks) {
      callbacks.forEach(callback => callback());
    }
  }, []);

  const subscribeToRefresh = useCallback((tabName: string, callback: () => void) => {
    if (!callbacksRef.current[tabName]) {
      callbacksRef.current[tabName] = new Set();
    }
    
    callbacksRef.current[tabName].add(callback);

    // Return unsubscribe function
    return () => {
      callbacksRef.current[tabName]?.delete(callback);
    };
  }, []);

  return (
    <TabRefreshContext.Provider value={{ triggerRefresh, subscribeToRefresh }}>
      {children}
    </TabRefreshContext.Provider>
  );
}

export function useTabRefresh() {
  const context = useContext(TabRefreshContext);
  if (!context) {
    throw new Error('useTabRefresh must be used within TabRefreshProvider');
  }
  return context;
}