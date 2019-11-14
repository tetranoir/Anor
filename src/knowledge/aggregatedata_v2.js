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

function aggregateSynergies(path, target, name) {
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

function aggregateChampions(target, name) {
  const championPath = p.join(source, 'champions');
  const championFiles = fs.readdirSync(championPath);
  let champions = [];
  championFiles.forEach(filePath => {
    try {
      const file = fs.readFileSync(p.join(championPath, filePath));
      champions = champions.concat(JSON.parse(file));
    } catch (e) {
      console.log(filePath, e);
    }
  });

  const externalPath = p.join(source, 'external');
  const externalFiles = fs.readdirSync(externalPath);
  let externals = [];
  externalFiles.forEach(filePath => {
    try {
      const file = fs.readFileSync(p.join(externalPath, filePath));
      externals = externals.concat(JSON.parse(file));
    } catch (e) {
      console.log(filePath, e);
    }
  });

  const externalMap = arrayToObject(externals, o => o[key]);
  const championMap = arrayToObject(champions.map(c => ({
    ...c,
    ...externalMap[c[key]],
  })), o => o[key]);

  const targetFilePath = p.join(target, name);
  fs.writeFile(targetFilePath, JSON.stringify(championMap, null, 2), err => {
    if (err) {
      console.log(err);
      return;
    }

    console.log(`${name} was saved at ${targetFilePath}`);
  });
}

aggregateSynergies(p.join(source, 'synergies'), target, 'synergies.json');
aggregateChampions(target, 'champions.json');

