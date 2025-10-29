import { registrationRequestService } from '@/lib/registration-request-service';
import { SubmitButton } from '@/components/ui/submit-button';

export const dynamic = 'force-dynamic';

async function approveAction(formData: FormData) {
  'use server';
  const id = formData.get('id') as string;
  const adminId = (formData.get('adminId') as string) || 'admin-ui';
  await registrationRequestService.approve(id, adminId, 'Approved via UI');
  return { approved: 1 } as any;
}

async function rejectAction(formData: FormData) {
  'use server';
  const id = formData.get('id') as string;
  const adminId = (formData.get('adminId') as string) || 'admin-ui';
  const reason = (formData.get('reason') as string) || 'Rejected via UI';
  await registrationRequestService.reject(id, adminId, reason);
  return { rejected: 1 } as any;
}

export default async function RegistrationQueuePage({ searchParams }: { searchParams?: { approved?: string, rejected?: string } }) {
  const pending = await registrationRequestService.list({ status: 'PENDING' });
  const items = pending.data || [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Registration Requests</h1>
      {(searchParams?.approved || searchParams?.rejected) && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded text-sm">
          {searchParams?.approved && 'Request approved.'}
          {searchParams?.rejected && ' Request rejected.'}
        </div>
      )}
      <div className="border rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-2">Email</th>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Desired Role</th>
              <th className="text-left p-2">Message</th>
              <th className="text-left p-2">Submitted</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.email}</td>
                <td className="p-2">{r.name}</td>
                <td className="p-2">{r.desiredRole}</td>
                <td className="p-2 truncate max-w-xs">{r.message || '-'}</td>
                <td className="p-2">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="p-2">
                  <form action={approveAction} className="inline-block mr-2">
                    <input type="hidden" name="id" value={r.id} />
                    <SubmitButton className="border rounded px-2 py-1" loadingText="Approving...">Approve</SubmitButton>
                  </form>
                  <form action={rejectAction} className="inline-block">
                    <input type="hidden" name="id" value={r.id} />
                    <input name="reason" placeholder="Reason" className="border p-1 rounded mr-2" aria-invalid={false} />
                    <SubmitButton className="border rounded px-2 py-1" loadingText="Rejecting...">Reject</SubmitButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
