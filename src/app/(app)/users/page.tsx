import Link from 'next/link';
import { userService } from '@/lib/user-service';
import UsersPageClient from '@/components/users/users-page-client';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const list = await userService.list();
  const users = list.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Breadcrumb items={[{ label: 'Users' }]} />
          <h1 className="text-2xl font-semibold">Users</h1>
        </div>
        <Link href="/users/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New User
          </Button>
        </Link>
      </div>

      <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading users...</div>}>
        <UsersPageClient initial={users} />
      </Suspense>
    </div>
  );
}
