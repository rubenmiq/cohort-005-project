// PROTOTYPE, throwaway. Wayfinder ticket #23: "What does the Notification Feed
// look like in Cadence?"
//
// Three variants of the Notification Feed, mounted in the real app layout and
// switchable via `?variant=A|B|C`. Each reads the current DevUI user's real
// Knock (Development) feed in the browser with a server-signed user token.
//
//   A  Bell popover:     bell next to the logo, badge = UNSEEN, opening marks all seen
//   B  Inbox drawer:     "Notifications" nav item, badge = UNREAD, right drawer with tabs
//   C  Top bar + toasts: bar over the page, toasts for new arrivals, grouped by kind
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  Archive,
  Bell,
  BellDot,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleX,
  GraduationCap,
  Inbox,
  MessageSquare,
  Receipt,
  Reply,
  UserPlus,
  X,
} from "lucide-react";
import { cn } from "~/lib/utils";

// ─── Knock headless feed ─────────────────────────────────────────────────────

export interface KnockFeedConfig {
  userId: string;
  publicKey: string;
  channelId: string;
  userToken: string;
}

export type NotificationKind =
  | "refund_approved"
  | "refund_declined"
  | "refund_requested"
  | "seat_claimed"
  | "enrollment"
  | "discussion_question"
  | "discussion_reply";

export interface FeedItem {
  id: string;
  inserted_at: string;
  seen_at: string | null;
  read_at: string | null;
  archived_at: string | null;
  actors: { id: string; name?: string }[];
  data: {
    kind: NotificationKind;
    title: string;
    course: string;
    lesson?: string;
    snippet?: string;
    url: string;
    extra?: string;
  };
}

interface FeedMeta {
  unread_count: number;
  unseen_count: number;
  total_count: number;
}

const API = "https://api.knock.app/v1";

