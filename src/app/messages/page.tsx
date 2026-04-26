import { Suspense } from "react";
import MessagesClient from "./MessagesClient";
import { Loader2 } from "lucide-react";

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
        </div>
      }
    >
      <MessagesClient />
    </Suspense>
  );
}
