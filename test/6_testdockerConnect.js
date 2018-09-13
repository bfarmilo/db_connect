const DB = require('../js/app_config.json').patentDB;
const { connectDocker } = require('../js/connectDocker');

connectDocker(DB.connection).then(result => console.log(result));

