import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TagInput from './TagInput';

describe('TagInput', () => {
  it('adds a tag on Enter and notifies the parent', async () => {
    const onChange = vi.fn();
    render(<TagInput label="Skills" values={['react']} onChange={onChange} />);

    await userEvent.type(screen.getByPlaceholderText('Add a tag'), 'Node{Enter}');

    expect(onChange).toHaveBeenCalledWith(['react', 'Node']);
  });

  it('does not add a duplicate, ignoring case', async () => {
    const onChange = vi.fn();
    render(<TagInput values={['react']} onChange={onChange} />);

    await userEvent.type(screen.getByPlaceholderText('Add a tag'), 'React{Enter}');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes a tag when its button is pressed', async () => {
    const onChange = vi.fn();
    render(<TagInput values={['react', 'nlp']} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Remove react' }));
    expect(onChange).toHaveBeenCalledWith(['nlp']);
  });
});
