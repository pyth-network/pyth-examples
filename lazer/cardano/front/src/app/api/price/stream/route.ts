export const dynamic = "force-dynamic";

import { initPythClient, onPriceUpdate } from "@/lib/pyth";

export async function GET() {
  await initPythClient();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const remove = onPriceUpdate((price) => {
        const data = JSON.stringify(price);
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      });

      const heartbeat = setInterval(() => {
        try { controller.enqueue(encoder.encode(": heartbeat\n\n")); } catch { /* closed */ }
      }, 15_000);

      const cleanup = () => {
        remove();
        clearInterval(heartbeat);
      };

      // ReadableStream cancel is called when the client disconnects
      (controller as any)._cleanup = cleanup;
    },
    cancel(controller: any) {
      controller._cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
