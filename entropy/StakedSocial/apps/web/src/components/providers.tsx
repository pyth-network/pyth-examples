"use client";

import { MiniAppProvider } from "@/contexts/miniapp-context";
import FrameWalletProvider from "@/contexts/frame-wallet-context";
import { SocketProvider } from "@/contexts/socket-context";
import BottomNav from "./bottom-nav";
import dynamic from "next/dynamic";

const ErudaProvider = dynamic(
  () => import("../components/Eruda").then((c) => c.ErudaProvider),
  { ssr: false }
);

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErudaProvider>
      <FrameWalletProvider>
        <SocketProvider>
          <MiniAppProvider addMiniAppOnLoad={true}>
            {children}
            <BottomNav />
          </MiniAppProvider>
        </SocketProvider>
      </FrameWalletProvider>
    </ErudaProvider>
  );
}
