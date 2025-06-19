import Link from "next/link";
import { Coins } from "lucide-react"; // Using Coins as a placeholder for a financial app logo icon

export default function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 px-4 py-3 text-primary hover:opacity-80 transition-opacity">
      <Coins className={`h-8 w-8 ${collapsed ? "mx-auto" : ""}`} />
      {!collapsed && <span className="font-headline text-2xl font-bold">GhanaSME</span>}
    </Link>
  );
}
