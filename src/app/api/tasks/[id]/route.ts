import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyTaskChange } from "@/lib/notifications";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { description, status, projectId, dueDate } = body;

    // Get the old task to compare status
    const oldTask = await prisma.task.findUnique({
      where: { id },
      select: { status: true },
    });

    const updateData: Record<string, unknown> = {};
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (projectId !== undefined) updateData.projectId = projectId;
    if (dueDate !== undefined) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null;
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        user: true,
        project: true,
      },
    });

    // Send Slack notification
    const isStatusChange = oldTask && status !== undefined && oldTask.status !== status;
    notifyTaskChange({
      userName: task.user.name,
      slackUserId: task.user.slackUserId,
      taskDescription: task.description,
      projectName: task.project.name,
      action: isStatusChange ? "status_changed" : "updated",
      oldStatus: oldTask?.status,
      newStatus: task.status,
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("Failed to update task:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get task info before deletion for notification
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        user: true,
        project: true,
      },
    });

    await prisma.task.delete({
      where: { id },
    });

    // Send Slack notification
    if (task) {
      notifyTaskChange({
        userName: task.user.name,
        slackUserId: task.user.slackUserId,
        taskDescription: task.description,
        projectName: task.project.name,
        action: "deleted",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete task:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
