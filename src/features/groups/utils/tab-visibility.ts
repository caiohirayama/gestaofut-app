/** `href: null` hides an Expo Router `<Tabs.Screen>` from the tab bar while keeping its route reachable — the standard pattern for conditional tabs. */
export function tabVisibility(visible: boolean): undefined | null {
  return visible ? undefined : null;
}
