import Link from 'next/link';
import { userService } from '@/lib/user-service';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const list = await userService.list();
  const users = list.data || [];

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Users</h1>
      {users.length === 0 && (
        <div className="p-4 border rounded bg-gray-50 text-sm">No users found.</div>
      )}
      <div className="border rounded">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Email</th>
              <th className="text-left p-2">Role</th>
              <th className="text-left p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t">
                <td className="p-2"><Link href={`/users/${u.id}`}>{u.name}</Link></td>
                <td className="p-2">{u.email}</td>
                <td className="p-2">{u.role}</td>
                <td className="p-2">{u.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
