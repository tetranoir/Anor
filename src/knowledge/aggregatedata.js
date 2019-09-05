const fs = require('fs');
const p = require('path');

// config
const verbose = false;
const path = 'data/champions'; // path to data
const target = 'src'; // target of generated file
const name = 'champions.json'; // name of generated file


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
      console.log(e);
    }
  });

  fs.writeFile(p.join(target, path, name), JSON.stringify(agg, null, 2), err => {
    if (err) {
      console.log(err);
      return;
    }

    console.log(`${name} was saved at ${p.join(target, path)}`);
  });
});
