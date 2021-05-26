/**
 * log: Models -> filename-url
 */
const pathNode = require('path');
const getLogger = require('./utils/log');
const logger = getLogger();

module.exports = (file, api, options) => {
  const extname = pathNode.extname(file.path);
  if (!['.tsx', '.ts', '.js', '.jsx'].includes(extname)) return null;

  const j = api.jscodeshift;
  const root = j(file.source);

  root
    .find(j.Identifier)
    .filter(path => path.node.type === 'Identifier' && path.node.name === 'url')
    .forEach(path => {
      logger.info(
        pathNode.basename(file.path) +
          '-' +
          path.parent.parent.parent.node.key.name +
          '-' +
          path.parent.node.value.value,
      );
    });

  return;
};
