"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUpIcon } from "@/components/icons";

// The home page's one input: type a question, land in the assistant with it.
// The assistant page owns the conversation; this is just the front door.

export function HomeComposer() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function submit() {
    const prompt = value.trim();
    if (!prompt) return;
    router.push(`/assistant?prompt=${encodeURIComponent(prompt)}`);
  }

  return (
    <form
      className="home-composer"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <input
        aria-label="Ask the assistant"
        onChange={(event) => setValue(event.target.value)}
        placeholder="Ask anything — a circular, a due date, a client…"
        value={value}
      />
      <button aria-label="Ask" className="home-composer-send" disabled={!value.trim()} type="submit">
        <ArrowUpIcon />
      </button>
    </form>
  );
}
