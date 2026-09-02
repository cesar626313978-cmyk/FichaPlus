import React from 'react';

interface UserAvatarProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'custom';
  className?: string;
  rounded?: 'full' | 'xl' | '2xl' | '3xl';
  showBorder?: boolean;
  borderColor?: string;
}

const PALETTE = [
  'bg-indigo-600 text-white',
  'bg-violet-600 text-white',
  'bg-emerald-600 text-white',
  'bg-sky-600 text-white',
  'bg-rose-600 text-white',
  'bg-amber-600 text-white',
  'bg-teal-600 text-white',
  'bg-fuchsia-600 text-white',
  'bg-blue-600 text-white',
  'bg-slate-700 text-white',
];

export function getNameInitials(name: string): { first: string; surname: string } {
  if (!name || !name.trim()) return { first: '?', surname: '' };

  const clean = name.trim();
  const words = clean.split(/\s+/).filter((w) => w.length > 0);

  if (words.length === 0) return { first: '?', surname: '' };

  const first = words[0][0]?.toUpperCase() || '';

  if (words.length === 1) {
    return { first, surname: '' };
  }

  // Filter out prepositions like 'de', 'del', 'la', 'los', 'san', 'y'
  const prepositions = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'san', 'santa', 'y', 'da', 'di']);

  let surnameWord = '';
  for (let i = 1; i < words.length; i++) {
    const w = words[i].toLowerCase();
    if (!prepositions.has(w)) {
      surnameWord = words[i];
      break;
    }
  }

  if (!surnameWord && words.length > 1) {
    surnameWord = words[1];
  }

  const surname = surnameWord ? surnameWord[0]?.toUpperCase() : '';
  return { first, surname };
}

function getDeterministicColor(str: string): string {
  if (!str) return PALETTE[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
}

const SIZE_CONFIGS = {
  xs: {
    container: 'w-6 h-6 text-xs',
    firstClass: 'text-xs font-black',
    surnameClass: 'text-[9px] font-bold',
  },
  sm: {
    container: 'w-8 h-8 text-sm',
    firstClass: 'text-sm font-black',
    surnameClass: 'text-[10px] font-bold',
  },
  md: {
    container: 'w-10 h-10 text-base',
    firstClass: 'text-base font-black',
    surnameClass: 'text-[11px] font-bold',
  },
  lg: {
    container: 'w-12 h-12 text-lg',
    firstClass: 'text-lg font-black',
    surnameClass: 'text-xs font-bold',
  },
  xl: {
    container: 'w-14 h-14 text-xl',
    firstClass: 'text-xl font-black',
    surnameClass: 'text-xs font-bold',
  },
  '2xl': {
    container: 'w-24 h-24 text-3xl',
    firstClass: 'text-3xl font-black',
    surnameClass: 'text-base font-bold',
  },
  custom: {
    container: '',
    firstClass: 'font-black',
    surnameClass: 'font-bold text-[0.62em]',
  },
};

const ROUNDED_MAP = {
  full: 'rounded-full',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  '3xl': 'rounded-3xl',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  size = 'md',
  className = '',
  rounded = '2xl',
  showBorder = false,
  borderColor = 'border-white/20',
}) => {
  const { first, surname } = getNameInitials(name);
  const colorClass = getDeterministicColor(name || 'User');
  const sizeConfig = SIZE_CONFIGS[size] || SIZE_CONFIGS.md;
  const roundedClass = ROUNDED_MAP[rounded] || 'rounded-2xl';

  return (
    <div
      className={`inline-flex items-center justify-center select-none shrink-0 shadow-2xs font-sans transition-transform ${
        sizeConfig.container
      } ${colorClass} ${roundedClass} ${
        showBorder ? `border-2 ${borderColor}` : ''
      } ${className}`}
      title={name}
      aria-label={`Avatar de ${name}`}
    >
      <div className="flex items-baseline justify-center tracking-tight leading-none">
        <span className={`${sizeConfig.firstClass} leading-none tracking-normal drop-shadow-xs`}>
          {first}
        </span>
        {surname && (
          <span
            className={`${sizeConfig.surnameClass} leading-none ml-0.5 opacity-90 font-bold uppercase tracking-normal`}
          >
            {surname}
          </span>
        )}
      </div>
    </div>
  );
};
