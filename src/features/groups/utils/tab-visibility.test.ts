import { hasPermission } from './permissions';
import { tabVisibility } from './tab-visibility';

/**
 * Mirrors the exact composition used in app/(app)/_layout.tsx: Jogos gated
 * by match.read, Jogadores by member.manage, Financeiro by finance.read,
 * Início/Mais always visible. Verifies the three example configurations
 * from the spec, plus a role combination not explicitly listed (TREASURER)
 * to prove the gates compose independently rather than being hardcoded
 * per-role.
 */
function visibleTabs(role: Parameters<typeof hasPermission>[0]) {
  const tabs = ['Início'];
  if (hasPermission(role, 'match.read')) tabs.push('Jogos');
  if (hasPermission(role, 'member.manage')) tabs.push('Jogadores');
  if (hasPermission(role, 'finance.read')) tabs.push('Financeiro');
  tabs.push('Mais');
  return tabs;
}

describe('dynamic tabs by permission', () => {
  it('tabVisibility maps a boolean to Expo Router\'s href convention (undefined = shown, null = hidden)', () => {
    expect(tabVisibility(true)).toBeUndefined();
    expect(tabVisibility(false)).toBeNull();
  });

  it('MEMBER (jogador comum): Início, Jogos, Mais', () => {
    expect(visibleTabs('MEMBER')).toEqual(['Início', 'Jogos', 'Mais']);
  });

  it('ORGANIZER (organizador): Início, Jogos, Jogadores, Mais', () => {
    expect(visibleTabs('ORGANIZER')).toEqual(['Início', 'Jogos', 'Jogadores', 'Mais']);
  });

  it('OWNER/ADMIN (financeiro autorizado): Início, Jogos, Jogadores, Financeiro, Mais', () => {
    expect(visibleTabs('OWNER')).toEqual(['Início', 'Jogos', 'Jogadores', 'Financeiro', 'Mais']);
    expect(visibleTabs('ADMIN')).toEqual(['Início', 'Jogos', 'Jogadores', 'Financeiro', 'Mais']);
  });

  it('TREASURER (not one of the spec examples): finance but not member management', () => {
    expect(visibleTabs('TREASURER')).toEqual(['Início', 'Jogos', 'Financeiro', 'Mais']);
  });

  it('no role yet (group not resolved): only the always-visible tabs', () => {
    expect(visibleTabs(undefined)).toEqual(['Início', 'Mais']);
  });
});
