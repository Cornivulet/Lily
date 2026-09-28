import type { ReactNode } from 'react';

export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <img src="/favicon.svg" alt="" className="size-9" />
          <div>
            <p className="text-2xl font-semibold tracking-tight text-primary">Lily</p>
            <h1 className="text-sm text-muted-foreground">{title}</h1>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
