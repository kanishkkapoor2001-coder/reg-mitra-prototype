import type { Metadata } from "next";
import { PracticeExperience } from "@/components/practice-experience";

export const metadata: Metadata = {
  title: "Your practice",
  description:
    "Tell Reg Mitra which regulators, states and clients you work with so answers resolve to your practice. Stored in your browser only.",
};

export default function PracticePage() {
  return <PracticeExperience />;
}
