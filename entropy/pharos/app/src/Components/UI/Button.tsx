// src/components/ui/Button.tsx
"use client"
import React from 'react';

// Define the custom color hex values
const PHAROS_ORANGE = '#f97028';
const PHAROS_YELLOW = '#f3a20f';
const DEFAULT_YELLOW = '#facc15'; // Tailwind's yellow-400

// Extend the ButtonProps interface
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  shape?: 'simple' | 'medium-rounded' | 'full-rounded';
  color?: 'default-yellow' | 'pharos-orange' | 'pharos-yellow';
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  shape = 'simple',
  color = 'default-yellow',
  className,
  ...props
}) => {
  const baseStyles = 'font-bold uppercase tracking-wide transition-all duration-200 ease-in-out';

  // --- Determine actual hex codes based on color prop ---
  let currentHoverBgColor: string;
  let currentAccentColor: string; // This will be the main color for this button

  if (color === 'pharos-orange') {
    currentAccentColor = PHAROS_ORANGE;
    currentHoverBgColor = '#e66524'; // Slightly darker orange for hover
  } else if (color === 'pharos-yellow') {
    currentAccentColor = PHAROS_YELLOW;
    currentHoverBgColor = '#de930d'; // Slightly darker yellow for hover
  } else { // default-yellow
    currentAccentColor = DEFAULT_YELLOW;
    currentHoverBgColor = '#e5b90e'; // Slightly darker default yellow for hover
  }

  // --- Styles that remain as Tailwind classes ---
  const textColorClass = 'text-white'; // All buttons now have white text
  const borderColorClass = 'border-black'; // All buttons now have black border

  // --- Shape Styles ---
  let shapeClass: string;
  if (shape === 'full-rounded') {
    shapeClass = 'rounded-full';
  } else if (shape === 'medium-rounded') {
    shapeClass = 'rounded-lg';
  } else { // simple
    shapeClass = 'rounded-none';
  }

  // --- Brutalist Shadow & Hover Transform ---
  const shadowClass = 'shadow-[4px_4px_0px_#000]';
  const hoverShadowClass = 'hover:shadow-[3px_3px_0px_#000]';
  const hoverTransformClass = 'hover:translate-x-[3px] hover:translate-y-[3px]';

  // --- Inline Styles for dynamic colors ---
  const buttonStyle: React.CSSProperties = {
    backgroundColor: currentAccentColor,
    // Note: We cannot easily make the HOVER background dynamic with inline styles without JS event listeners
    // For hover, we will rely on Tailwind's hover classes, but if those don't work reliably with arbitrary values,
    // you might need to use a single fixed hover color or consider CSS variables + inline style.
    // For now, let's keep the Tailwind hover classes, but be aware of potential inconsistencies.
  };

  return (
    <button
      style={buttonStyle} // Apply inline background color
      className={`${baseStyles} ${textColorClass} ${borderColorClass} border-4 px-6 py-2.5
                  ${shapeClass} ${shadowClass} ${hoverShadowClass} ${hoverTransformClass}
                  bg-[${currentAccentColor}] hover:bg-[${currentHoverBgColor}] hover:text-white ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;