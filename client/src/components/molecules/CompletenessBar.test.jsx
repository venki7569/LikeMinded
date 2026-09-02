import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import CompletenessBar from './CompletenessBar';

describe('CompletenessBar', () => {
  it('shows the percentage and next missing fields', () => {
    render(
      <CompletenessBar
        completeness={{ percentage: 40, missing: ['bio', 'skills', 'occupation'] }}
      />
    );

    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40');
    expect(screen.getByText(/Write a bio/)).toBeInTheDocument();
  });

  it('hides the hint in compact mode', () => {
    render(
      <CompletenessBar compact completeness={{ percentage: 20, missing: ['bio'] }} />
    );
    expect(screen.queryByText(/Write a bio/)).not.toBeInTheDocument();
  });
});
