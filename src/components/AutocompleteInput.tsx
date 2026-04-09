import React, { useState, useRef, useEffect } from 'react';

interface AutocompleteInputProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  type?: 'league' | 'team';
}

import { LeagueLogo, TeamWithLogo } from './TeamLogo';

export function AutocompleteInput({ value, onChange, options, placeholder, required, type }: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filtered, setFiltered] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const lower = value.toLowerCase();
      // Only show options that match, and aren't exact matches already
      const matches = options.filter(o => o.toLowerCase().includes(lower) && o.toLowerCase() !== lower);
      setFiltered(matches);
    } else {
      setFiltered(options);
    }
    setActiveIndex(0);
  }, [value, options]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && filtered.length > 0 && e.key !== 'Escape' && e.key !== 'Tab') {
      setIsOpen(true);
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < filtered.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      if (isOpen && filtered.length > 0) {
        e.preventDefault();
        onChange(filtered[activeIndex]);
        setIsOpen(false);
      }
    } else if (e.key === 'Tab') {
      if (isOpen && filtered.length > 0) {
        e.preventDefault();
        onChange(filtered[activeIndex]);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="admin-input w-full"
        required={required}
        autoComplete="off"
      />
      
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl max-h-48 overflow-y-auto">
          {filtered.map((option, idx) => (
            <div
              key={option}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent input onBlur from firing before click registers
                onChange(option);
                setIsOpen(false);
              }}
              onMouseEnter={() => setActiveIndex(idx)}
              className={`px-3 py-2 cursor-pointer text-sm transition-colors ${
                idx === activeIndex ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-300 hover:bg-zinc-900'
              }`}
            >
              {type === 'league' ? (
                <div className="flex items-center gap-2">
                  <LeagueLogo leagueName={option} size={20} />
                  <span>{option}</span>
                </div>
              ) : type === 'team' ? (
                <TeamWithLogo teamName={option} size={20} textClassName="text-sm" />
              ) : (
                option
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
