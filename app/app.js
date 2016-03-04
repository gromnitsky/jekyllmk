/* globals ng */
'use strict';

let CalendarService = ng.core.Class({
    constructor: [ng.http.Http, function(http) {
	this.index = {
	    posts: [1,2,3],
	    authors: [7,8,9]
	}
	console.log('CalendarService: fetch')
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
<li *ngFor="#idx of cal.posts()">{{idx}}</li>
</ul>

<ul>
<li *ngFor="#idx of cal.index.authors">{{idx}}</li>
</ul>

<p *ngIf="names.length >= 3">3 or more names</p>

<button (click)="hello()">hello</button>
`
}).Class({
    constructor: [ng.router.Router, CalendarService, function (router, cal) {
	this.router = router
	this.cal = cal
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


app.Main = ng.core.Component({
    selector: 'my-app',
    template: '<router-outlet></router-outlet>',
    directives: [ng.router.ROUTER_DIRECTIVES],
}).Class({
    constructor:
    [ng.router.Router, CalendarService, function (router, cal) {
	this.cal = cal
	console.log('Main', cal.posts())
    }],
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
	    CalendarService,
	    ng.http.HTTP_PROVIDERS,

	    ng.router.ROUTER_PROVIDERS,
	    ng.core.provide(ng.router.LocationStrategy,
			    { useClass: ng.router.HashLocationStrategy })
	])
})
