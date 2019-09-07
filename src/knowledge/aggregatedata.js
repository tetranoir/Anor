// aggregates the data "tables" into single json files

const fs = require('fs');
const p = require('path');

// config
const verbose = false;
const tables = ['champions', 'synergies']; // determines name of generated file
const path = 'data'; // path to data
const target = p.join('src', 'data'); // target of generated file


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

tables.forEach(t => aggregateFileData(p.join(path, t), target, `${t}.json`));
