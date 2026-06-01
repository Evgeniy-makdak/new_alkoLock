/** Параметр «Идентификатор» — в списке только id (value и label). */
export function isEntityIdAttribute(attribute: string): boolean {
  const attr = (attribute ?? '').trim();
  if (!attr) return false;
  if (attr === 'id') return true;
  const leaf = attr.includes('.') ? attr.slice(attr.lastIndexOf('.') + 1) : attr;
  return leaf.toLowerCase() === 'id';
}
