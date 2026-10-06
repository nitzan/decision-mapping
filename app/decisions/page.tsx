import type { Metadata } from "next";
import SeatsAtTheTableDecisionMapper from "@/components/SeatsAtTheTableDecisionMapper";

export const metadata: Metadata = {
  title: "Seats at the Table — Critical Business School Tools",
  description: "Map the aspects of a decision, set the balance you want to live within, and see where your options land. A decision journey mapping method by Nitzan Hermon.",
};

export default function Page() {
  return <SeatsAtTheTableDecisionMapper />;
}
