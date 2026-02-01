export interface TeamMember {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
  createdAt: string;
}

export interface Task {
  id: string;
  updateId: string;
  userId: string;
  projectId: string;
  description: string;
  status: string;
  mentionedUsers: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  user: TeamMember;
  project: Project;
}

export interface ParsedTask {
  description: string;
  project: string;
  status: string;
  mentioned_people: string[];
  due_date: string | null;
}

export type TaskStatus = "done" | "in_progress" | "todo" | "blocked";
