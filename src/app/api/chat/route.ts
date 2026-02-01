import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, date } = body;

    if (!question) {
      return NextResponse.json(
        { error: "question is required" },
        { status: 400 }
      );
    }

    // Fetch all relevant data for context
    const [teamMembers, projects, recentTasks] = await Promise.all([
      prisma.teamMember.findMany(),
      prisma.project.findMany(),
      // Get tasks from last 7 days
      prisma.task.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        include: {
          user: true,
          project: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Build context for the AI
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    // Group tasks by date and user
    const tasksByDate: Record<string, typeof recentTasks> = {};
    recentTasks.forEach((task) => {
      const dateKey = task.createdAt.toISOString().split("T")[0];
      if (!tasksByDate[dateKey]) tasksByDate[dateKey] = [];
      tasksByDate[dateKey].push(task);
    });

    // Build a summary of the data
    const dataSummary = `
TEAM MEMBERS: ${teamMembers.map((m) => m.name).join(", ")}

PROJECTS: ${projects.map((p) => p.name).join(", ")}

TODAY'S DATE: ${todayStr}
YESTERDAY'S DATE: ${yesterdayStr}

TASKS DATA (last 7 days):
${Object.entries(tasksByDate)
  .map(([dateKey, tasks]) => {
    const dateLabel = dateKey === todayStr ? "TODAY" : dateKey === yesterdayStr ? "YESTERDAY" : dateKey;
    const byUser: Record<string, typeof tasks> = {};
    tasks.forEach((t) => {
      if (!byUser[t.user.name]) byUser[t.user.name] = [];
      byUser[t.user.name].push(t);
    });
    return `
[${dateLabel}]
${Object.entries(byUser)
  .map(([userName, userTasks]) => {
    const done = userTasks.filter((t) => t.status === "done").length;
    const inProgress = userTasks.filter((t) => t.status === "in_progress").length;
    const todo = userTasks.filter((t) => t.status === "todo").length;
    const blocked = userTasks.filter((t) => t.status === "blocked").length;
    return `${userName}: ${userTasks.length} tasks (${done} done, ${inProgress} in progress, ${todo} todo, ${blocked} blocked)
  Tasks: ${userTasks.map((t) => `"${t.description}" [${t.status}] (${t.project.name})`).join("; ")}`;
  })
  .join("\n")}`;
  })
  .join("\n")}
`.trim();

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant for a team task management app called "Verita Updates".
You have access to task data and can answer questions about team members, their tasks, progress, and projects.
Be concise and friendly. Use bullet points for lists. If asked about specific people or dates, provide accurate counts.
If you don't have enough data to answer, say so politely.

Here is the current data:

${dataSummary}`,
        },
        {
          role: "user",
          content: question,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const answer = completion.choices[0]?.message?.content || "Sorry, I couldn't process that question.";

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to process question" },
      { status: 500 }
    );
  }
}
