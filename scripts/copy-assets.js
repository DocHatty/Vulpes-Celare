const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');
const distDir = path.join(__dirname, '../dist');

function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            // Copy .txt, .json, and .py files
            if (entry.name.endsWith('.txt') || entry.name.endsWith('.json') || entry.name.endsWith('.py')) {
                fs.copyFileSync(srcPath, destPath);
                console.log(`Copied ${entry.name} to ${destPath}`);
            }
        }
    }
}

// Copy dictionaries
const srcDicts = path.join(srcDir, 'dictionaries');
const distDicts = path.join(distDir, 'dictionaries');

if (fs.existsSync(srcDicts)) {
    console.log('Copying dictionaries...');
    copyDir(srcDicts, distDicts);
} else {
    console.warn('Source dictionaries directory not found:', srcDicts);
}

// Copy CLI assets (e.g. Python bridge)
const srcCli = path.join(srcDir, 'cli');
const distCli = path.join(distDir, 'cli');

if (fs.existsSync(srcCli)) {
    console.log('Copying CLI assets...');
    copyDir(srcCli, distCli);
}

console.log('Assets copied successfully.');
