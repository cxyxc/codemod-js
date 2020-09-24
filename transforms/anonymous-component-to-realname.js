/**
 * from: export default () => {}
 * to: export default function FileName() {}
 */
const path = require('path');
const { printOptions } = require('./utils/config');

function firstUpperCase(source) {
  return source[0].toLocaleUpperCase().concat(source.slice(1));
}

function getComponentName(filepath) {
  let name = path.basename(filepath, '.tsx');
  if (name === 'index') name = path.basename(path.dirname(filepath));

  return firstUpperCase(name);
}

module.exports = (file, api, options) => {
  // 仅针对 jsx / tsx 文件
  const extname = path.extname(file.path);
  if (extname !== '.jsx' && extname !== '.tsx') return null;

  const j = api.jscodeshift;
  let hasChanged = false;
  const root = j(file.source);
  root.find(j.ExportDefaultDeclaration).replaceWith(p => {
    const declaration = p.node.declaration;
    if (declaration.type === 'ArrowFunctionExpression') {
      const name = getComponentName(file.path);
      if (/\.\//.test(name)) return null; // . 或 / 文件名无法使用
      hasChanged = true;
      return j.exportDefaultDeclaration(
        j.functionExpression(
          j.identifier(name), // identify 方法名
          declaration.params, // 方法参数
          declaration.body, // 方法体
          false, // 是否为 generator
          false, // expression
        ),
      );
    }
  });
  return hasChanged
    ? root.toSource(options.printOptions || printOptions)
    : null;
};
