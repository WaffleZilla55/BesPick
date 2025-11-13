// src/app/admin/roster/UserRoleCard.tsx
'use client';

import { useEffect, useRef, useState, useTransition } from 'react';

import { updateUserRole } from '../../../../server/actions/roster';

type UserRoleCardProps = {
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string | null;
  };
};

type ToastState = {
  message: string;
  variant: 'success' | 'error';
};

export function UserRoleCard({ user }: UserRoleCardProps) {
  const [currentRole, setCurrentRole] = useState<string | null>(user.role);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isPending, startTransition] = useTransition();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const roleLabel = currentRole ?? 'No role assigned';

  useEffect(() => {
    setCurrentRole(user.role);
  }, [user.role]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const showToast = (state: ToastState) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setToast(state);
    timeoutRef.current = setTimeout(() => setToast(null), 3000);
  };

  const handleRoleChange = (role: string | null) => {
    startTransition(async () => {
      const result = await updateUserRole({ id: user.id, role });

      if (result.success) {
        setCurrentRole(result.role);
        showToast({ message: result.message, variant: 'success' });
      } else {
        showToast({ message: result.message, variant: 'error' });
      }
    });
  };

  const buttonClasses =
    'inline-flex items-center justify-center rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <>
      <article className='rounded-xl border border-border bg-card p-6 shadow-sm backdrop-blur'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h2 className='text-lg font-semibold text-foreground'>
              {user.fullName}
            </h2>
            <p className='text-sm text-muted-foreground'>{user.email}</p>
          </div>
          <div className='rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary'>
            {roleLabel}
          </div>
        </div>

        <div className='mt-5 flex flex-wrap gap-3'>
          <button
            type='button'
            onClick={() => handleRoleChange('admin')}
            className={buttonClasses}
            disabled={isPending || currentRole === 'admin'}
          >
            {currentRole === 'admin' ? 'Already Admin' : 'Make Admin'}
          </button>

          <button
            type='button'
            onClick={() => handleRoleChange('moderator')}
            className={buttonClasses}
            disabled={isPending || currentRole === 'moderator'}
          >
            {currentRole === 'moderator'
              ? 'Already Moderator'
              : 'Make Moderator'}
          </button>

          <button
            type='button'
            onClick={() => handleRoleChange(null)}
            className={buttonClasses}
            disabled={isPending || currentRole === null}
          >
            {currentRole === null ? 'No Role Assigned' : 'Remove Role'}
          </button>
        </div>
      </article>

      {toast ? (
        <div className='pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center'>
          <div
            role='status'
            className={`flex max-w-md items-center gap-3 rounded-lg border border-border px-4 py-3 shadow-lg ${
              toast.variant === 'success'
                ? 'bg-primary text-primary-foreground'
                : 'bg-destructive text-destructive-foreground'
            }`}
          >
            <span className='text-sm font-medium'>{toast.message}</span>
          </div>
        </div>
      ) : null}
    </>
  );
}
