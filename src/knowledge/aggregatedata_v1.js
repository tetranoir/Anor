// aggregates the data "tables" into single json files

const fs = require('fs');
const p = require('path');

// config
const verbose = false;
const tables = ['champions', 'synergies']; // data files that exist
const source = p.join('data', 'v1'); // path to source data
const target = p.join('src', 'data'); // target of generated file

console.log(__dirname)

function aggregateFileData(path, target, name) {
  fs.readdir(path, (err, files) => {
    if (err) {
      console.log(err);
      return;
    }

    const agg = {};
    files.forEach(filePath => {
      try {
        const file = fs.readFileSync(p.join(path, filePath));
        const json = JSON.parse(file);
        const filePathNoExt = filePath.replace(/\.[^/.]+$/, '');
        agg[filePathNoExt] = json;
      } catch (e) {
        console.log(filePath, e);
      }
    });

    const targetFilePath = p.join(target, name);
    fs.writeFile(targetFilePath, JSON.stringify(agg, null, 2), err => {
      if (err) {
        console.log(err);
        return;
      }

      console.log(`${name} was saved at ${targetFilePath}`);
    });
  });
}

tables.forEach(t => aggregateFileData(p.join(source, t), target, `${t}.json`));
