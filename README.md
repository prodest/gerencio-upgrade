# gerencio-upgrade
Script para atualização de ambiente dentro do gerenc.io . Utilizando o  "rancher-compose up --force-upgrade A" utilizando parametros e variaveis de ambientes documentados abaixo. 

```
RANCHER_URL         	- the url of the rancher server, ex: https://gerenc.io/v1/projects/abc
RANCHER_ACCESS_KEY  	- your rancher API access key
RANCHER_SECRET_KEY  	- your rancher API secret key 
RANCHER_STACK       	- the name of your rancher stack, ex: "default", "web"
RANCHER_COMPOSE_URL		- the url where the compose configuration lives, ex: https://gerenc.io/v1/projects/foo/environments/bar/composeconfig
```

Then run:
```
node ./rancher-upgrade.js {serviceNam} {interval}
node ./rancher-upgrade.js nodecolor 20000
```
O intervalor é em milisegundos, que equivale o tempo que o upgrade deve ter para a atualização de cada conteiner do serviço


## CircleCI integration
Edit your project's circle.yml file and add the following lines at the end of your deployment phase:

```
- git clone https://github.com/robzhu/rancher-upgrade 
- cd rancher-upgrade && npm install
- node ./rancher-upgrade/rancher-upgrade.js $RANCHER_SERVICE_NAME <new docker imageID> 
```
