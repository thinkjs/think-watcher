const test = require('ava');
const mock = require('mock-require');
const helper = require('think-helper');
const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');
const rimraf = require('rimraf');

const defaultOptions = {
  allowExts: ['js', 'es', 'ts'],
  filter: (fileInfo, options) => {
    let seps = fileInfo.file.split(path.sep);
    //filter hidden file
    let flag = seps.some(item => {
      if (item[0] === '.') {
        return true;
      }
    });
    if (flag) {
      return false;
    }
    let ext = path.extname(fileInfo.file).slice(1);
    if (options.allowExts.indexOf(ext) === -1) {
      return false;
    }
    return true;
  }
};

function getWatcher() {
  return mock.reRequire('../index');
}

function mockAssert(assertCallParams = []) {
  mock('assert', (type, desc) => {
    assertCallParams.push(type, desc);
  });
}

function removeFiles(dirPath) {
  let files = helper.getdirFiles(dirPath);
  files.forEach(file => {
    let filepath = path.join(dirPath, file);
    if(helper.isFile(filepath)){
      fs.unlinkSync(filepath);
    }
  })
}

function createFile(dir,filename) {
  if(!fs.existsSync(dir)){
    mkdirp.sync(dir);
  }
  let filePath = path.join(dir,filename);
  fs.openSync(filePath, 'w');
}

const defaultCallback = () => {
};

test.afterEach.always(_ => {
  const tmp = path.resolve(__dirname, 'tmp');
  rimraf.sync(tmp);
});


// param option fields:
// const options = {
//   srcPath,    // array , string
//   diffPath,   // array , string
//   filter,     // function
//   allowExts,  // array   **?
// };

test('constructor function -- cb not a function', t => {
  let assertCallParams = [];
  mockAssert(assertCallParams);
  let options = {
    srcPath: 'watchFiles'
  };
  const Watcher = getWatcher();
  new Watcher(options);
  t.deepEqual(assertCallParams,
    [
      false,
      'callback must be a function',
      'watchFiles',
      'srcPath can not be blank'
    ]
  )
});

test('buildOptions function -- undefined options', t => {
  let assertCallParams = [];
  mockAssert(assertCallParams);
  const Watcher = getWatcher();
  new Watcher(undefined, defaultCallback);
  t.deepEqual(assertCallParams,
    [
      true,
      'callback must be a function',
      undefined,
      'srcPath can not be blank'
    ]
  )
});

test('buildOptions function -- string srcPath,undefined diffPath,undefined filter,undefined allowExts', t => {
  const Watcher = getWatcher();
  let options = {
    srcPath: 'watchFiles'
  };
  let watcher = new Watcher(options, defaultCallback);
  t.deepEqual(watcher.options.srcPath, ['watchFiles']);
  t.deepEqual(watcher.options.diffPath, []);
  t.deepEqual(watcher.options.allowExts, defaultOptions.allowExts);
  t.deepEqual(helper.isFunction(watcher.options.filter), true);
});

test('buildOptions function -- string options', t => {
  const Watcher = getWatcher();
  let watcher = new Watcher('watchFiles', defaultCallback);
  t.deepEqual(watcher.options.srcPath, ['watchFiles']);
  t.deepEqual(watcher.options.diffPath, []);
  t.deepEqual(watcher.options.allowExts, defaultOptions.allowExts);
  t.deepEqual(helper.isFunction(watcher.options.filter), true);
});

test('buildOptions function -- empty string options', t => {
  let assertCallParams = [];
  mockAssert(assertCallParams);
  const Watcher = getWatcher();
  new Watcher('', defaultCallback);
  t.deepEqual(assertCallParams,
    [
      true,
      'callback must be a function',
      '',
      'srcPath can not be blank'
    ]
  )
});

test('buildOptions function -- Array srcPath,string diffPath,undefined filter,undefined allowExts', t => {
  const Watcher = getWatcher();
  let options = {
    srcPath: ['watchFiles1','watchFiles2'],
    diffPath: 'diffFiles'
  };
  let watcher = new Watcher(options, defaultCallback);
  t.deepEqual(watcher.options.srcPath, ['watchFiles1','watchFiles2']);
  t.deepEqual(watcher.options.diffPath, ['diffFiles']);
  t.deepEqual(watcher.options.allowExts, defaultOptions.allowExts);
  t.deepEqual(helper.isFunction(watcher.options.filter), true);
});

