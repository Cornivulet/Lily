import type { ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';
import { errorMessage } from '@/lib/api';

export function LoadingState({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div role="status" className="flex flex-1 items-center justify-center gap-2 p-8 text-muted-foreground">
      <LoaderCircle className="size-4 animate-spin" aria-hidden />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  return (
    <div role="alert" className="flex flex-1 items-center justify-center p-8 text-sm text-destructive">
      {errorMessage(error)}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      {icon && <div className="text-secondary [&_svg]:size-10">{icon}</div>}
      <h2 className="text-lg font-semibold">{title}</h2>
      {children && <div className="max-w-md text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}
