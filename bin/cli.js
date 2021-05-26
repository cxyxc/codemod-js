/* eslint no-console: 0 */

const path = require('path');
const fs = require('fs');
const os = require('os');

const chalk = require('chalk');
const execa = require('execa');
const isGitClean = require('is-git-clean');
const updateCheck = require('update-check');

const jscodeshiftBin = require.resolve('.bin/jscodeshift');

const summary = require('../transforms/utils/summary');
const marker = require('../transforms/utils/marker');
const pkg = require('../package.json');

// jscodeshift codemod scripts dir
const transformersDir = path.join(__dirname, '../transforms');

// override default babylon parser config to enable `decorator-legacy`
// https://github.com/facebook/jscodeshift/blob/master/parser/babylon.js
const babylonConfig = path.join(__dirname, './babylon.config.json');

// jscodeshift bin#--ignore-config
const ignoreConfig = path.join(__dirname, './codemod.ignore');

const transformers = [
  // export 匿名组件转实名
  // 'anonymous-component-to-realname',

  // xxx.getModel('xxx') 汇总
  // 'every-model-no-used',

  // Models 目录汇总
  'every-models',
];

async function ensureGitClean() {
  let clean = false;
  try {
    clean = await isGitClean();
  } catch (err) {
    if (
      err &&
      err.stderr &&
      err.stderr.toLowerCase().includes('not a git repository')
    ) {
      clean = true;
    }
  }

  if (!clean) {
    console.log(chalk.yellow('Sorry that there are still some git changes'));
    console.log('\n you must commit or stash them firstly');
    process.exit(1);
  }
}

async function checkUpdates() {
  let update;
  try {
    update = await updateCheck(pkg);
  } catch (err) {
    console.log(chalk.yellow(`Failed to check for updates: ${err}`));
  }

  if (update) {
    console.log(
      chalk.blue(`Latest version is ${update.latest}. Please update firstly`),
    );
    process.exit(1);
  }
}

function getRunnerArgs(
  transformerPath,
  parser = 'babylon', // use babylon as default parser
  options = {},
) {
  const args = ['--verbose=2', '--ignore-pattern=**/node_modules'];

  // limit usage for cpus
  const cpus = options.cpus || Math.max(2, Math.ceil(os.cpus().length / 3));
  args.push('--cpus', cpus);

  // https://github.com/facebook/jscodeshift/blob/master/src/Runner.js#L255
  // https://github.com/facebook/jscodeshift/blob/master/src/Worker.js#L50
  args.push('--no-babel');

  args.push('--parser', parser);

  args.push('--parser-config', babylonConfig);
  args.push('--extensions=tsx,ts,jsx,js');

  args.push('--transform', transformerPath);

  args.push('--ignore-config', ignoreConfig);

  if (options.gitignore) {
    args.push('--ignore-config', options.gitignore);
  }

  if (options.style) {
    args.push('--importStyles');
  }

  return args;
}

async function run(filePath, args = {}) {
  const extraScripts = args.extraScripts ? args.extraScripts.split(',') : [];

  // eslint-disable-next-line no-restricted-syntax
  for (const transformer of transformers.concat(extraScripts)) {
    // eslint-disable-next-line no-await-in-loop
    await transform(transformer, 'babylon', filePath, args);
  }
}

async function transform(transformer, parser, filePath, options) {
  console.log(chalk.bgGreen.bold('Transform'), transformer);
  const transformerPath = path.join(transformersDir, `${transformer}.js`);

  // pass closet .gitignore to jscodeshift as extra `--ignore-file` option
  // const gitignorePath = await findGitIgnore(filePath);

  const args = [filePath].concat(
    getRunnerArgs(transformerPath, parser, {
      ...options,
      // gitignore: gitignorePath,
    }),
  );

  try {
    if (process.env.NODE_ENV === 'local') {
      console.log(`Running jscodeshift with: ${args.join(' ')}`);
    }
    await execa(jscodeshiftBin, args, {
      stdio: 'inherit',
      stripEof: false,
    });
  } catch (err) {
    console.error(err);
    if (process.env.NODE_ENV === 'local') {
      const errorLogFile = path.join(__dirname, './error.log');
      fs.appendFileSync(errorLogFile, err);
      fs.appendFileSync(errorLogFile, '\n');
    }
  }
}

/**
 * options
 * --force   // force skip git checking (dangerously)
 * --cpus=1  // specify cpus cores to use
 * --extraScripts=Icon-Outlined, blabla // add extra codemod scripts to run
 */

async function bootstrap() {
  const dir = process.argv[2];
  // eslint-disable-next-line global-require
  const args = require('yargs-parser')(process.argv.slice(3));
  if (process.env.NODE_ENV !== 'local') {
    // check for updates
    await checkUpdates();
    // check for git status
    if (!args.force) {
      await ensureGitClean();
    } else {
      console.log(
        Array(3)
          .fill(1)
          .map(() =>
            chalk.yellow(
              'WARNING: You are trying to skip git status checking, please be careful',
            ),
          )
          .join('\n'),
      );
    }
  }

  // check for `path`
  if (!dir || !fs.existsSync(dir)) {
    console.log(chalk.yellow('Invalid dir:', dir, ', please pass a valid dir'));
    process.exit(1);
  }
  await summary.start();
  await marker.start();
  await run(dir, args);
}

module.exports = {
  bootstrap,
  ensureGitClean,
  transform,
  run,
  getRunnerArgs,
  checkUpdates,
};
