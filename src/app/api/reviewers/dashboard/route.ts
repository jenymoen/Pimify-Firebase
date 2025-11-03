import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/lib/user-service';
import { reviewerService } from '@/lib/reviewer-service';

export async function GET(_req: NextRequest) {
  try {
    const listResult = await userService.list();
    const allUsers = listResult.data || [];
    const reviewers = allUsers.filter(u => u.role === 'REVIEWER');

    const reviewersWithData = await Promise.all(reviewers.map(async (user) => {
      const summary = reviewerService.getSummary(user.id);
      const summaryData = summary.data;
      if (!summaryData) return null;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        availability: summaryData.availability,
        currentAssignments: summaryData.currentAssignments,
        maxAssignments: summaryData.maxAssignments,
        capacityPercentage: summaryData.capacityPercentage,
        reviewsCompleted: summaryData.reviewsCompleted,
        avgTime: summaryData.averageReviewTimeMs / (1000 * 60 * 60), // Convert ms to hours
        approvalRate: summaryData.approvalRate / 100, // Convert 0-100 to 0-1
        rating: summaryData.rating,
        department: user.department || undefined,
      };
    }));

    const validReviewers = reviewersWithData.filter((r): r is NonNullable<typeof r> => r !== null);

    return NextResponse.json({
      success: true,
      reviewers: validReviewers,
      total: validReviewers.length,
      overCapacity: validReviewers.filter(r => r.capacityPercentage > 80).length,
      averageApprovalRate: validReviewers.length > 0
        ? validReviewers.reduce((sum, r) => sum + r.approvalRate, 0) / validReviewers.length
        : 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch reviewer dashboard data' },
      { status: 500 }
    );
  }
}


