var request = require('request-promise');
var Promise = require('bluebird');

var serviceName = process.argv[2] || 'api-detran';
var interval = process.argv[3] || '1000';
var rancherUrl = process.env.RANCHER_URL || 'http://cloud.datacenter.es.gov.br.local/v1/projects/1a4680';
var rancherAccessKey = process.env.RANCHER_ACCESS_KEY || '898304FA0241E8DBBB34';
var rancherSecretKey = process.env.RANCHER_SECRET_KEY || 'ws9LnyA2TFV9yPPDuZ7nu5NVFCnM6DpDP6SB8Uqm';
var rancherStack = process.env.RANCHER_STACK || 'api';
var rancherComposeUrl = process.env.RANCHER_COMPOSE_URL || 'http://cloud.datacenter.es.gov.br.local/v1/projects/1a4680/environments/1e56/composeconfig';
//var apiEndpoint = process.env.API_ENDPOINT || 'http://10.32.32.93/cloud';
//var apiEndpoint = process.env.API_ENDPOINT || 'http://localhost:4555/cloud';
var apiEndpoint = process.env.API_ENDPOINT || 'https://api.es.gov.br/cloud';

var upgradeEndpoint = apiEndpoint + '/upgrade';
var statusEndpoint = apiEndpoint + '/status';

function requestUpgrade() {
    var options = {
        uri: upgradeEndpoint,
        headers: {
            'User-Agent': 'Request-Promise'
        },
        method: 'POST',
        form: {
            serviceName: serviceName,
            interval: interval,
            rancherUrl: rancherUrl,
            rancherAccessKey: rancherAccessKey,
            rancherSecretKey: rancherSecretKey,
            rancherStack: rancherStack,
            rancherComposeUrl: rancherComposeUrl
        },
        json: true
    };

    return request(options);
}

function requestStatus(id) {
    var options = {
        uri: statusEndpoint + '/' + id,
        headers: {
            'User-Agent': 'Request-Promise'
        },
        json: true
    };

    return request(options);
}

function checkStatus(id) {
    return Promise.delay(10000)
    .then(function() {
        console.log('\nChecking status...');

        return requestStatus(id)
    })
    .then(function (status) {

        if (status.finished) {
            if (status.success) {
                return status.result;
            } else {
                return Promise.reject(status.result);
            }
        } else {
            console.log('Not finished.');

            return checkStatus(id);
        }
    });
}

requestUpgrade()
.then(function (id) {
    console.log('\nUpgrading ' + serviceName);

    return checkStatus(id);
})
.then(function (result) {
    console.log('\n\nFinished with success:');
    console.log('\nstdout:');
    console.log(result.stdout);
    console.log('\nstderr:');
    console.log(result.stderr);
    
    process.exit(0);
})
.catch(function (err) {
    console.error(err);

    console.log('\n\nFinished with error:');
    console.log('\nstdout:');
    console.log(err.stdout);
    console.log('\nstderr:');
    console.log(err.stderr);

    process.exit(1);
});
