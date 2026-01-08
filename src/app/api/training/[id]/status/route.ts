import { NextRequest, NextResponse } from "next/server";
import { activeJobs } from "@/lib/training-store";

/**
 * GET /api/training/[id]/status
 * Check if a training job is still active and get its status
 */

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;

  const job = activeJobs.get(jobId);

  if (!job) {
    return NextResponse.json({
      success: true,
      data: {
        exists: false,
        status: null,
        logsCount: 0,
      },
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      exists: true,
      status: job.status,
      logsCount: job.logs.length,
      startedAt: job.startedAt,
    },
  });
}
