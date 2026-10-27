"use client";

import type { ReactNode } from "react";

export function ConfirmSubmit({ message, children }: { message: string; children: ReactNode }) {
  return (
    <button
      type="submit"
      className="mini-btn danger"
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
