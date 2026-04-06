import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  crumbs: Crumb[];
}

export function Breadcrumbs({ crumbs }: BreadcrumbsProps) {
  // Always start with Home
  const allCrumbs: Crumb[] = [
    { label: 'Home', href: '/' },
    ...crumbs
  ];

  return (
    <nav className="flex items-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6 overflow-x-auto no-scrollbar py-1">
      {allCrumbs.map((crumb, index) => {
        const isLast = index === allCrumbs.length - 1;
        
        return (
          <React.Fragment key={index}>
            {index > 0 && <ChevronRight className="w-3 h-3 text-zinc-700 shrink-0" />}
            
            {isLast || !crumb.href ? (
              <span className={isLast ? "text-emerald-400 truncate" : "truncate"}>
                {crumb.label}
              </span>
            ) : (
              <Link 
                to={crumb.href} 
                className="hover:text-white transition-colors flex items-center gap-1 shrink-0"
              >
                {index === 0 && <Home className="w-3 h-3" />}
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
