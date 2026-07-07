const fs = require('fs');
const path = require('path');

const directoriesToScan = [
  path.join(__dirname, 'src', 'pages'),
  path.join(__dirname, 'src', 'components')
];

const replacements = {
  'bg-fresh-900\\/40': 'bg-fresh-50 border-fresh-200',
  'bg-fresh-900': 'bg-fresh-100',
  'text-fresh-400': 'text-fresh-600',
  'text-fresh-300': 'text-fresh-700',
  'text-aqua-400': 'text-aqua-600',
  'bg-aqua-900': 'bg-aqua-100',
  'text-red-400': 'text-red-600',
  'bg-gray-100\\/50': 'bg-white',
  'bg-gray-900\\/40': 'bg-gray-900/10' // for overlay
};

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;

      for (const [search, replace] of Object.entries(replacements)) {
        const regex = new RegExp(`\\b${search}\\b`, 'g');
        if (regex.test(content)) {
          content = content.replace(regex, replace);
          modified = true;
        }
      }
      
      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

for (const dir of directoriesToScan) {
  if (fs.existsSync(dir)) {
    processDirectory(dir);
  }
}

console.log('Refinement complete.');
