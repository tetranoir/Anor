const fs = require('fs');
const p = require('path');

// config
const verbose = false;
const path = 'data'; // path to data

fs.readdir(path, (err, files) => {
  if (err) {
    console.log(err);
    return;
  }

  let errCount = 0;
  files.forEach(filePath => {
    try {
      const file = fs.readFileSync(p.join(path, filePath));
      const json = JSON.parse(file);
      const errors = validateObj(datatype, json);
      if (errors.length) {
        errCount++;
        console.log(`\n✖ ${filePath}`);
        errors.forEach(e => console.log(`  - ${e}`));
      } else {
        if (verbose) {
          console.log(`\n✔ ${filePath}`);
        } else {
          process.stdout.write('.');
        }
      }
    } catch (e) {
      console.log(e);
    }
  });

  process.stdout.write('\n');
  if (errCount === 0) {
    console.log('No errors!');
  } else if (errCount === 1) {
    console.log('1 error');
  } else {
    console.log(`${errCount} errors`);
  }
});

var classstrs = ['assassin', 'blademaster', 'brawler', 'elementalist', 'guardian', 'gunslinger', 'knight', 'ranger', 'shapeshifter', 'sorcerer'].join('|');
var originstrs = ['demon', 'dragon', 'exile', 'glacial', 'hextech', 'imperial', 'ninja', 'robot', 'pirate', 'phantom', 'noble', 'void', 'wild', 'yordle'].join('|');
var datatype = {
  name: '',
  class: [classstrs],
  origin: [originstrs],
}

function validateStr(typestr, s) {
  const errs = [];
  if (typestr === '') {
    return errs;
  }
  const possibleStrs = typestr.split('|');
  if (!possibleStrs.includes(s)) {
    errs.push(`cannot be value '${s}'`);
  }
  return errs;
}

function validateAry(typeary, a) {
  const [arytype] = typeary;
  const errs = [];
  if (typeof arytype === 'string') {
    return errs.concat(a.reduce((es, v) => es.concat(validateStr(arytype, v)), []));
  }
  return errs;
}

function validateObj(typeobj, o) {
  return Object.entries(typeobj).reduce((errs, [k, v]) => {
    const val = o[k];

    // non null key
    if (v !== undefined && !val) {
      errs.push(`${k} does not exist`);
      return errs;
    }

    // validate value type
    if (!val) return errs;
    if (Array.isArray(v)) {
      if (!Array.isArray(val)) {
        errs.push(`'${k}' is expected to be an array but got '${typeof val}'`);
        return errs;
      }
    } else if (typeof v !== typeof val) {
      errs.push(`'${k}' is expected to be of type '${typeof v}' but got '${typeof val}'`);
      return errs;
    }

    // validate value space
    if (typeof v === 'string') {
      errs = errs.concat(validateStr(v, val).map(err => `'${k}' ${err}`));
    } else if (Array.isArray(v)) {
      errs = errs.concat(validateAry(v, val).map(err => `'${k}' ${err}`));
    }

    return errs;
  }, []);
}