export function useKnockFeed(
  config: KnockFeedConfig,
  onNewItems?: (items: FeedItem[]) => void
) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [meta, setMeta] = useState<FeedMeta>({
    unread_count: 0,
    unseen_count: 0,
    total_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const known = useRef<Set<string> | null>(null);
  const onNewRef = useRef(onNewItems);
  onNewRef.current = onNewItems;

  const headers = {
    Authorization: `Bearer ${config.publicKey}`,
    "X-Knock-User-Token": config.userToken,
    "Content-Type": "application/json",
  };

  const load = useCallback(async () => {
    const res = await fetch(
      `${API}/users/${config.userId}/feeds/${config.channelId}?page_size=30`,
      { headers }
    );
    if (!res.ok) return;
    const json = await res.json();
    const entries: FeedItem[] = json.entries;
    if (known.current) {
      const fresh = entries.filter((e) => !known.current!.has(e.id));
      if (fresh.length) onNewRef.current?.(fresh);
    }
    known.current = new Set(entries.map((e) => e.id));
    setItems(entries);
    setMeta(json.meta);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.userId, config.channelId, config.userToken]);

  // Switching DevUI user resets the feed. Polls every 10s (Knock also offers a
  // realtime socket; polling is enough to judge the UI).
  useEffect(() => {
    known.current = null;
    setLoading(true);
    setItems([]);
    load();
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, [load]);

  const update = useCallback(
    async (
      status: "seen" | "read" | "unread" | "archived",
      ids: string[]
    ) => {
      if (!ids.length) return;
      const now = new Date().toISOString();
      // Optimistic local update, then tell Knock.
      setItems((prev) =>
        prev
          .map((i) => {
            if (!ids.includes(i.id)) return i;
            if (status === "seen") return { ...i, seen_at: i.seen_at ?? now };
            if (status === "read")
              return { ...i, read_at: now, seen_at: i.seen_at ?? now };
            if (status === "unread") return { ...i, read_at: null };
            return { ...i, archived_at: now };
          })
          .filter((i) => !i.archived_at)
      );
      setMeta((m) => {
        const hit = items.filter((i) => ids.includes(i.id));
        const unseen = hit.filter((i) => !i.seen_at).length;
        const unread = hit.filter((i) => !i.read_at).length;
        if (status === "seen")
          return { ...m, unseen_count: m.unseen_count - unseen };
        if (status === "read")
          return {
            ...m,
            unseen_count: m.unseen_count - unseen,
            unread_count: m.unread_count - unread,
          };
        if (status === "unread")
          return { ...m, unread_count: m.unread_count + (hit.length - unread) };
        return {
          ...m,
          total_count: m.total_count - hit.length,
          unseen_count: m.unseen_count - unseen,
          unread_count: m.unread_count - unread,
        };
      });
      await fetch(`${API}/messages/batch/${status}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message_ids: ids }),
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, config.userToken]
  );

  return {
    items,
    meta,
    loading,
    markSeen: (ids: string[]) => update("seen", ids),
    markAllSeen: () =>
      update(
        "seen",
        items.filter((i) => !i.seen_at).map((i) => i.id)
      ),
    markRead: (id: string) => update("read", [id]),
    markUnread: (id: string) => update("unread", [id]),
    markAllRead: () =>
      update(
        "read",
        items.filter((i) => !i.read_at).map((i) => i.id)
      ),
    archive: (id: string) => update("archived", [id]),
  };
}

// ─── Tiny shared bits (icon + time only; each variant owns its layout) ──────

const KIND: Record<
  NotificationKind,
  { icon: typeof Bell; label: string; plural: string; tone: string }
> = {
  refund_approved: {
    icon: CircleCheck,
    label: "Refund approved",
    plural: "Refund decisions",
    tone: "text-emerald-600 bg-emerald-500/10",
  },
  refund_declined: {
    icon: CircleX,
    label: "Refund declined",
    plural: "Refund decisions",
    tone: "text-rose-600 bg-rose-500/10",
  },
  refund_requested: {
    icon: Receipt,
    label: "Refund Request",
    plural: "Open Refund Requests",
    tone: "text-amber-600 bg-amber-500/10",
  },
  seat_claimed: {
    icon: UserPlus,
    label: "Seat claimed",
    plural: "Claimed Seats",
    tone: "text-sky-600 bg-sky-500/10",
  },
  enrollment: {
    icon: GraduationCap,
    label: "New Enrollment",
    plural: "New Enrollments",
    tone: "text-violet-600 bg-violet-500/10",
  },
  discussion_question: {
    icon: MessageSquare,
    label: "Discussion Question",
    plural: "Discussion Questions",
    tone: "text-indigo-600 bg-indigo-500/10",
  },
  discussion_reply: {
    icon: Reply,
    label: "Discussion Reply",
    plural: "Replies to you",
    tone: "text-indigo-600 bg-indigo-500/10",
  },
};

function ago(iso: string) {
  const s = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  onOut: () => void,
  active: boolean
) {
  useEffect(() => {
    if (!active) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOut();
    };
    const k = (e: KeyboardEvent) => e.key === "Escape" && onOut();
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", k);
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("keydown", k);
    };
  }, [active, onOut, ref]);
}

// ─── Variant A: bell popover beside the logo ────────────────────────────────
// Badge counts UNSEEN. Opening the popover marks everything seen (badge
// clears) but leaves items unread (bold + dot) until clicked.

export function VariantA({ config }: { config: KnockFeedConfig }) {
  const feed = useKnockFeed(config);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) feed.markAllSeen();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        title="Notifications"
        className="relative rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <Bell className="size-5" />
        {feed.meta.unseen_count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {feed.meta.unseen_count > 9 ? "9+" : feed.meta.unseen_count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-full top-0 z-40 ml-3 w-96 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="font-semibold">Notifications</div>
            <button
              onClick={feed.markAllRead}
              disabled={feed.meta.unread_count === 0}
              className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              Mark all as read
            </button>
          </div>
          <div className="max-h-[28rem] overflow-y-auto">
            {feed.loading && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Loading…
              </div>
            )}
            {!feed.loading && feed.items.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                You're all caught up.
              </div>
            )}
            {feed.items.map((item) => {
              const k = KIND[item.data.kind];
              const Icon = k.icon;
              const unread = !item.read_at;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    feed.markRead(item.id);
                    setOpen(false);
                    navigate(item.data.url);
                  }}
                  className={cn(
                    "flex w-full gap-3 border-b px-4 py-3 text-left last:border-b-0 hover:bg-muted/60",
                    unread && "bg-primary/[0.04]"
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                      k.tone
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      className={cn(
                        "text-sm",
                        unread ? "font-semibold" : "text-muted-foreground"
                      )}
                    >
                      {item.data.title}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {item.data.lesson
                        ? `${item.data.lesson} · ${item.data.course}`
                        : item.data.course}
                    </div>
                    {item.data.snippet && (
                      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        “{item.data.snippet}”
                      </div>
                    )}
                    {item.data.extra && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {item.data.extra}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="text-xs text-muted-foreground">
                      {ago(item.inserted_at)}
                    </span>
                    {unread && (
                      <span className="size-2 rounded-full bg-primary" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Variant B: "Notifications" nav item + full-height inbox drawer ─────────
// Badge counts UNREAD (no "seen" concept at all). Drawer has All/Unread tabs,
// Today/Earlier groups, and explicit per-row read toggle and dismiss.

export function VariantBNavItem({ config }: { config: KnockFeedConfig }) {
  const feed = useKnockFeed(config);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("unread");
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);

  const visible = feed.items.filter((i) => tab === "all" || !i.read_at);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const groups = [
    {
      label: "Today",
      items: visible.filter((i) => Date.parse(i.inserted_at) >= +startOfToday),
    },
    {
      label: "Earlier",
      items: visible.filter((i) => Date.parse(i.inserted_at) < +startOfToday),
    },
  ].filter((g) => g.items.length);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          open
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <Inbox className="size-4" />
        Notifications
        {feed.meta.unread_count > 0 && (
          <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
            {feed.meta.unread_count}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/20">
          <div
            ref={ref}
            className="absolute inset-y-0 right-0 flex w-[30rem] flex-col border-l bg-background shadow-2xl"
          >
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold">Notifications</h2>
              <button
                onClick={close}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex items-center gap-1 border-b px-6 py-2">
              {(["unread", "all"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm",
                    tab === t
                      ? "bg-muted font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t === "unread"
                    ? `Unread (${feed.meta.unread_count})`
                    : "All"}
                </button>
              ))}
              <button
                onClick={feed.markAllRead}
                disabled={feed.meta.unread_count === 0}
                className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                <CheckCheck className="size-4" /> Mark all read
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {visible.length === 0 && (
                <div className="mt-16 text-center text-muted-foreground">
                  <Inbox className="mx-auto mb-3 size-10 opacity-40" />
                  {tab === "unread" ? "Nothing unread." : "No Notifications yet."}
                </div>
              )}
              {groups.map((g) => (
                <section key={g.label} className="mb-6">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {g.label}
                  </h3>
                  <ul className="space-y-2">
                    {g.items.map((item) => {
                      const k = KIND[item.data.kind];
                      const unread = !item.read_at;
                      return (
                        <li
                          key={item.id}
                          className={cn(
                            "group rounded-lg border p-4",
                            unread
                              ? "border-l-4 border-l-primary"
                              : "opacity-70"
                          )}
                        >
                          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                            <span className="font-medium uppercase tracking-wide">
                              {k.label}
                            </span>
                            <span>
                              {new Date(item.inserted_at).toLocaleString(
                                undefined,
                                {
                                  hour: "numeric",
                                  minute: "2-digit",
                                  day: "numeric",
                                  month: "short",
                                }
                              )}
                            </span>
                          </div>
                          <div className="font-medium">{item.data.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.data.course}
                            {item.data.lesson && ` → ${item.data.lesson}`}
                          </div>
                          {item.data.snippet && (
                            <blockquote className="mt-2 border-l-2 pl-3 text-sm italic text-muted-foreground">
                              {item.data.snippet}
                            </blockquote>
                          )}
                          {item.data.extra && (
                            <p className="mt-2 text-sm">{item.data.extra}</p>
                          )}
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              onClick={() => {
                                feed.markRead(item.id);
                                close();
                                navigate(item.data.url);
                              }}
                              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                            >
                              Open
                            </button>
                            <button
                              onClick={() =>
                                unread
                                  ? feed.markRead(item.id)
                                  : feed.markUnread(item.id)
                              }
                              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                            >
                              <Check className="size-3.5" />
                              {unread ? "Mark read" : "Mark unread"}
                            </button>
                            <button
                              onClick={() => feed.archive(item.id)}
                              className="ml-auto flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                            >
                              <Archive className="size-3.5" /> Dismiss
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Variant C: top bar over the page, toasts, grouped by kind ──────────────
// Badge counts UNSEEN. New arrivals pop a toast (click → go there). The
// dropdown groups items by Notification kind, collapsed to a count, so a busy
// Instructor sees "3 Discussion Questions" rather than 3 rows.

export function VariantC({ config }: { config: KnockFeedConfig }) {
  const navigate = useNavigate();
  const feed = useKnockFeed(config, (fresh) => {
    for (const item of fresh) {
      toast(item.data.title, {
        description: item.data.lesson ?? item.data.course,
        action: {
          label: "View",
          onClick: () => {
            feed.markRead(item.id);
            navigate(item.data.url);
          },
        },
      });
    }
  });
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);

  const groups = new Map<string, FeedItem[]>();
  for (const item of feed.items) {
    const key = KIND[item.data.kind].plural;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return (
    <div className="sticky top-0 z-30 flex h-14 items-center justify-end gap-3 border-b bg-background/95 px-6 backdrop-blur">
      <div ref={ref} className="relative">
        <button
          onClick={() => {
            setOpen(!open);
            if (!open) feed.markAllSeen();
          }}
          className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:bg-muted"
        >
          {feed.meta.unseen_count > 0 ? (
            <BellDot className="size-4 text-primary" />
          ) : (
            <Bell className="size-4" />
          )}
          {feed.meta.unseen_count > 0
            ? `${feed.meta.unseen_count} new`
            : "Notifications"}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-[26rem] rounded-xl border bg-popover p-2 shadow-xl">
            {feed.items.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Nothing yet.
              </div>
            )}
            {[...groups.entries()].map(([label, items]) => {
              const unread = items.filter((i) => !i.read_at).length;
              const isOpen = expanded === label;
              const first = items[0];
              const Icon = KIND[first.data.kind].icon;
              return (
                <div key={label} className="rounded-lg">
                  <button
                    onClick={() => setExpanded(isOpen ? null : label)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted"
                  >
                    <Icon className="size-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">
                        {items.length} {label}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        Latest: {first.data.title} · {ago(first.inserted_at)}
                      </div>
                    </div>
                    {unread > 0 && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {unread} unread
                      </span>
                    )}
                    {isOpen ? (
                      <ChevronDown className="size-4" />
                    ) : (
                      <ChevronRight className="size-4" />
                    )}
                  </button>
                  {isOpen && (
                    <ul className="mb-1 ml-9 border-l">
                      {items.map((item) => (
                        <li key={item.id}>
                          <button
                            onClick={() => {
                              feed.markRead(item.id);
                              setOpen(false);
                              navigate(item.data.url);
                            }}
                            className={cn(
                              "block w-full px-3 py-1.5 text-left text-sm hover:bg-muted",
                              item.read_at
                                ? "text-muted-foreground"
                                : "font-medium"
                            )}
                          >
                            {item.data.title}
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              {item.data.lesson ?? item.data.course} ·{" "}
                              {ago(item.inserted_at)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
            {feed.meta.unread_count > 0 && (
              <button
                onClick={feed.markAllRead}
                className="mt-1 w-full rounded-lg px-3 py-2 text-center text-xs text-muted-foreground hover:bg-muted"
              >
                Mark all {feed.meta.unread_count} as read
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
