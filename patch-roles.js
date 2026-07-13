const fs = require('fs');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else if (file.endsWith('.ts')) { 
            results.push(file);
        }
    });
    return results;
}

const files = walk('./src/app/api');
let modifiedCount = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    // Replace .select('role') with .select('role, email')
    if (content.includes(".select('role')")) {
        content = content.replace(/\.select\('role'\)/g, ".select('role, email')");
        modified = true;
    }

    // Replace if check
    const regex1 = /if\s*\(\s*!profile\s*\|\|\s*profile\.role\s*!==\s*'admin'\s*\)/g;
    const regex2 = /if\s*\(\s*profileError\s*\|\|\s*!profile\s*\|\|\s*profile\.role\s*!==\s*'admin'\s*\)/g;
    
    if (regex1.test(content)) {
        content = content.replace(regex1, "if (!profile || (profile.role !== 'admin' && profile.email !== 'admin@prepwise.com'))");
        modified = true;
    }
    
    if (regex2.test(content)) {
        content = content.replace(regex2, "if (profileError || !profile || (profile.role !== 'admin' && profile.email !== 'admin@prepwise.com'))");
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Patched: ' + file);
        modifiedCount++;
    }
}
console.log('Total files patched: ' + modifiedCount);
