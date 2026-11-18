// PROTOTYPE, throwaway. Wayfinder ticket #23. Triggers one random catalogue
// Notification for the current DevUI user through the real Knock workflow, so
// badges, toasts and read/seen can be watched arriving live.
import { data } from "react-router";
import type { Route } from "./+types/api.prototype-notify";
import { getCurrentUserId } from "~/lib/session";

const SAMPLES = [
  {
    actor: { id: "7", name: "Olivia Martinez" },
    data: {
      kind: "discussion_reply",
      title: "Olivia Martinez replied to your question",
      course: "Introduction to TypeScript",
      lesson: "Primitive Types",
      snippet: "You can also narrow it with a typeof check before the call.",
      url: "/courses/introduction-to-typescript/lessons/4",
    },
  },
  {
    actor: { id: "15", name: "Mia Lindqvist" },
    data: {
      kind: "discussion_question",
      title: "Mia Lindqvist asked a question",
      course: "Introduction to TypeScript",
      lesson: "Your First TypeScript Program",
      snippet: "Should tsconfig.json live at the repo root or next to src/?",
      url: "/courses/introduction-to-typescript/lessons/3",
    },
  },
  {
    actor: { id: "16", name: "Lucas Moreau" },
    data: {
      kind: "enrollment",
      title: "Lucas Moreau enrolled",
      course: "Introduction to TypeScript",
      url: "/instructor/1/students",
    },
  },
  {
    actor: { id: "8", name: "Liam Thompson" },
    data: {
      kind: "refund_requested",
      title: "Liam Thompson asked for a refund",
      course: "Introduction to TypeScript",
      extra: "$79.00",
      snippet: "Not what I expected.",
      url: "/admin/refunds",
    },
  },
  {
    actor: { id: "17", name: "Zara Haddad" },
    data: {
      kind: "seat_claimed",
      title: "Zara Haddad claimed a Seat",
      course: "Introduction to TypeScript",
      extra: "2 of 10 Seats left",
      url: "/team",
    },
  },
];

export async function action({ request }: Route.ActionArgs) {
  const userId = await getCurrentUserId(request);
  if (!userId) throw data("Select a user from the DevUI panel", 401);
  const sample = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
  const res = await fetch(
    "https://api.knock.app/v1/workflows/prototype-feed-item/trigger",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.KNOCK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recipients: [{ id: String(userId) }], ...sample }),
    }
  );
  return { ok: res.ok };
}