test('defaultOptions.filter function -- hidden file', t => {
  const Watcher = getWatcher();
  let watcher = new Watcher('watchFiles',defaultCallback);
  let fileInfo = {
    file: '/foo/bar/.baz/qux'
  };
  let result = watcher.options.filter(fileInfo);
  t.is(result,false);
});

test('defaultOptions.filter function -- valid extend name', t => {
  const Watcher = getWatcher();
  let watcher = new Watcher('watchFiles',defaultCallback);
  let fileInfo = {
    file: '/foo/bar/baz/qux/admin1.js'
  };
  let result = watcher.options.filter(fileInfo,watcher.options);
  t.is(result,true);
});

test('defaultOptions.filter function -- invalid extend name', t => {
  const Watcher = getWatcher();
  let watcher = new Watcher('watchFiles',defaultCallback);
  let fileInfo = {
    file: '/foo/bar/baz/qux/a.jsx'
  };
  let result = watcher.options.filter(fileInfo,watcher.options);
  t.is(result,false);
});

test('getChangedFiles function -- srcPath must be an absolute path', t => {
  let assertCallParams = [];
  mockAssert(assertCallParams);
  const Watcher = getWatcher();
  let options = {
    srcPath: ['./admin']
  };
  let watcher = new Watcher(options, defaultCallback);
  watcher.getChangedFiles();
  t.deepEqual(assertCallParams,
    [
      true,
      'callback must be a function',
      ['./admin'],
      'srcPath can not be blank',
      false,
      'srcPath must be an absolute path'
    ]
  );
});

test('getChangedFiles function -- empty diffPath', t => {
  const Watcher = getWatcher();
  let [admin, home] = [path.resolve(__dirname, 'tmp','admin'), path.resolve(__dirname, 'tmp', 'home')];
  let options = {
    srcPath: [admin, home]
  };

  createFile(admin, 'admin.js');
  createFile(home, 'home.js');

  let watcher = new Watcher(options, defaultCallback);
  let watchFiles = watcher.getChangedFiles();
  t.deepEqual(
    watchFiles,
    [
      {
        path: admin,
        file: 'admin.js'
      },
      {
        path: home,
        file: 'home.js'
      },
    ]
  )
});

test('getChangedFiles function -- delete extra files in diffPath', t => {
  const Watcher = getWatcher();
  let [admin, home, diff] = [
    path.resolve(__dirname, 'tmp','admin'),
    path.resolve(__dirname, 'tmp','home'),
    path.resolve(__dirname, 'tmp','diff'),
  ];

  createFile(diff, 'diff.js');

  let options = {
    srcPath: [admin, home],
    diffPath: [diff]
  };
  let watcher = new Watcher(options, defaultCallback);
  watcher.getChangedFiles();
  let files = helper.getdirFiles(diff);
  t.deepEqual(files, []);
});

test('getChangedFiles function -- delete extra files in diffPath', t => {
  const Watcher = getWatcher();
  let [admin, home, diffAdmin, diffHome] = [
    path.resolve(__dirname, 'tmp', 'admin'),
    path.resolve(__dirname, 'tmp', 'home'),
    path.resolve(__dirname, 'tmp', 'diff-admin'),
    path.resolve(__dirname, 'tmp', 'diff-home'),
  ];

  createFile(admin, 'admin1.js');
  createFile(home, 'home1.js');
  createFile(diffAdmin,'diff1.js');
  createFile(diffAdmin,'admin1.js');
  createFile(diffHome,'diff2.js');
  createFile(diffHome,'home1.js');

  let options = {
    srcPath: [admin, home],
    diffPath: [diffAdmin,diffHome]
  };
  let watcher = new Watcher(options, defaultCallback);
  watcher.getChangedFiles();
  let adminFiles = helper.getdirFiles(diffAdmin);
  let homeFiles = helper.getdirFiles(diffHome);

  t.deepEqual(adminFiles, ['admin1.js']);
  t.deepEqual(homeFiles, ['home1.js']);
});




































