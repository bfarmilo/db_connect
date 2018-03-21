const exec = require('child_process').exec;

const connectDocker = async (connectParams) => {
    const dockerParams = Object.assign(connectParams);

    return new Promise((resolve, reject) => {
        exec('docker start sqlserver', (err0, stdout0, stderr0) => {
            if (err0) return reject(err0);
            if (stderr0) return reject(stderr0);
            console.log('%s started', stdout0);
            exec('powershell.exe docker inspect --format \'{{.NetworkSettings.Networks.nat.IPAddress}}\' sqlserver', (err, stdout, stderr) => {
                if (err) return reject(err);
                if (stderr) return reject(stderr);
                dockerParams.server = stdout.toString().split(/\n/g)[0];
                if (process.env.USEDB) dockerParams.options.database = process.env.USEDB;
                console.log('connecting with parameters %j', dockerParams);
                return resolve(dockerParams);
            });
        })
    })
}

module.exports = {
    connectDocker
}