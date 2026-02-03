import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const teamMembers = await prisma.teamMember.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(teamMembers);
  } catch (error) {
    console.error("Failed to fetch team members:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, color, slackUserId } = body;

    if (!name || !color) {
      return NextResponse.json(
        { error: "name and color are required" },
        { status: 400 }
      );
    }

    const teamMember = await prisma.teamMember.create({
      data: { name, color, slackUserId: slackUserId || null },
    });

    return NextResponse.json(teamMember);
  } catch (error) {
    console.error("Failed to create team member:", error);
    return NextResponse.json(
      { error: "Failed to create team member" },
      { status: 500 }
    );
  }
}
