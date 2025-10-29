import { userService } from '@/lib/user-service';
import { reviewerService } from '@/lib/reviewer-service';
import { reviewerAutoAssignmentService, AssignmentAlgorithm } from '@/lib/reviewer-auto-assignment';
import { SubmitButton } from '@/components/ui/submit-button';
import { notFound, redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

async function updateReviewerSpecialtiesAction(formData: FormData) {
  'use server';
  // This would update user specialties in database
  // For now, this is a placeholder - in real implementation would update user profile
  return { ok: true };
}

async function updateReviewerDepartmentAction(formData: FormData) {
  'use server';
  // This would update user department in database
  return { ok: true };
}

async function setAvailabilityAction(formData: FormData) {
  'use server';
  const userId = formData.get('userId') as string;
  const availability = formData.get('availability') as any;
  if (!userId || !availability) return { error: 'Missing params' };
  const result = reviewerService.setAvailability(userId, availability);
  return { ok: result.success };
}

async function setMaxAssignmentsAction(formData: FormData) {
  'use server';
  const userId = formData.get('userId') as string;
  const max = parseInt(formData.get('max') as string);
  if (!userId || !Number.isFinite(max)) return { error: 'Invalid params' };
  const result = reviewerService.setMaxAssignments(userId, max);
  return { ok: result.success };
}

async function testAssignmentAction(formData: FormData) {
  'use server';
  const algorithm = formData.get('algorithm') as AssignmentAlgorithm;
  const specialty = formData.get('specialty') as string;
  const department = formData.get('department') as string;
  const reviewerIds = formData.get('reviewerIds')?.toString().split(',').filter(Boolean) || [];

  // Get reviewer data for matching
  const reviewerIdToDepartment: Record<string, string> = {};
  const reviewerIdToSpecialties: Record<string, string[]> = {};
  
  // In real implementation, would fetch from database
  // For demo, using empty structures (would be populated from user profiles)

  const result = reviewerAutoAssignmentService.assignReviewer({
    reviewerIds: reviewerIds.length > 0 ? reviewerIds : undefined,
    algorithm: algorithm || 'WORKLOAD',
    specialty,
    department,
    reviewerIdToDepartment,
    reviewerIdToSpecialties,
    requireAvailability: ['AVAILABLE', 'BUSY'], // Allow available or busy
  });

  if (result.success && result.data) {
    redirect(`/reviewers?algorithm=${algorithm || 'WORKLOAD'}&assigned=${encodeURIComponent(`${result.data.reviewerId} (score: ${result.data.score})`)}`);
  }
  return { 
    ok: false,
    error: result.error || 'Assignment failed',
  };
}

export default async function ReviewersPage({ searchParams }: { searchParams?: { algorithm?: string, assigned?: string } }) {
  // Get all users with REVIEWER role
  const listResult = await userService.list();
  const allUsers = listResult.data || [];
  const reviewers = allUsers.filter(u => u.role === 'REVIEWER').slice(0, 50); // Limit for demo

  // Get reviewer data
  const reviewersWithData = await Promise.all(reviewers.map(async (user) => {
    const summary = reviewerService.getSummary(user.id);
    const metrics = reviewerService.getMetrics(user.id);
    const rating = reviewerService.getRating(user.id);
    const qualityScore = reviewerService.getQualityScore(user.id);

    return {
      user,
      summary: summary.data,
      metrics: metrics.data,
      rating: rating.data,
      qualityScore: qualityScore.data,
      // In real app, would fetch from user.department and user.specialties
      department: user.department || '',
      specialties: (user.specialties as string[]) || [],
    };
  }));

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Reviewer Management</h1>

      {/* Assignment Tester */}
      <div className="border rounded p-4 space-y-4">
        <h2 className="font-medium">Test Auto-Assignment</h2>
        <form action={testAssignmentAction} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-sm">Algorithm</label>
              <select name="algorithm" className="w-full border p-2 rounded" defaultValue={searchParams?.algorithm || 'WORKLOAD'}>
                <option value="WORKLOAD">Workload (Lower is Better)</option>
                <option value="PERFORMANCE">Performance (Quality Score)</option>
                <option value="SPECIALTY">Specialty Match</option>
                <option value="DEPARTMENT">Department Match</option>
                <option value="ROUND_ROBIN">Round Robin</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-sm">Specialty (optional)</label>
              <input name="specialty" type="text" placeholder="e.g., ELECTRONICS" className="w-full border p-2 rounded" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm">Department (optional)</label>
              <input name="department" type="text" placeholder="e.g., HOME" className="w-full border p-2 rounded" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm">Reviewer IDs (comma-separated, optional)</label>
              <input name="reviewerIds" type="text" placeholder="rev-1,rev-2" className="w-full border p-2 rounded" />
            </div>
          </div>
          <SubmitButton className="bg-black text-white" loadingText="Testing...">Test Assignment</SubmitButton>
        </form>
        {searchParams?.assigned && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded text-sm">
            Assigned: {searchParams.assigned}
          </div>
        )}
      </div>

      {/* Reviewers List */}
      <div className="border rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Availability</th>
              <th className="text-left p-2">Workload</th>
              <th className="text-left p-2">Capacity</th>
              <th className="text-left p-2">Reviews</th>
              <th className="text-left p-2">Rating</th>
              <th className="text-left p-2">Quality</th>
              <th className="text-left p-2">Department</th>
              <th className="text-left p-2">Specialties</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reviewersWithData.map(({ user, summary, metrics, rating, qualityScore, department, specialties }) => (
              <tr key={user.id} className="border-t">
                <td className="p-2">{user.name}</td>
                <td className="p-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    summary?.availability === 'AVAILABLE' ? 'bg-green-100' :
                    summary?.availability === 'BUSY' ? 'bg-yellow-100' :
                    summary?.availability === 'AWAY' ? 'bg-gray-100' :
                    'bg-orange-100'
                  }`}>
                    {summary?.availability || 'N/A'}
                  </span>
                </td>
                <td className="p-2">{summary?.currentAssignments || 0} / {summary?.maxAssignments || 10}</td>
                <td className="p-2">{summary?.capacityPercentage || 0}%</td>
                <td className="p-2">{metrics?.reviewsCompleted || 0}</td>
                <td className="p-2">{rating ? `${rating.toFixed(1)}/5` : '-'}</td>
                <td className="p-2">{qualityScore || 0}</td>
                <td className="p-2">{department || '-'}</td>
                <td className="p-2">{specialties.length > 0 ? specialties.join(', ') : '-'}</td>
                <td className="p-2">
                  <details className="cursor-pointer">
                    <summary className="text-blue-600 hover:underline">Configure</summary>
                    <div className="mt-2 p-2 bg-gray-50 rounded space-y-2">
                      <form action={setAvailabilityAction} className="flex gap-2 items-end">
                        <input type="hidden" name="userId" value={user.id} />
                        <select name="availability" className="border p-1 rounded text-xs" defaultValue={summary?.availability}>
                          <option value="AVAILABLE">Available</option>
                          <option value="BUSY">Busy</option>
                          <option value="AWAY">Away</option>
                          <option value="VACATION">Vacation</option>
                        </select>
                        <SubmitButton className="px-2 py-1 bg-gray-900 text-white rounded text-xs" loadingText="...">Set</SubmitButton>
                      </form>
                      <form action={setMaxAssignmentsAction} className="flex gap-2 items-end">
                        <input type="hidden" name="userId" value={user.id} />
                        <input name="max" type="number" min="1" max="100" defaultValue={summary?.maxAssignments || 10} className="w-20 border p-1 rounded text-xs" />
                        <span className="text-xs text-gray-600">max assignments</span>
                        <SubmitButton className="px-2 py-1 bg-gray-900 text-white rounded text-xs" loadingText="...">Set</SubmitButton>
                      </form>
                    </div>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {reviewersWithData.length === 0 && (
          <div className="p-4 text-center text-gray-500">No reviewers found</div>
        )}
      </div>
    </div>
  );
}

