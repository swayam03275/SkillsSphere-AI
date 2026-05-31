import { useNavigate } from 'react-router-dom';

const variantClasses = {
  primary: 'bg-[var(--primary)] text-white shadow-[0_4px_14px_0_rgba(79,70,229,0.30)] hover:bg-[var(--primary-hover)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.22)] hover:-translate-y-0.5',
  secondary: 'bg-[var(--surface)] text-gray-900 dark:text-slate-100 backdrop-blur-sm border border-[var(--border)] shadow-[var(--shadow-soft)] hover:bg-[var(--surface-hover)] hover:-translate-y-0.5',
  outline: 'bg-transparent text-indigo-700 dark:text-indigo-300 border-2 border-indigo-600 dark:border-indigo-400 hover:bg-indigo-600/10',
  ghost: 'bg-transparent text-gray-900 dark:text-slate-100 hover:bg-[var(--surface-hover)]',
};

const sizeClasses = {
  sm: 'px-4 py-2 text-sm min-h-[40px]',
  md: 'px-6 py-3 text-base min-h-[44px]',
  lg: 'px-8 py-4 text-lg min-h-[48px]',
};

const Button = ({ children, variant = 'primary', size = 'md', to, onClick, className = '', ...props }) => {
  const navigate = useNavigate();

  const handleClick = (e) => {
    if (onClick) onClick(e);
    if (to) navigate(to);
  };

  return (
    <button
      className={`inline-flex items-center justify-center font-semibold rounded-lg border-none cursor-pointer transition-all duration-300 no-underline gap-2 active:scale-[0.98] ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
