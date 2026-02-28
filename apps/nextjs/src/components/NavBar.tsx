'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart2, Newspaper, Briefcase, Info } from 'lucide-react';

const NAV_BG = '#080C10';
const BORDER = '#1C2128';
const BLUE   = '#00B0FF';
const MUTED  = '#4A5568';

const links = [
  { href: '/',          label: 'Dashboard',       Icon: BarChart2  },
  { href: '/social',   label: 'Social',          Icon: Newspaper  },
  { href: '/portfolio', label: 'Portfolio Engine', Icon: Briefcase  },
  { href: '/about',     label: 'About',           Icon: Info       },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center px-4"
      style={{
        backgroundColor: NAV_BG,
        borderBottom: `1px solid ${BORDER}`,
        height: '60px',
        boxShadow: '0 2px 16px rgba(0,0,0,0.5)',
      }}
    >
      {/* Brand */}
      <Link href="/" className="flex items-center gap-3 mr-8 flex-shrink-0" style={{ textDecoration: 'none' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="ALETHEIA"
          width={32}
          height={32}
          style={{ borderRadius: 6 }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <span style={{ fontSize: 18, fontWeight: 900, color: '#FFFFFF', letterSpacing: 2 }}>
          ALETHEIA
        </span>
      </Link>

      {/* Nav links */}
      <nav className="flex items-center gap-1 flex-1">
        {links.map(({ href, label, Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
              style={{
                color: active ? BLUE : MUTED,
                backgroundColor: active ? BLUE + '15' : 'transparent',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                letterSpacing: 0.3,
              }}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Tag */}
      <span style={{ fontSize: 10, color: MUTED, letterSpacing: 1, flexShrink: 0 }} className="hidden md:inline">
        POCKET-SIZED HEDGE FUND
      </span>
    </header>
  );
}
