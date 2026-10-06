import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from '../Navbar';
import { resetAccountForTests } from '@/hooks/useAccount';

function session(user: { id: string } | null) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(user ? { user } : {}), { status: 200 }))
  );
}

function renderNavbar() {
  return render(
    <MemoryRouter>
      <Navbar backTo="/" backLabel="Mes dictées" />
    </MemoryRouter>
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  resetAccountForTests();
  localStorage.clear();
});

describe('the back arrow', () => {
  it('leads a visitor back to the library', async () => {
    session(null);
    renderNavbar();

    expect(await screen.findByTestId('account-signin')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mes dictées' })).toHaveAttribute('href', '/');
    expect(screen.queryByTestId('back-to-space')).toBeNull();
  });

  it('leads a signed-in teacher back to their DysAdapt space, the only way there', async () => {
    session({ id: 'u-1' });
    renderNavbar();

    const back = await screen.findByTestId('back-to-space');
    expect(back).toHaveAttribute('href', '/dashboard');
    expect(back).toHaveTextContent('Mon espace');
    expect(screen.queryByRole('link', { name: 'Mes dictées' })).toBeNull();
    expect(screen.queryByTestId('account-dashboard')).toBeNull();
  });
});
