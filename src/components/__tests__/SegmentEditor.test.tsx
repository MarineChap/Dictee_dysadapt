import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SegmentEditor from '../SegmentEditor';

function setup(segments = ['Le chat', 'dort.']) {
  const onChange = vi.fn();
  render(<SegmentEditor segments={segments} onChange={onChange} onPreview={() => undefined} />);
  return { onChange, user: userEvent.setup() };
}

describe('SegmentEditor', () => {
  it('shows a labelled "Réunir" button that glues two parts', async () => {
    const { onChange, user } = setup();
    const merge = screen.getByRole('button', { name: 'Réunir les parties 1 et 2' });
    // Visible text, not just an aria-label: it was invisible on touch screens.
    expect(merge).toHaveTextContent('Réunir');
    await user.click(merge);
    expect(onChange).toHaveBeenCalledWith(['Le chat dort.']);
  });

  it('lets the teacher retype a part to add a missing word', async () => {
    const { onChange, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Modifier la partie 1' }));
    const input = screen.getByRole('textbox', { name: 'Texte de la partie 1' });
    await user.clear(input);
    await user.type(input, 'Le gros chat{Enter}');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(['Le gros chat', 'dort.']);
  });

  it('drops a part that is emptied', async () => {
    const { onChange, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Modifier la partie 2' }));
    await user.clear(screen.getByRole('textbox', { name: 'Texte de la partie 2' }));
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith(['Le chat']);
  });

  it('discards the edit on Escape', async () => {
    const { onChange, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Modifier la partie 1' }));
    await user.type(screen.getByRole('textbox', { name: 'Texte de la partie 1' }), ' noir{Escape}');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
