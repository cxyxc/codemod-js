const log4js = require('log4js');
log4js.configure({
  appenders: {
    log: { type: 'file', filename: './log.log' },
  },
  categories: {
    default: { appenders: ['log'], level: 'info' },
  },
});

module.exports = log4js.getLogger;
