export function findOverflowTarget(root: HTMLElement): HTMLElement {
  return (
    root.querySelector<HTMLElement>('.MuiInputBase-input') ??
    root.querySelector<HTMLElement>('.MuiChip-label') ??
    root.querySelector<HTMLElement>('.MuiListItemText-primary') ??
    root.querySelector<HTMLElement>('.MuiAutocomplete-input') ??
    root
  );
}

export function isElementOverflowing(el: HTMLElement): boolean {
  return el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
}
