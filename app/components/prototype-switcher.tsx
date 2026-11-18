// PROTOTYPE, throwaway. Floating bar to flip between UI prototype variants via
// `?variant=`. Hidden in production builds. The choice is also remembered in
// localStorage, so clicking a Notification (which navigates away and drops the
// search param) keeps the same variant.
import { useEffect, useState } from "react";
import { useSearchParams, useFetcher } from "react-router";
import { ChevronLeft, ChevronRight, Send } from "lucide-react";

const STORAGE_KEY = "prototype-variant";

export function usePrototypeVariant(keys: string[]) {
  const [params] = useSearchParams();
  const fromUrl = params.get("variant");
  // Read storage after hydration so server and client render the same thing.
  const [stored, setStored] = useState<string | null>(null);
  useEffect(() => {
    try {
      if (fromUrl) localStorage.setItem(STORAGE_KEY, fromUrl);
      setStored(localStorage.getItem(STORAGE_KEY));
    } catch {}
  }, [fromUrl]);
  const v = fromUrl ?? stored ?? keys[0];
  return keys.includes(v) ? v : keys[0];
}

export function PrototypeSwitcher({
  variants,
  current,
}: {
  variants: { key: string; name: string }[];
  current: string;
}) {
  const [params, setParams] = useSearchParams();
  const notify = useFetcher();
  const i = variants.findIndex((v) => v.key === current);

  function go(delta: number) {
    const next = variants[(i + delta + variants.length) % variants.length];
    try {
      localStorage.setItem(STORAGE_KEY, next.key);
    } catch {}
    const p = new URLSearchParams(params);
    p.set("variant", next.key);
    setParams(p, { replace: true, preventScrollReset: true });
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, [contenteditable=true], .monaco-editor"))
        return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  if (import.meta.env.PROD) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-1 rounded-full bg-zinc-900 px-2 py-1.5 text-sm text-white shadow-2xl ring-2 ring-fuchsia-500">
      <button
        onClick={() => go(-1)}
        className="rounded-full p-1 hover:bg-white/15"
      >
        <ChevronLeft className="size-4" />
      </button>
      <span className="min-w-48 text-center font-mono">
        {variants[i].key} ({variants[i].name})
      </span>
      <button onClick={() => go(1)} className="rounded-full p-1 hover:bg-white/15">
        <ChevronRight className="size-4" />
      </button>
      <notify.Form method="post" action="/api/prototype-notify">
        <button
          title="Send me a random Notification via Knock"
          className="ml-1 flex items-center gap-1 rounded-full bg-fuchsia-600 px-2.5 py-1 text-xs hover:bg-fuchsia-500"
        >
          <Send className="size-3" />
          {notify.state === "idle" ? "Send one" : "Sending…"}
        </button>
      </notify.Form>
    </div>
  );
}
