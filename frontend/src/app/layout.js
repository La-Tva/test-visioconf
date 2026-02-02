import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import GlobalRequestHandler from "./components/GlobalRequestHandler";
import GlobalComponents from "./components/GlobalComponents";
import { SocketProvider } from "./context/SocketContext";
import { PreloadProvider } from "./context/PreloadContext";
import { CallProvider } from "./context/CallContext";
import { TeamCallProvider } from "./context/TeamCallContext";
import { SoundProvider } from "./context/SoundContext";
import CallOverlay from "./components/CallOverlay";
import TeamCallOverlay from "./components/TeamCallOverlay";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "VisioConf",
  description: "VisioConf - Plateforme de visioconférence",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${bricolage.variable} ${jakarta.variable}`}>
        <SocketProvider>
            <PreloadProvider>
                <SoundProvider>
                    <CallProvider>
                        <TeamCallProvider>
                            <CallOverlay />
                            <TeamCallOverlay />
                            <GlobalRequestHandler />
                            <GlobalComponents />
                            {children}
                        </TeamCallProvider>
                    </CallProvider>
                </SoundProvider>
            </PreloadProvider>
        </SocketProvider>
      </body>
    </html>
  );
}
