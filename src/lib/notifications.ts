import { sendSlackDM } from "./slack";

interface NotifyParams {
  userName: string;
  slackUserId: string | null;
  taskDescription: string;
  projectName: string;
  action: "created" | "updated" | "status_changed" | "deleted";
  oldStatus?: string;
  newStatus?: string;
}

const STATUS_LABELS: Record<string, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  done: "Done",
  blocked: "Blocked",
};

export async function notifyTaskChange(params: NotifyParams) {
  if (!params.slackUserId) return;

  let message = "";

  switch (params.action) {
    case "created":
      message = `✨ *New task assigned to you:*\n${params.taskDescription}\n_Project: ${params.projectName}_`;
      break;
    case "updated":
      message = `✏️ *Task updated:*\n${params.taskDescription}\n_Project: ${params.projectName}_`;
      break;
    case "status_changed":
      const oldLabel = STATUS_LABELS[params.oldStatus || ""] || params.oldStatus;
      const newLabel = STATUS_LABELS[params.newStatus || ""] || params.newStatus;
      message = `🔄 *Task status changed:* ${oldLabel} → ${newLabel}\n${params.taskDescription}`;
      break;
    case "deleted":
      message = `🗑️ *Task deleted:*\n${params.taskDescription}`;
      break;
  }

  await sendSlackDM(params.slackUserId, message);
}
