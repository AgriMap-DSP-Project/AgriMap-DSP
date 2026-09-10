import React from 'react'

/**
 * V2V Tech Official Logo Component
 * Uses the official 3D glossy purple bulb (/images/v2v-icon.png)
 * and high-contrast, crystal-clear "V2V Tech — Vision To Value" typography.
 */
export default function V2VLogo({ size = 'md', variant = 'full', className = '' }) {
  const isLight = variant === 'light'
  
  const sizeMap = {
    sm: { img: 'h-8 w-8', text: 'text-base', sub: 'text-[9px]' },
    md: { img: 'h-10 w-10', text: 'text-xl', sub: 'text-[10px]' },
    lg: { img: 'h-14 w-14', text: 'text-2xl', sub: 'text-xs' },
    xl: { img: 'h-20 w-20', text: 'text-3xl', sub: 'text-sm' },
  }
  
  const s = sizeMap[size] || sizeMap.md

  return (
    <div className={`inline-flex items-center gap-3 select-none group cursor-pointer ${className}`}>
      {/* 3D Glossy Purple Bulb Icon */}
      <div className="relative flex-shrink-0">
        <img
          src="/images/v2v-icon.png"
          alt="V2V Tech Logo"
          className={`${s.img} object-contain filter drop-shadow-md group-hover:scale-110 group-hover:rotate-1 transition-all duration-300`}
        />
        {/* Subtle glow aura behind bulb */}
        <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>
      
      {variant !== 'iconOnly' && (
        <div className="flex flex-col justify-center">
          <div className={`font-black tracking-tight leading-none flex items-center gap-1.5 ${s.text}`}>
            <span className={isLight ? 'text-white drop-shadow-sm' : 'text-v2v-deep'}>
              V2V
            </span>
            <span className={isLight ? 'text-purple-300 font-extrabold' : 'text-purple-700 font-extrabold'}>
              Tech
            </span>
          </div>
          <div className={`font-bold tracking-widest uppercase font-mono mt-0.5 ${s.sub} ${
            isLight ? 'text-purple-200/90' : 'text-purple-900/70'
          }`}>
            Vision To Value
          </div>
        </div>
      )}
    </div>
  )
}

