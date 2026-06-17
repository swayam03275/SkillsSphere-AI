import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Input from '../Input';

describe('Input Component', () => {
  it('renders correctly with a label', () => {
    render(<Input id="test-input" label="Email Address" placeholder="Enter email" />);
    
    expect(screen.getByLabelText('Email Address')).toBeDefined();
    expect(screen.getByPlaceholderText('Enter email')).toBeDefined();
  });

  it('handles onChange events', () => {
    const handleChange = vi.fn();
    render(<Input id="test-input" onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'new value' } });
    
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('displays error message correctly', () => {
    render(<Input id="test-input" error="Invalid email format" />);
    
    expect(screen.getByText('Invalid email format')).toBeDefined();
    const input = screen.getByRole('textbox');
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('toggles password visibility when type is password', () => {
    const { container } = render(<Input id="password-input" type="password" placeholder="Pass" />);
    
    // Check initial state (should be type password)
    const input = screen.getByPlaceholderText('Pass');
    expect(input.getAttribute('type')).toBe('password');
    
    // Find the toggle button
    const toggleButton = screen.getByLabelText('Show password');
    fireEvent.click(toggleButton);
    
    // Should now be type text
    expect(input.getAttribute('type')).toBe('text');
    
    // Click again
    const hideButton = screen.getByLabelText('Hide password');
    fireEvent.click(hideButton);
    
    // Should be type password again
    expect(input.getAttribute('type')).toBe('password');
  });
});
