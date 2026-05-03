import type {Metadata} from 'next';
import { Outfit, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Vibe-Code Blueprint Generator',
  description: 'Transforms a raw software idea into a structured architectural plan and an AI prompt sequence.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${outfit.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans bg-[#0d0d0f] text-gray-100 antialiased selection:bg-violet-500/30 selection:text-violet-200" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
