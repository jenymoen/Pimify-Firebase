import Link from 'next/link';
import { userService } from '@/lib/user-service';
import UsersPageClient from '@/components/users/users-page-client';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const list = await userService.list();
  const users = list.data || [];

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Users</h1>
      <UsersPageClient initial={users} />
    </div>
  );
}
