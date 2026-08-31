import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://space-shooter.md-zeon.dev"),
  title: "Space Shooter - Neon Retro Arcade",
  description:
    "A classic arcade space shooter game with neon retro aesthetics. Fight waves of enemies, defeat epic bosses, and collect power-ups. Play free in your browser on mobile and desktop.",
  keywords: [
    "space shooter",
    "shmup",
    "shoot em up",
    "arcade game",
    "browser game",
    "neon retro",
    "space game",
    "free game",
    "mobile game",
    "PWA game",
  ],
  authors: [{ name: "md-zeon" }],
  creator: "md-zeon",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Space Shooter",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://space-shooter.md-zeon.dev",
    siteName: "Space Shooter",
    title: "Space Shooter - Neon Retro Arcade",
    description:
      "A classic arcade space shooter game with neon retro aesthetics. Fight waves of enemies, defeat epic bosses, and collect power-ups.",
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "Space Shooter - Neon Retro Arcade",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Space Shooter - Neon Retro Arcade",
    description:
      "A classic arcade space shooter game with neon retro aesthetics. Fight waves of enemies, defeat epic bosses, and collect power-ups.",
    images: ["/icons/icon-512.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#050A1A",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icons/favicon.png" type="image/png" />
        <link
          rel="apple-touch-icon"
          href="/icons/apple-touch-icon.png"
          sizes="180x180"
        />
        <meta name="msapplication-TileColor" content="#050A1A" />
        <meta name="msapplication-TileImage" content="/icons/icon-192.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
