/* globals ng */
'use strict';

let CalendarService = ng.core.Class({
    constructor: [ng.http.Http, function(http) {
	this.index = {
	    posts: [1,2,3],
	    authors: [7,8,9]
	}
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
<li *ngFor="#idx of calser.posts()">{{idx}}</li>
</ul>

<ul>
<li *ngFor="#idx of calser.index.authors">{{idx}}</li>
</ul>

<p *ngIf="names.length >= 3">3 or more names</p>

<button (click)="hello()">hello</button>
`
}).Class({
    constructor: [ng.router.Router, CalendarService, function (router, calser) {
	this.router = router;
	this.calser = calser
	this.foo = "bar"
	this.names = ["one", "two", "three"]
    }],
    hello: function () {
	this.router.navigate(['/Tags']);
    }
})

app.Tags = ng.core.Component({
    selector: 'tags',
    template: '<h1>Tags</h1>',
}).Class({
    constructor: [ng.router.Router, function (router) {
	this.router = router;
    }]
})

app.Main = ng.core.Component({
    selector: 'my-app',
    template: '<router-outlet></router-outlet>',
    directives: [ng.router.ROUTER_DIRECTIVES],
}).Class({
    constructor: [ng.router.Router, ng.http.Http, function (router, http) {
	console.log('Main')
    }],
})

app.Main = ng.router
    .RouteConfig([
	{ path: '/lastn', component: app.LastN, name: 'LastN', useAsDefault: true },
	{ path: '/tags', component: app.Tags, name: 'Tags' },
    ])(app.Main)


document.addEventListener('DOMContentLoaded', function () {
    ng.platform.browser
	.bootstrap(app.Main, [
	    CalendarService,
	    ng.http.HTTP_PROVIDERS,

	    ng.router.ROUTER_PROVIDERS,
	    ng.core.provide(ng.router.LocationStrategy,
			    { useClass: ng.router.HashLocationStrategy })
	])
})
