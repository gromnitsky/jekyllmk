/* globals ng */
'use strict';

let IndexService = ng.core.Class({
    constructor: [ng.http.Http, function(http) {
	this.q = 1
	this.index = {
	    posts: [1,2,3],
	    authors: [7,8,9]
	}
	console.log('IndexService: fetch')
    }],
    posts: function() {
	return this.index.posts
    }
})

let app = {}
app.LastN = ng.core.Component({
    selector: 'lastn',
    template: `<h1>This is {{foo}} </h1>

<ul>
<li *ngFor="#idx of names">{{idx}}</li>
</ul>

<ul>
<li *ngFor="#idx of index.posts()">{{idx}}</li>
</ul>

<ul>
<li *ngFor="#idx of index.index.authors">{{idx}}</li>
</ul>

<p *ngIf="names.length >= 3">3 or more names</p>

<button (click)="hello()">hello</button>
`
}).Class({
    constructor: [ng.router.Router, IndexService, function (router, index) {
	this.router = router
	this.index = index
	this.foo = "bar"
	this.names = ["one", "two", "three"]
    }],
    hello: function () {
//	this.router.navigate(['/Tags', {id: null}])
	this.router.navigate(['/Month', {year: '2000', month: '12'}])
    }
})

app.Tags = ng.core.Component({
    selector: 'tags',
    template: '<h1>Tags: {{params.id}}</h1>',
}).Class({
    constructor:
    [ng.router.Router, ng.router.RouteParams, function (router, params) {
	this.router = router
	this.params = params.params
    }]
})

app.Month = ng.core.Component({
    selector: 'month',
    template: '<h1>Month {{params.year}}-{{params.month}}</h1>',
}).Class({
    constructor:
    [ng.router.Router, ng.router.RouteParams, function (router, params) {
	this.router = router;
	this.params = params.params
	console.log(this.params)
    }]
})

app.Post = ng.core.Component({
    selector: 'post',
    template: '<h1>Post: {{params.name}}</h1>',
}).Class({
    constructor:
    [ng.router.Router, ng.router.RouteParams, function (router, params) {
	this.router = router;
	this.params = params.params
	console.log(this.params)
    }]
})

app.Nav = ng.core.Component({
    selector: 'my-nav',
    templateUrl: 'my-nav.template',
}).Class({
    constructor: [IndexService, function (index) {
	this.index = index
	console.log('app.Nav')
    }],
})

app.Main = ng.core.Component({
    selector: 'my-app',
    templateUrl: 'main.template',
    directives: [ng.router.ROUTER_DIRECTIVES, app.Nav],
}).Class({
    constructor: function () {
	console.log('app.Main')
    },

    nav_toggle: function() {
	// how to get a pointer to already created app.Nav instance?
	// if we use 'providers' we get _another_ app.Nav instance :(
	document.querySelector('my-nav > nav').classList.toggle('my-nav_aside')
    }
})

app.Main = ng.router.RouteConfig([
    { path: '/', component: app.LastN, name: 'LastN', useAsDefault: true },
    { path: '/tags/:id', component: app.Tags, name: 'Tags' },
    { path: '/:year/:month', component: app.Month, name: 'Month' },
    { path: '/:year/:month/:name', component: app.Post, name: 'Post' }
])(app.Main)


document.addEventListener('DOMContentLoaded', function () {
    ng.platform.browser
	.bootstrap(app.Main, [
	    IndexService,

	    ng.http.HTTP_PROVIDERS,

	    ng.router.ROUTER_PROVIDERS,
	    ng.core.provide(ng.router.LocationStrategy,
			    { useClass: ng.router.HashLocationStrategy })
	])
})
