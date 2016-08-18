util = require('util');
yaml = require('js-yaml');
writeYaml = require('write-yaml');
fs = require('fs');
fse = require('fs-extra');
fss = require('fs-sync');
download = require('download');
npmRun = require('npm-run');
request = require('request');
unzip = require('unzip2');
del = require('delete');
sh = require('shelljs/global');
path = require('path');
Promise = require('bluebird');

/**
 * 
 * 
 * @param {any} _serviceName the name of the service to upgrade
 * @param {any} _interval interval in miliseconds to change version in nodes
 * @param {any} _rancherUrl the url of the rancher server, ex: http://myrancher.com:8080/v1/projects/abc
 * @param {any} rancherAccessKey your rancher API access key
 * @param {any} rancherSecretKey your rancher API secret key
 * @param {any} rancherStack the name of your rancher stack, ex: "default", "web"
 * @param {any} rancherComposeUrl the url where the compose configuration lives
 */
function upgrade(serviceName, interval, rancherUrl, rancherAccessKey, rancherSecretKey, rancherStack, rancherComposeUrl) {
  var p = new Promise(function (resolve, reject) {

    var RANCHER_COMPOSE_LINUX = "https://releases.rancher.com/compose/beta/latest/rancher-compose-linux-amd64.tar.gz";
    var RANCHER_COMPOSE_WINDOWS = "https://releases.rancher.com/compose/beta/latest/rancher-compose-windows-386.zip";
    var RANCHER_COMPOSE_OSX = "https://releases.rancher.com/compose/beta/latest/rancher-compose-darwin-amd64.tar.gz";

    // the rancher-compose archives above contain an intermediate folder that varies by version
    // this should be periodically updated as rancher releases new versions
    var RANCHER_COMPOSE_DIR_NAME = "rancher-compose-v0.7.3";

    var isWin = /^win/.test(process.platform);
    var isOSX = /^darwin/.test(process.platform);

    var filter_keys = function (obj, filter) {
      var key, keys = [];
      for (key in obj) {
        if (obj.hasOwnProperty(key) && key.match(filter)) {
          keys.push(key);
        }
      }
      return keys;
    };

    var tempPath = "temp/" + new Date().toISOString().replace(/:/g, '.');
    fse.mkdirsSync(tempPath);

    var deployUpgrade = function (resolve, reject) {
      console.log('DEPLOYMENT STARTING');
      try {
        var sourceComposeFile = tempPath + "/docker-compose.yml";

        console.log("loading %s", sourceComposeFile);
        var yamlDoc = yaml.safeLoad(fs.readFileSync(sourceComposeFile, "utf8"));
        console.log("searching for service definition: %s", serviceName);

        var expression = util.format("^%s.*", serviceName);
        var matches = filter_keys(yamlDoc, expression);

        var currentServiceEntry = null;
        if (matches.length === 0) {
          clearAll(tempPath);
          return reject(util.format("could not find any services matching name: %s", serviceName));
        }
        else if (matches.length == 1) {
          currentServiceEntry = matches[0];
        }
        else {
          console.log("multiple service entries found that match: '%s': %s ", serviceName, matches);

          var maxVersion = 0;
          matches.forEach(function (entry) {
            var entryVersion = entry.split('-').pop();
            if (entryVersion > maxVersion) {
              maxVersion = entryVersion;
              currentServiceEntry = entry;
            }
          });
        }
        if (currentServiceEntry === null) {
          clearAll(tempPath);
          return reject("could not find a matching service entry, giving up");
        }

        console.log("Using service entry: " + currentServiceEntry);

        //TODO: check the docker registry to see if the image actually exists
        var currentServiceElement = yamlDoc[currentServiceEntry];
        console.log(currentServiceElement);
        //clone the service element
        var targetFile = sourceComposeFile;
        console.log("writing same YAML file out to %s", targetFile);
        writeYaml.sync(targetFile, yamlDoc);
        console.log("successfully wrote modified YAML file out to %s", targetFile);


        var args = util.format(" --url %s --access-key %s --secret-key %s -p %s --file %s up -d --batch-size 1 --interval %s --confirm-upgrade  --pull  --force-upgrade %s ",
          rancherUrl,
          rancherAccessKey,
          rancherSecretKey,
          rancherStack,
          targetFile,
          interval,
          currentServiceEntry);

        var source = RANCHER_COMPOSE_LINUX;
        if (isWin) {
          source = RANCHER_COMPOSE_WINDOWS;
        }
        if (isOSX) {
          source = RANCHER_COMPOSE_OSX;
        }

        new download({ extract: true })
          .get(source)
          .dest(tempPath)
          .run(function () {
            console.log("rancher-compose downloaded");

            var cmd = null;
            if (isWin) {
              console.log("Detected environment: Windows");
              var composeFilePath = path.join(tempPath + "/", RANCHER_COMPOSE_DIR_NAME, "rancher-compose.exe");

              cmd = composeFilePath;
            } else if (isOSX) {
              console.log("Detected environment: OSX");
              cmd = tempPath + "/" + RANCHER_COMPOSE_DIR_NAME + "/rancher-compose ";
            } else {
              console.log("Detected environment: Linux");
              cmd = tempPath + "/" + RANCHER_COMPOSE_DIR_NAME + "/rancher-compose ";
            }

            console.log("running:\n" + cmd + args);

            var exec = require('child_process').exec;
            var exitCode = exec(cmd + args, function (error, stdout, stderr) {
              if (error) {
                console.log(error);
                clearAll(tempPath);
                reject({
                  stdout: stdout,
                  stderr: stderr
                });
              } else {
                clearAll(tempPath);
                resolve({
                  stdout: stdout,
                  stderr: stderr
                });
              }
            });
          });
      } catch (e) {
        console.log("Deployment failed:");
        console.error(e);

        clearAll(tempPath);
        return reject(e);
      }
    };

    try {

      // rancherUrl           - the url of the rancher server, ex: http://myrancher.com:8080/v1/projects/abc
      // rancherAccessKey    - your rancher API access key
      // rancherSecretKey    - your rancher API secret key
      // rancherStack         - the name of your rancher stack, ex: "default", "web"
      // rancherComposeUrl   - the url where the compose configuration lives

      var server = rancherUrl;
      if (!server) {
        clearAll(tempPath);
        return reject(new Error('required variable: rancherUrl- the url of the rancher server, ex: http://myrancher.com:8080/v1/projects/abc'));
      }
      var url = rancherComposeUrl;
      if (!url) {
        clearAll(tempPath);
        return reject(new Error('required variable: rancherComposeUrl- the url where the compose configuration lives'));
      }
      var username = rancherAccessKey;
      if (!username) {
        clearAll(tempPath);
        return reject(new Error('required variable: rancherAccessKey- your rancher API access key'));
      }
      var password = rancherSecretKey;
      if (!password) {
        clearAll(tempPath);
        return reject(new Error('required variable: rancherSecretKey- your rancher API secret key'));
      }
      var stack = rancherStack;
      if (!stack) {
        clearAll(tempPath);
        return reject(new Error('required variable: rancherStack- the name of your rancher stack, ex: "default", "web"'));
      }

      fse.removeSync("docker-compose.yml");
      fse.removeSync("rancher-compose.yml");

      console.log("downloading rancher compose config...");
      console.log(url);

      var r = request.get(url).auth(username, password, true)
        .pipe(unzip.Extract({ path: tempPath }))
        .on('close', function () {
          deployUpgrade(resolve, reject);
        })
        .on('error', function (err) {
          console.error(err);

          clearAll(tempPath);
          reject(err);
        });
    } catch (e) {
      console.log("Initialization failed:");
      console.error(e);

      clearAll(tempPath);
      return reject(e);
    }
  });

  return p;
}

function clearAll(path) {
  fse.removeSync(path);
}

module.exports = upgrade;
