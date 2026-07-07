const fs = require('fs');
const path = require('path');

const directoriesToScan = [
  path.join(__dirname, 'src', 'pages'),
  path.join(__dirname, 'src', 'components')
];

const replacements = {
  'bg-gray-950': 'bg-gray-50',
  'bg-gray-900': 'bg-white',
  'bg-gray-800': 'bg-gray-100',
  'border-gray-800': 'border-gray-200',
  'border-gray-700': 'border-gray-300',
  'text-white': 'text-gray-900',
  'text-gray-400': 'text-gray-600',
  'text-gray-300': 'text-gray-700',
  'text-gray-200': 'text-gray-800',
  'bg-black/60': 'bg-gray-900/40'
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
        const regex = new RegExp(`\\b${search.replace(/\//g, '\\/')}\\b`, 'g');
        if (regex.test(content)) {
          content = content.replace(regex, replace);
          modified = true;
        }
      }

      // Special cases for responsive grid/flex (if fixed without md: or lg:)
      // I won't auto replace flex/grid here to avoid breaking things, we can do it manually or via regex carefully.
      
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

console.log('Conversion complete.');
