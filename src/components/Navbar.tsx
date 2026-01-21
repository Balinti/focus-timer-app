'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import GoogleAuth from './GoogleAuth';
import { cn } from '@/lib/utils';

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: '/app', label: 'Focus' },
    { href: '/history', label: 'History' },
    { href: '/report', label: 'Report' },
    { href: '/pricing', label: 'Pricing' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"
          >
            <svg
              className="w-7 h-7 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span>FocusShield</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                  pathname === link.href
                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <GoogleAuth />
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex items-center justify-center gap-1 px-4 pb-2">
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
              pathname === link.href
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            )}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
