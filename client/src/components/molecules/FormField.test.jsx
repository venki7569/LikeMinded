import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FormField from './FormField';

describe('FormField', () => {
  it('associates the label with the input', () => {
    render(<FormField label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('exposes the error message through aria-describedby', () => {
    render(<FormField label="Email" error="Enter a valid email address" />);

    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(input.getAttribute('aria-describedby')).toContain('-error');
  });

  it('shows the hint only while there is no error', () => {
    const { rerender } = render(<FormField label="Password" hint="Minimum 8 characters" />);
    expect(screen.getByText('Minimum 8 characters')).toBeInTheDocument();

    rerender(<FormField label="Password" hint="Minimum 8 characters" error="Too short" />);
    expect(screen.queryByText('Minimum 8 characters')).not.toBeInTheDocument();
    expect(screen.getByText('Too short')).toBeInTheDocument();
  });

  it('toggles password visibility', async () => {
    render(<FormField label="Password" type="password" />);

    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');

    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');

    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('has no reveal button for non-password fields', () => {
    render(<FormField label="Username" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
