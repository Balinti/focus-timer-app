import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FocusShield - Protect Deep Work, Prove What it Shipped',
  description: 'FocusShield is a calendar- and Slack-aware focus protection app that helps remote engineers schedule and defend deep-work blocks, run task-bound focus sessions, and capture ship notes with weekly ROI reporting.',
  keywords: 'focus, deep work, productivity, pomodoro, time tracking, remote work',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <Navbar />
          <main className="pt-20 md:pt-16 min-h-screen">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
