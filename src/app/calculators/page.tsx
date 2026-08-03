import type { Metadata } from "next";
import { CalculatorsExperience } from "@/components/calculators-experience";

export const metadata: Metadata = {
  title: "Compliance calculators",
  description:
    "Interest under sections 234A, 234B, 234C and 201(1A), the section 234F fee, GST interest and late fee, and GST return due dates — computed exactly, with the working shown.",
};

export default function CalculatorsPage() {
  return <CalculatorsExperience />;
}
