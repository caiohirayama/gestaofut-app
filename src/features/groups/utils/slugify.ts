/**
 * Turns a name into an organization slug candidate matching the API's
 * contract (`^[a-z0-9]+(-[a-z0-9]+)*$`, 2-60 chars): lowercase,
 * accent-stripped, non-alphanumeric runs collapsed to a single hyphen.
 * Appends a short random suffix so two orgs named similarly don't collide
 * on the global slug-uniqueness constraint.
 */
export function slugify(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || 'org'}-${suffix}`;
}
