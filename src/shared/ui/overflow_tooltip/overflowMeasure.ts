export function findOverflowTarget(root: HTMLElement): HTMLElement {
  const shrunkLabel = root.querySelector<HTMLElement>('.MuiInputLabel-root.MuiInputLabel-shrink');
  const inlineLabel = root.querySelector<HTMLElement>(
    '.MuiInputLabel-root:not(.MuiInputLabel-shrink)',
  );

  if (inlineLabel?.textContent?.trim()) {
    return inlineLabel;
  }

  return (
    root.querySelector<HTMLElement>('.MuiInputBase-input') ??
    root.querySelector<HTMLElement>('.MuiChip-label') ??
    root.querySelector<HTMLElement>('.MuiListItemText-primary') ??
    root.querySelector<HTMLElement>('.MuiAutocomplete-input') ??
    shrunkLabel ??
    root
  );
}

export function isElementOverflowing(el: HTMLElement): boolean {
  return el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
}
