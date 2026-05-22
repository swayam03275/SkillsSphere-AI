import React from 'react';

const Card = ({ children, className = '', hoverEffect = false, ...rest }) => {
  return (
    <div
      {...rest}
      className={`
        group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))] p-8 shadow-[var(--shadow-soft)]
        ${hoverEffect ? 'transition-colors duration-300 hover:border-[color-mix(in_srgb,var(--primary)_60%,var(--border))]' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default Card;
