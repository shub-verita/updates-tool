import { WebClient } from "@slack/web-api";

const token = process.env.SLACK_BOT_TOKEN;

export const slack = token ? new WebClient(token) : null;

export async function sendSlackDM(userId: string, message: string) {
  console.log("[Slack] sendSlackDM called with userId:", userId);
  console.log("[Slack] Token exists:", !!token);
  console.log("[Slack] Client exists:", !!slack);

  if (!slack) {
    console.log("[Slack] No Slack client - token missing or invalid");
    return;
  }
  if (!userId) {
    console.log("[Slack] No userId provided");
    return;
  }

  try {
    console.log("[Slack] Attempting to send message to:", userId);
    const result = await slack.chat.postMessage({
      channel: userId,
      text: message,
    });
    console.log("[Slack] Message sent successfully:", result.ok);
  } catch (error) {
    console.error("[Slack] Failed to send message:", error);
  }
}
