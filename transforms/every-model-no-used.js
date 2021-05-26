/**
 * find: xxxModel.getModel
 */
const path = require('path');
const getLogger = require('./utils/log');
const logger = getLogger();

module.exports = (file, api, options) => {
  const extname = path.extname(file.path);
  if (!['.tsx', '.ts', '.js', '.jsx'].includes(extname)) return null;

  const j = api.jscodeshift;
  const root = j(file.source);

  const currentFileModelsList = [];

  root
    .find(j.ImportDeclaration)
    .filter(path => {
      return (
        path.node.specifiers &&
        path.node.specifiers[0] &&
        path.node.specifiers[0].type === 'ImportDefaultSpecifier' &&
        path.node.source.value.includes('services/Models')
      );
    })
    .forEach(path => {
      const modelName = path.node.specifiers[0].local.name;
      const sourceArray = path.node.source.value.split('/').filter(i => i);
      const sourceName = sourceArray[sourceArray.length - 1];
      currentFileModelsList.push({ modelName, sourceName });
    });

  root
    .find(j.Identifier)
    .filter(
      path =>
        path.node.name === 'getModel' &&
        path.parent.node.type === 'MemberExpression',
    )
    .forEach(path => {
      const modelName = path.parent.node.object.name;
      const sourceName = currentFileModelsList.find(
        i => i.modelName === modelName,
      ).sourceName;
      const modelArg = path.parent.parent.node.arguments[0].value;
      logger.info(sourceName + '-' + modelArg);
    });

  return;
};
