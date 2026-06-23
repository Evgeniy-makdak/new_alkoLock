const path = require('path');
const rcedit = require('rcedit');

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;

  const exeName = `${context.packager.appInfo.productFilename}.exe`;
  const exePath = path.join(context.appOutDir, exeName);
  const iconPath = path.join(context.packager.projectDir, 'electron', 'app-icon.ico');

  await rcedit(exePath, { icon: iconPath });
  console.log(`[electron:afterPack] icon applied to ${exeName}`);
};
