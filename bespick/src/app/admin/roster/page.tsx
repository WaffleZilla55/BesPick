import { clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { checkRole } from '@/server/auth/check-role';

import { SearchUsers } from './_components/SearchUsers';
import { UserRoleCard } from './_components/UserRoleCard';

export default async function AdminRosterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await checkRole('admin'))) {
    redirect('/');
  }

  const params = await searchParams;
  const rawQuery = params?.search;
  const query =
    typeof rawQuery === 'string'
      ? rawQuery.trim()
      : Array.isArray(rawQuery)
      ? rawQuery.at(0)?.trim()
      : '';

  const client = await clerkClient();

  const users = query ? (await client.users.getUserList({ query })).data : [];

  const primaryEmail = (user: (typeof users)[number]) =>
    user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)
      ?.emailAddress ?? 'No email available';

  return (
    <div className='mx-auto w-full max-w-5xl space-y-8 px-4 py-10'>
      <header className='rounded-2xl border border-border bg-card p-6 shadow-sm'>
        <h1 className='text-3xl font-semibold text-foreground'>
          Admin Dashboard
        </h1>
        <p className='mt-2 text-sm text-muted-foreground'>
          Manage user roles and permissions. Only members with the admin role
          can access this view. Moderator roles have no function currently.
        </p>
      </header>

      <section className='rounded-2xl border border-border bg-card p-6 shadow-sm backdrop-blur'>
        <SearchUsers />
      </section>

      <section className='space-y-4'>
        {users.length === 0 ? (
          <p className='rounded-xl border border-dashed border-border bg-secondary/50 px-4 py-6 text-center text-sm text-muted-foreground'>
            {query
              ? 'No users match your search just yet.'
              : 'Search for a user to view and manage their roles.'}
          </p>
        ) : (
          users.map((user) => (
            <UserRoleCard
              key={user.id}
              user={{
                id: user.id,
                fullName:
                  `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() ||
                  user.username ||
                  'Unnamed User',
                email: primaryEmail(user),
                role: (user.publicMetadata.role as string) ?? null,
              }}
            />
          ))
        )}
      </section>
    </div>
  );
}
