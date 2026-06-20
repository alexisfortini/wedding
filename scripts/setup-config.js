const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'config.default');
const destDir = path.join(__dirname, '..', 'config');

if (!fs.existsSync(destDir)) {
  console.log('config/ directory not found. Creating from config.default/ template...');
  fs.mkdirSync(destDir, { recursive: true });
}

// Copy any files from config.default to config if they are missing
copyMissingFilesSync(srcDir, destDir);

function copyMissingFilesSync(from, to) {
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to);
  }
  fs.readdirSync(from).forEach(element => {
    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);
    const stat = fs.lstatSync(fromPath);
    if (stat.isFile()) {
      if (!fs.existsSync(toPath)) {
        fs.copyFileSync(fromPath, toPath);
        console.log(`Copied config template file: ${element}`);
      }
    } else if (stat.isDirectory()) {
      copyMissingFilesSync(fromPath, toPath);
    }
  });
}
