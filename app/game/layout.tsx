import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "VOID Arena - Play Now",
  description: "Agar.io-style arena game. Eat, grow, and dominate!",
};

export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
