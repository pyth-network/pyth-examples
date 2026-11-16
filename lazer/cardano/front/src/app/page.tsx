"use client";

import dynamic from "next/dynamic";

const PipelineApp = dynamic(() => import("@/components/PipelineApp"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center text-muted">
      Loading pipeline…
    </div>
  ),
});

export default function Home() {
  return <PipelineApp />;
}
