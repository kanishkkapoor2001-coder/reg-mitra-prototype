import { AssistantExperience } from "@/components/assistant-experience";

interface AssistantPageProps {
  searchParams: Promise<{ prompt?: string | string[] }>;
}

export default async function AssistantPage({ searchParams }: AssistantPageProps) {
  const params = await searchParams;
  const initialPrompt = Array.isArray(params.prompt) ? params.prompt[0] : params.prompt;
  return <AssistantExperience initialPrompt={initialPrompt} />;
}
