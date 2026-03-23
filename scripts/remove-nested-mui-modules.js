/**
 * Удаляет вложенный node_modules у @mui/material (часто битый @mui/system после npm).
 * Запускается из postinstall.
 */
const fs = require('fs');
const path = require('path');

const nested = path.join(__dirname, '..', 'node_modules', '@mui', 'material', 'node_modules');

try {
  if (fs.existsSync(nested)) {
    fs.rmSync(nested, { recursive: true, force: true });
    // eslint-disable-next-line no-console
    console.log('[postinstall] removed', nested);
  }
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('[postinstall] could not remove nested @mui/material/node_modules:', e.message);
}
