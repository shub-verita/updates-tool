import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface TaskInput {
  description: string;
  project: string;
  status: string;
  mentioned_people: string[];
  due_date: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, rawText, tasks, date } = body as {
      userId: string;
      rawText: string;
      tasks: TaskInput[];
      date?: string; // Optional date in YYYY-MM-DD format
    };

    if (!userId || !rawText || !tasks || !Array.isArray(tasks)) {
      return NextResponse.json(
        { error: "userId, rawText, and tasks are required" },
        { status: 400 }
      );
    }

    // Fetch all projects to map names to IDs
    const projects = await prisma.project.findMany();
    const projectMap = new Map(projects.map((p) => [p.name.toLowerCase(), p.id]));

    // Fetch all team members for mentioned users
    const teamMembers = await prisma.teamMember.findMany();

    // Use provided date or default to today
    const targetDate = date ? new Date(date + "T12:00:00Z") : new Date();
    const startOfDay = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), 23, 59, 59, 999));

    // Get existing tasks for this user today to check for duplicates
    const existingTasks = await prisma.task.findMany({
      where: {
        userId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: { description: true },
    });
    const existingDescriptions = new Set(
      existingTasks.map((t) => t.description.toLowerCase().trim())
    );

    // Filter out duplicate tasks
    const uniqueTasks = tasks.filter(
      (task) => !existingDescriptions.has(task.description.toLowerCase().trim())
    );

    if (uniqueTasks.length === 0) {
      return NextResponse.json(
        { error: "All tasks already exist for today", duplicates: true },
        { status: 400 }
      );
    }

    // Create the update with the target date
    const update = await prisma.update.create({
      data: {
        userId,
        rawText,
        date: startOfDay,
      },
    });

    // Create only unique tasks
    const createdTasks = await Promise.all(
      uniqueTasks.map(async (task) => {
        const projectId = projectMap.get(task.project.toLowerCase());
        if (!projectId) {
          // Default to Internal/Individual if project not found
          const opsProject = projects.find((p) => p.name === "Internal/Individual");
          if (!opsProject) throw new Error("Ops project not found");
          return prisma.task.create({
            data: {
              updateId: update.id,
              userId,
              projectId: opsProject.id,
              description: task.description,
              status: task.status,
              mentionedUsers: JSON.stringify(task.mentioned_people || []),
              dueDate: task.due_date ? new Date(task.due_date) : null,
              createdAt: startOfDay,
            },
          });
        }
        return prisma.task.create({
          data: {
            updateId: update.id,
            userId,
            projectId,
            description: task.description,
            status: task.status,
            mentionedUsers: JSON.stringify(task.mentioned_people || []),
            dueDate: task.due_date ? new Date(task.due_date) : null,
            createdAt: startOfDay,
          },
        });
      })
    );

    const skippedCount = tasks.length - uniqueTasks.length;
    return NextResponse.json({
      update,
      tasks: createdTasks,
      skippedDuplicates: skippedCount,
    });
  } catch (error) {
    console.error("Failed to create update:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create update" },
      { status: 500 }
    );
  }
}
