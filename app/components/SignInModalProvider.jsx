"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

const SignInModalContext = createContext(null);

export function SignInModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <SignInModalContext.Provider value={{ isOpen, open, close }}>
      {children}
    </SignInModalContext.Provider>
  );
}

export function useSignInModal() {
  const ctx = useContext(SignInModalContext);
  if (!ctx) throw new Error("useSignInModal must be used within SignInModalProvider");
  return ctx;
}
