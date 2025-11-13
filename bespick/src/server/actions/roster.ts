'use server';

import { clerkClient } from '@clerk/nextjs/server';

import { checkRole } from '@/server/auth/check-role';

export type UpdateUserRoleResult = {
  success: boolean;
  role: string | null;
  message: string;
};

export async function updateUserRole({
  id,
  role,
}: {
  id: string;
  role: string | null;
}): Promise<UpdateUserRoleResult> {
  if (!(await checkRole('admin'))) {
    return {
      success: false,
      role: null,
      message: 'You are not authorized to perform this action.',
    };
  }

  try {
    const client = await clerkClient();
    const response = await client.users.updateUserMetadata(id, {
      publicMetadata: { role },
    });

    const nextRole = (response.publicMetadata.role as string | null) ?? null;

    return {
      success: true,
      role: nextRole,
      message: role ? `Role updated to ${role}.` : 'Role removed successfully.',
    };
  } catch (error) {
    console.error('Failed to update role', error);
    return {
      success: false,
      role: null,
      message: 'Updating the role failed. Please try again.',
    };
  }
}
