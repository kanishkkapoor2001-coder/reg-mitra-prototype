"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { openClientTab } from "@/lib/client-tabs-store";

export function ClientTabActions({
  clientId,
  name,
  subtitle,
}: Readonly<{
  clientId: string;
  name: string;
  subtitle: string;
}>) {
  const router = useRouter();

  useEffect(() => {
    openClientTab({ id: clientId, name, subtitle });
  }, [clientId, name, subtitle]);

  function minimize() {
    openClientTab({ id: clientId, name, subtitle });
    router.push("/clients");
  }

  return (
    <button className="button client-minimize-button" onClick={minimize} type="button">
      <span aria-hidden="true">−</span>
      Minimize to side
    </button>
  );
}
