var upgrade = require('./gerencio-upgrade-lib');

var serviceName = process.argv[2];
var interval = process.argv[3];
var rancherUrl = process.env.RANCHER_URL;
var rancherAccessKey = process.env.RANCHER_ACCESS_KEY;
var rancherSecretKey = process.env.RANCHER_SECRET_KEY;
var rancherStack = process.env.RANCHER_STACK;
var rancherComposeUrl = process.env.RANCHER_COMPOSE_URL;

try {
    upgrade(serviceName, interval, rancherUrl, rancherAccessKey, rancherSecretKey, rancherStack, rancherComposeUrl)
    .catch(function (err) {
        process.exit(1);
    });
}
catch (e) {
    process.exit(1);
}
