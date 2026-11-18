// PROTOTYPE, throwaway. Wayfinder ticket #23: "What does the Notification Feed
// look like in Cadence?". It fills real Knock (Development) feeds with v1
// catalogue Notifications so the Feed variants have something to render.
//
//   npx tsx --env-file=.env scripts/seed-notification-feed.prototype.ts
//
// It triggers the generic `prototype-feed-item` workflow, whose in-app step
// renders `data.title` and links `data.url`. The Feed UI renders from `data`.

const KEY = process.env.KNOCK_API_KEY!;
const WORKFLOW = "prototype-feed-item";

type Kind =
  | "refund_approved"
  | "refund_declined"
  | "refund_requested"
  | "seat_claimed"
  | "enrollment"
  | "discussion_question"
  | "discussion_reply";

interface Item {
  recipient: string;
  actor?: { id: string; name: string };
  data: {
    kind: Kind;
    title: string;
    course: string;
    lesson?: string;
    snippet?: string;
    url: string;
    extra?: string;
  };
}

const NAMES: Record<string, string> = {
  "1": "Alex Rivera",
  "2": "Sarah Chen",
  "5": "Emma Wilson",
  "10": "Bossy McBossface",
};

const TS = "Introduction to TypeScript";
const NODE = "Building REST APIs with Node.js";

const items: Item[] = [
  // Emma Wilson (5), Student
  {
    recipient: "5",
    actor: { id: "2", name: "Sarah Chen" },
    data: {
      kind: "discussion_reply",
      title: "Sarah Chen replied to your question",
      course: TS,
      lesson: "Your First TypeScript Program",
      snippet:
        "That usually means TypeScript is installed locally but not on your PATH. Try npx tsc…",
      url: "/courses/introduction-to-typescript/lessons/3#comment-2",
    },
  },
  {
    recipient: "5",
    actor: { id: "1", name: "Alex Rivera" },
    data: {
      kind: "refund_declined",
      title: "Your Refund Request was declined",
      course: NODE,
      extra: "You've completed most of the course. Reply with more detail and we'll take another look.",
      url: "/courses/building-rest-apis-with-nodejs",
    },
  },
  {
    recipient: "5",
    actor: { id: "1", name: "Alex Rivera" },
    data: {
      kind: "refund_approved",
      title: "Your Refund Request was approved",
      course: TS,
      extra: "$49.99 is on its way back to you.",
      url: "/courses/introduction-to-typescript",
    },
  },
  {
    recipient: "5",
    actor: { id: "6", name: "James Park" },
    data: {
      kind: "discussion_reply",
      title: "James Park replied to your question",
      course: TS,
      lesson: "Primitive Types",
      snippet: "Strict mode also turns on noImplicitAny, so the second example won't compile.",
      url: "/courses/introduction-to-typescript/lessons/4#comment-7",
    },
  },

  // Sarah Chen (2), Instructor
  {
    recipient: "2",
    actor: { id: "6", name: "James Park" },
    data: {
      kind: "discussion_question",
      title: "James Park asked a question",
      course: TS,
      lesson: "What is TypeScript?",
      snippet: "Coming from JavaScript, how much of this will feel familiar?",
      url: "/courses/introduction-to-typescript/lessons/1#comment-8",
    },
  },
  {
    recipient: "2",
    actor: { id: "11", name: "Ava Nakamura" },
    data: {
      kind: "enrollment",
      title: "Ava Nakamura enrolled",
      course: TS,
      url: "/instructor/1/students",
    },
  },
  {
    recipient: "2",
    actor: { id: "7", name: "Olivia Martinez" },
    data: {
      kind: "discussion_question",
      title: "Olivia Martinez asked a question",
      course: TS,
      lesson: "Function Types",
      snippet: "Why does this fail to infer? I expected `T` to come out as `string`…",
      url: "/courses/introduction-to-typescript/lessons/8#comment-4",
    },
  },
  {
    recipient: "2",
    actor: { id: "12", name: "Noah Blackwood" },
    data: {
      kind: "enrollment",
      title: "Noah Blackwood enrolled",
      course: "Design Systems with Tailwind",
      url: "/instructor/3/students",
    },
  },
  {
    recipient: "2",
    actor: { id: "9", name: "Sophia Davis" },
    data: {
      kind: "discussion_question",
      title: "Sophia Davis asked a question",
      course: TS,
      lesson: "Arrays and Tuples",
      snippet: "Is there a reason to prefer `interface` over `type` here, or is it taste?",
      url: "/courses/introduction-to-typescript/lessons/5#comment-5",
    },
  },

  // Alex Rivera (1), Platform Admin
  {
    recipient: "1",
    actor: { id: "7", name: "Olivia Martinez" },
    data: {
      kind: "refund_requested",
      title: "Olivia Martinez asked for a refund",
      course: TS,
      extra: "$49.99",
      snippet: "The course is aimed at beginners and I was hoping for advanced generics.",
      url: "/admin/refunds",
    },
  },
  {
    recipient: "1",
    actor: { id: "6", name: "James Park" },
    data: {
      kind: "refund_requested",
      title: "James Park asked for a refund",
      course: TS,
      extra: "$25.00",
      snippet: "Bought it twice by accident.",
      url: "/admin/refunds",
    },
  },

  // Bossy McBossface (10), Team Admin
  {
    recipient: "10",
    actor: { id: "13", name: "Isla Fernandes" },
    data: {
      kind: "seat_claimed",
      title: "Isla Fernandes claimed a Seat",
      course: TS,
      extra: "4 of 10 Seats left",
      url: "/team",
    },
  },
  {
    recipient: "10",
    actor: { id: "14", name: "Ethan Okafor" },
    data: {
      kind: "seat_claimed",
      title: "Ethan Okafor claimed a Seat",
      course: TS,
      extra: "3 of 10 Seats left",
      url: "/team",
    },
  },
];

for (const item of items) {
  const res = await fetch(
    `https://api.knock.app/v1/workflows/${WORKFLOW}/trigger`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Inline objects identify the recipient in Knock; a bare id string is
        // skipped when the user doesn't exist there yet.
        recipients: [{ id: item.recipient, name: NAMES[item.recipient] }],
        actor: item.actor,
        data: item.data,
      }),
    }
  );
  console.log(res.status, item.recipient, item.data.title);
  // Spread the inserted_at timestamps a little so ordering is visible.
  await new Promise((r) => setTimeout(r, 400));
}
export {};
