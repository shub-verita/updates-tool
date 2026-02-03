import { WebClient } from "@slack/web-api";

const token = process.env.SLACK_BOT_TOKEN;

export const slack = token ? new WebClient(token) : null;

export async function sendSlackDM(userId: string, message: string) {
  if (!slack || !userId) return;
  try {
    await slack.chat.postMessage({
      channel: userId,
      text: message,
    });
  } catch (error) {
    console.error("Failed to send Slack message:", error);
  }
}
