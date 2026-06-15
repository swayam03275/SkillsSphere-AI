import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Button from '../Button';

describe('Button Component', () => {
  it('renders children correctly', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeDefined();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    
    fireEvent.click(screen.getByText('Click Me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables the button when disabled prop is true', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Click Me</Button>);
    
    const button = screen.getByRole('button');
    expect(button.disabled).toBe(true);
    
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('shows loading spinner and disables button when loading is true', () => {
    const handleClick = vi.fn();
    render(<Button loading onClick={handleClick}>Submit</Button>);
    
    const button = screen.getByRole('button');
    expect(button.disabled).toBe(true);
    
    // The text should be visually hidden via 'sr-only' class
    const textSpan = screen.getByText('Submit');
    expect(textSpan.className).toContain('sr-only');
  });

  it('renders as a Link when "to" prop is provided', () => {
    render(
      <MemoryRouter>
        <Button to="/dashboard">Go to Dashboard</Button>
      </MemoryRouter>
    );
    
    const link = screen.getByRole('link', { name: /Go to Dashboard/i });
    expect(link.getAttribute('href')).toBe('/dashboard');
  });
});
