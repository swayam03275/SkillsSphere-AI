const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const clientSrcDir = path.join(__dirname, '../client/src');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });

  return arrayOfFiles;
}

function processFile(filePath) {
  if (!filePath.endsWith('.js') && !filePath.endsWith('.jsx')) {
    return;
  }

  // Skip setup tests or anything explicitly asked not to migrate
  if (filePath.includes('setup.js')) return;

  const isJsx = filePath.endsWith('.jsx') || fs.readFileSync(filePath, 'utf8').includes('from "react"') || fs.readFileSync(filePath, 'utf8').includes('from \'react\'') || fs.readFileSync(filePath, 'utf8').includes('/>') || fs.readFileSync(filePath, 'utf8').includes('</');
  const newExt = isJsx ? '.tsx' : '.ts';
  const newPath = filePath.replace(/\.jsx?$/, newExt);

  console.log(`Migrating: ${path.relative(clientSrcDir, filePath)} -> ${newExt}`);

  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Convert PropTypes to Interfaces
  const componentNameMatch = content.match(/([a-zA-Z0-9_]+)\.propTypes\s*=\s*{([\s\S]*?)(?:};\s*$|};)/m);
  if (componentNameMatch) {
    const componentName = componentNameMatch[1];
    const propTypesBody = componentNameMatch[2];
    
    // Simplistic TS interface generation based on PropTypes
    let tsInterface = `export interface ${componentName}Props {\n`;
    const lines = propTypesBody.split('\n');
    for (let line of lines) {
      if (!line.trim() || line.trim().startsWith('//')) continue;
      
      const propMatch = line.match(/^\s*([a-zA-Z0-9_]+)\s*:\s*PropTypes\.(.*?)(,|$)/);
      if (propMatch) {
        const propName = propMatch[1];
        let propType = propMatch[2];
        let isRequired = propType.includes('.isRequired');
        
        propType = propType.replace('.isRequired', '');
        
        let tsType = 'any';
        if (propType.includes('string')) tsType = 'string';
        else if (propType.includes('number')) tsType = 'number';
        else if (propType.includes('bool')) tsType = 'boolean';
        else if (propType.includes('func')) tsType = '(...args: any[]) => any';
        else if (propType.includes('array')) tsType = 'any[]';
        else if (propType.includes('node') || propType.includes('element')) tsType = 'React.ReactNode';
        else if (propType.includes('object')) tsType = 'Record<string, any>';
        else if (propType.includes('oneOf')) tsType = 'any'; // Simplification
        
        tsInterface += `  ${propName}${isRequired ? '' : '?'}: ${tsType};\n`;
      }
    }
    tsInterface += `}\n\n`;

    // Inject the interface right before the component definition (or just after imports)
    const importEndIndex = content.lastIndexOf('import ');
    if (importEndIndex !== -1) {
      const nextLineIndex = content.indexOf('\n', importEndIndex) + 1;
      content = content.slice(0, nextLineIndex) + '\n' + tsInterface + content.slice(nextLineIndex);
    } else {
      content = tsInterface + content;
    }

    // Try to type the functional component props
    const funcRegex1 = new RegExp(`const\\s+${componentName}\\s*=\s*\\((.*?)\\)\\s*=>`, 'g');
    content = content.replace(funcRegex1, `const ${componentName}: React.FC<${componentName}Props> = ($1) =>`);

    const funcRegex2 = new RegExp(`function\\s+${componentName}\\s*\\((.*?)\\)\\s*{`, 'g');
    content = content.replace(funcRegex2, `function ${componentName}($1: ${componentName}Props) {`);

    // Remove the PropTypes declaration
    content = content.replace(/([a-zA-Z0-9_]+)\.propTypes\s*=\s*{([\s\S]*?)(?:};\s*$|};)/m, '');
  }

  // 2. Remove prop-types import
  content = content.replace(/import\s+PropTypes\s+from\s+['"]prop-types['"];?\n?/g, '');

  // 3. Optional: Inject React import if missing but using JSX
  if (isJsx && !content.includes('import React') && !content.includes('import {') && content.includes('<')) {
     // react 17+ doesn't need this, but just in case
  }

  fs.writeFileSync(filePath, content);

  try {
    execSync(`git mv "${filePath}" "${newPath}"`);
  } catch (err) {
    console.error(`Failed to git mv ${filePath}`, err.message);
    // fallback if git mv fails (e.g. file not tracked yet)
    fs.renameSync(filePath, newPath);
  }
}

function run() {
  const allFiles = getAllFiles(clientSrcDir);
  const jsFiles = allFiles.filter(f => f.endsWith('.js') || f.endsWith('.jsx'));
  console.log(`Found ${jsFiles.length} JS/JSX files to migrate.`);
  
  for (const file of jsFiles) {
    processFile(file);
  }
  
  console.log('Migration complete!');
}

run();
