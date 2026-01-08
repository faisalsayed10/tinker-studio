import { NextRequest, NextResponse } from "next/server";
import { activeJobs } from "@/lib/training-store";

/**
 * POST /api/training/[id]/stop
 * Stop a running training job
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;

  const job = activeJobs.get(jobId);

  if (!job) {
    return NextResponse.json(
      { success: false, error: "Job not found" },
      { status: 404 }
    );
  }

  if (job.status !== "running") {
    return NextResponse.json(
      { success: false, error: `Job is already ${job.status}` },
      { status: 400 }
    );
  }

  try {
    // Send SIGTERM for graceful shutdown (allows checkpoint saving)
    job.process.kill("SIGTERM");

    // Give it 10 seconds to clean up, then force kill
    setTimeout(() => {
      const currentJob = activeJobs.get(jobId);
      if (currentJob && currentJob.status === "running") {
        currentJob.process.kill("SIGKILL");
        currentJob.status = "cancelled";
        currentJob.logs.push("Training forcefully terminated");
      }
    }, 10000);

    job.status = "cancelled";
    job.logs.push("Training stop requested...");

    return NextResponse.json({
      success: true,
      data: {
        message: "Stop signal sent. Training will terminate after current step.",
      },
    });
  } catch (error) {
    console.error("Error stopping training:", error);
    return NextResponse.json(
      { success: false, error: "Failed to stop training" },
      { status: 500 }
    );
  }
}
