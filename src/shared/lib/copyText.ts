export async function copyContent(text: string | number, setState?: (state: boolean) => void) {
  try {
    await window.navigator.clipboard.writeText(`${text}`);
    setState && setState(true);
  } catch (err) {
    console.error('Failed to copy: ', err);
  }
}
