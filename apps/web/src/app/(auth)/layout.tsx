import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm bg-background rounded-xl border border-border p-8 shadow-lg">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-10 h-10 rounded-lg bg-brand flex items-center justify-center">
            <span className="text-white font-bold text-lg">S</span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
