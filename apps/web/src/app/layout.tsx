import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Sans_Devanagari } from "next/font/google";
import { resolveServerTheme } from "@/lib/theme/resolveTheme";
import { THEME_PREFERENCE_COOKIE, THEME_RESOLVED_COOKIE } from "@/lib/theme/constants";
import "./globals.css";

export const metadata: Metadata = {
  title: "School ERP",
  description: "Multi-school SaaS ERP",
};

// next/font self-hosts at build time -- no separate font-CDN round trip on patchy 4G, and zero
// layout shift. Devanagari is a real subset load now (not deferred to P2) so the type scale
// never has to be redone when Hindi ships.
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexSansDevanagari = IBM_Plex_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans-devanagari",
  display: "swap",
});

/**
 * Runs synchronously, before the browser paints anything, so it never causes a visible flash --
 * it only has work to do on a visitor's very first-ever page load (no theme-resolved cookie
 * yet). Every subsequent request already has the right server-rendered class from
 * resolveServerTheme(), and this script becomes a no-op confirmation.
 */
const NO_FLASH_SCRIPT = `
(function() {
  try {
    var pref = document.cookie.match(/(?:^|; )${THEME_PREFERENCE_COOKIE}=([^;]*)/);
    var resolved = document.cookie.match(/(?:^|; )${THEME_RESOLVED_COOKIE}=([^;]*)/);
    var preference = pref ? decodeURIComponent(pref[1]) : "system";
    if (preference !== "system") return; // server already rendered the right class
    var systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var want = systemDark ? "dark" : "light";
    var had = resolved ? decodeURIComponent(resolved[1]) : null;
    if (had !== want) {
      document.documentElement.classList.toggle("dark", want === "dark");
      document.cookie = "${THEME_RESOLVED_COOKIE}=" + want + "; path=/; max-age=" + (60*60*24*400);
    }
  } catch (e) {}
})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const resolvedTheme = await resolveServerTheme();

  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexSansDevanagari.variable} ${resolvedTheme === "dark" ? "dark" : ""}`}
      suppressHydrationWarning
    >
      <head>
        {/* Blocking on purpose -- see NO_FLASH_SCRIPT comment. */}
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
