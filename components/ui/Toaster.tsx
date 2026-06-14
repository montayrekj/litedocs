"use client";

import { useState, useRef } from "react";

export type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let addToastGlobal: ((message: string, type?: ToastType) => void) | null = null;

export function toast(message: string, type: ToastType = "info") {
  addToastGlobal?.(message, type);
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  addToastGlobal = (message: string, type: ToastType = "info") => {
    const id = ++counterRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const colorMap: Record<ToastType, string> = {
    success: "bg-green-600",
    error: "bg-red-600",
    info: "bg-gray-800",
  };

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`${colorMap[t.type]} text-white px-4 py-3 rounded-lg shadow-lg text-sm max-w-xs animate-in slide-in-from-right`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
