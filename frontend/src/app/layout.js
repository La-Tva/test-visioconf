import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import GlobalRequestHandler from "./components/GlobalRequestHandler";
import GlobalComponents from "./components/GlobalComponents";
import { SocketProvider } from "./context/SocketContext";
import { PreloadProvider } from "./context/PreloadContext";

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
                <GlobalRequestHandler />
                <GlobalComponents />
                {children}
            </PreloadProvider>
        </SocketProvider>
      </body>
    </html>
  );
}
