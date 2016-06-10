dnl Angular 2.0.0-rc1
'use strict';

require('zone.js')
require('reflect-metadata')
global.Rx = require('rxjs/Rx')

var ng = {}
ng.core = require('@angular/core')
ng.common = require('@angular/common')
ng.compiler = require('@angular/compiler')
ng.platformBrowser = require('@angular/platform-browser')
ng.platformBrowserDynamic = require('@angular/platform-browser-dynamic')
ng.http = require('@angular/http')
ng.router_deprecated = require('@angular/router-deprecated')

dnl In our production build we explicitly turn on Angular 'production' mode.
dnl Alternatively, we could use include() macro to read different files
dnl depending on the value of NODE_ENV.
ifelse(NODE_ENV, `production', `ng.core.enableProdMode()')

module.exports = ng
