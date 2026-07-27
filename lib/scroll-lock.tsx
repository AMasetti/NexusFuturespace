"use client";

import React, { createContext, useContext } from "react";

interface ScrollLockContextValue {
  lock: () => void;
  unlock: () => void;
}

const ScrollLockContext = createContext<ScrollLockContextValue>({
  lock: () => {},
  unlock: () => {},
});

export function useScrollLock() {
  return useContext(ScrollLockContext);
}

export function ScrollLockProvider({
  scrollRef,
  children,
}: {
  scrollRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}) {
  const lock = () => {
    if (scrollRef.current) scrollRef.current.style.overflowY = "hidden";
  };
  const unlock = () => {
    if (scrollRef.current) scrollRef.current.style.overflowY = "auto";
  };

  return (
    <ScrollLockContext.Provider value={{ lock, unlock }}>{children}</ScrollLockContext.Provider>
  );
}
