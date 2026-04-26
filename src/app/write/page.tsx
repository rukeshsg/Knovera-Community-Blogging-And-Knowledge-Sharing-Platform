import { Suspense } from "react";
import WriteClient from "./WriteClient";
import { Loader2 } from "lucide-react";

export default function WritePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-[var(--color-primary)]" /></div>}>
      <WriteClient />
    </Suspense>
  );
}
