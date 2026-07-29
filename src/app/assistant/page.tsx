import { AssistantExperience } from "@/components/assistant-experience";
import { cookies } from "next/headers";

interface AssistantPageProps {
  searchParams: Promise<{ prompt?: string | string[] }>;
}

export default async function AssistantPage({ searchParams }: AssistantPageProps) {
  const params = await searchParams;
  const sessionMode = (await cookies()).get("reg_mitra_session")?.value;
  const initialPrompt = Array.isArray(params.prompt) ? params.prompt[0] : params.prompt;
  return (
    <AssistantExperience
      initialPrompt={initialPrompt}
      templateMode={sessionMode !== "product"}
    />
  );
}
