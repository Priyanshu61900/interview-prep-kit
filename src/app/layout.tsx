import type { Metadata } from "next";
import { Geist_Mono, Unbounded } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

// Display voice. Only headings use it, so the wide geometry never has to
// carry dense builder screens.
const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["600", "700"],
});

// Switzer is not on Google Fonts, so it is self-hosted rather than CDN-linked.
const switzer = localFont({
  variable: "--font-switzer",
  display: "swap",
  src: [
    { path: "../fonts/Switzer-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Switzer-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/Switzer-600.woff2", weight: "600", style: "normal" },
    { path: "../fonts/Switzer-700.woff2", weight: "700", style: "normal" },
  ],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Interview Prep Kit",
  description: "Turn a job description into a personalised interview preparation kit.",
};

// Each line repeats its phrase so the -50% translate loops with no seam.
const WORD_ROWS = [
  { cls: "wr1", text: "SYSTEM DESIGN · TRADE-OFFS · " },
  { cls: "wr2 word-row-accent", text: "BEHAVIOURAL · OWNERSHIP · " },
  { cls: "wr3", text: "LATENCY · SCALE · " },
  { cls: "wr4 word-row-accent", text: "MENTORING · TYPESCRIPT · " },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${switzer.variable} ${unbounded.variable} ${geistMono.variable} h-full overflow-x-hidden antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
        {/* Decorative only: hidden from assistive tech, pauses while typing. */}
        <div className="word-field" aria-hidden="true">
          {WORD_ROWS.map((row) => (
            <div key={row.cls} className={`word-row ${row.cls}`}>
              {row.text.repeat(4)}
            </div>
          ))}
        </div>
        <div className="relative z-10 flex min-h-full flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
