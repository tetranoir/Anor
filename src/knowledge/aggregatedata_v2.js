// aggregates the data "tables" into single json files

const fs = require('fs');
const p = require('path');

// config
const verbose = false;
const key = 'name';
const source = p.join('data', 'v2'); // path to source data
const target = p.join('src', 'data'); // target of generated file

console.log(__dirname);

function arrayToObject(ary, getKey) {
  return ary.reduce((acc, val) => {
    acc[getKey(val)] = val;
    return acc;
  }, {});
}

function aggregateSynergies(path, targetFilePath, name) {
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

        agg[filePath.replace(/\.[^/.]+$/, '')] = json;
      } catch (e) {
        console.log(filePath, e);
      }
    });

    fs.writeFile(targetFilePath, JSON.stringify(agg, null, 2), err => {
      if (err) {
        console.log(err);
        return;
      }

      console.log(`${name} was saved at ${targetFilePath}`);
    });
  });
}

function aggregateChampions(championPath, externalPath, targetFilePath, name) {
  const championFiles = fs.readdirSync(championPath);
  let champions = [];
  championFiles.forEach(filePath => {
    try {
      const file = fs.readFileSync(p.join(championPath, filePath));
      champions = champions.concat(JSON.parse(file));
    } catch(e) {
      console.log(filePath, e);
    }
  });

  const externalFiles = fs.readdirSync(externalPath);
  let externals = [];
  externalFiles.forEach(filePath => {
    try {
      const file = fs.readFileSync(p.join(externalPath, filePath));
      externals = externals.concat(JSON.parse(file));
    } catch(e) {
      console.log(filePath, e);
    }
  });

  const externalMap = arrayToObject(externals, o => o[key]);
  const championMap = arrayToObject(champions.map(c => ({
    ...c,
    ...externalMap[c[key]],
  })), o => o[key]);

  fs.writeFile(targetFilePath, JSON.stringify(championMap, null, 2), err => {
    if (err) {
      console.log(err);
      return;
    }

    console.log(`${name} was saved at ${targetFilePath}`);
  });
}

function aggregateItems(itemsSourcePath, targetFilePath, name) {
  const itemFiles = fs.readdirSync(itemsSourcePath);
  let items = []
  itemFiles.forEach(filePath => {
    try {
      const file = fs.readFileSync(p.join(itemsSourcePath, filePath));
      items = items.concat(JSON.parse(file));
    } catch(e) {
      console.log(filePath, e);
    }
  });

  // maybe: potential to fill in unknown values with defaults
  const itemMap = arrayToObject(items, o => o[key]);

  fs.writeFile(targetFilePath, JSON.stringify(itemMap, null, 2), err => {
    if (err) {
      console.log(err);
      return;
    }
    console.log(`${name} was saved at ${targetFilePath}`);
  });
}

aggregateSynergies(p.join(source, 'synergies'), p.join(target, 'synergies.json'), 'synergies');
aggregateChampions(p.join(source, 'champions'), p.join(source, 'external'), p.join(target, 'champions.json'), 'champions');
aggregateItems(p.join(source, 'items'), p.join(target, 'items.json'), 'items');
