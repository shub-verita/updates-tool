import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, projectId, description, status = "todo", date } = body;

    if (!userId || !projectId || !description) {
      return NextResponse.json(
        { error: "userId, projectId, and description are required" },
        { status: 400 }
      );
    }

    // Use provided date or default to now
    const targetDate = date ? new Date(date + "T12:00:00Z") : new Date();

    // Create a quick update to link the task to (required by schema)
    const update = await prisma.update.create({
      data: {
        userId,
        rawText: description,
        date: targetDate,
      },
    });

    const task = await prisma.task.create({
      data: {
        updateId: update.id,
        userId,
        projectId,
        description,
        status,
        createdAt: targetDate,
      },
      include: {
        user: true,
        project: true,
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("Failed to create task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    if (!dateParam) {
      return NextResponse.json(
        { error: "date parameter is required (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    // Parse YYYY-MM-DD and create start/end of day in UTC
    const [year, month, day] = dateParam.split("-").map(Number);
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    const tasks = await prisma.task.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        user: true,
        project: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Deduplicate tasks by description + userId (keep the first/newest one)
    const seen = new Set<string>();
    const uniqueTasks = tasks.filter((task) => {
      const key = `${task.userId}:${task.description.toLowerCase().trim()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

    return NextResponse.json(uniqueTasks);
  } catch (error) {
    console.error("Failed to fetch tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}
