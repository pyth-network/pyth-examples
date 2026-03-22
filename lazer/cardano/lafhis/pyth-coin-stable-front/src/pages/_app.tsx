import "@/styles/globals.css";
import "@meshsdk/react/styles.css";
import type { AppProps } from "next/app";
import Navbar from "@/components/Navbar";
import { MeshProvider } from "@meshsdk/react";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <MeshProvider>
      <Navbar />
      <Component {...pageProps} />
    </MeshProvider>
  );
}
