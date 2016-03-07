/* globals ng, Rx */
'use strict';

let post = require('../lib/post')
let index = require('../lib/index')

let OBD = ng.core.Class({
    constructor: function() {
	this.err = {}
	this.err.text = null
    }
})

let IndexService = ng.core.Class({
    constructor: [ng.http.Http, function(http) {
	console.log('IndexService: http.get')
	this.url_index = 'index.json'
	this.url_meta = 'meta.json'

	let index$ = http.get(this.url_index).map(res => res.json())
	let meta$ = http.get(this.url_meta).map(res => res.json())
	this.$src = Rx.Observable.zip(index$, meta$, (index, meta) => {
	    return {
		index,
		meta
	    }
	})
    }]
})

let app = {}
// TODO
app.LastN = ng.core.Component({
    selector: 'lastn',
    template: `<h1>This is {{foo}} </h1>

<ul>
<li *ngFor="#idx of names">{{idx}}</li>
</ul>

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
	this.router.navigate(['/Tags', {id: 'untagged'}])
    }
})

// TODO
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

let PostService = ng.core.Class({
    constructor: [ng.http.Http, function(http) {
	console.log('PostService')
	this.http = http
    }],

    url: function(params) {
	return `${params.year}/${params.month}/${params.day}/${params.name}.md`
    },

    html$: function(params) {
	return this.http.get(this.url(params)).map(res => {
	    let r = post.parse(res._body)
	    r.body = post.md2html(r._fm.body, params)
	    r.url_src = res.url
	    delete r._fm
	    return r
	})
    }
})

app.Post = ng.core.Component({
    selector: 'post',
    templateUrl: 'post.template',
    directives: [ng.router.ROUTER_DIRECTIVES],
    providers: [PostService]
}).Class({
    constructor:
    [ng.router.Router, ng.router.RouteParams, PostService, OBD, function (router, params, ps, obd) {
	console.log('app.Post')
	this.router = router;
	this.params = params.params

	ps.html$(this.params).subscribe((data) => {
	    console.log(`app.Post: http.get ${ps.url(this.params)} DONE`)
	    this.data = data
	}, (err) => {
	    obd.err.text = `HTTP ${err.status}: ${ps.url(this.params)}`
	})
    }]
})

app.Nav = ng.core.Component({
    selector: 'my-nav',
    templateUrl: 'my-nav.template',
    directives: [ng.router.ROUTER_DIRECTIVES],
}).Class({
    constructor: [OBD, IndexService, function (obd, indser) {
	console.log('app.Nav')

	indser.$src.subscribe((data) => {
	    console.log('app.Nav: http.get DONE')
	    index.postproc(data)
	    this.data = data
//	    console.log(data)
	}, (err) => {
	    obd.err.text = `HTTP ${err.status}: ${indser.url_index} || ${indser.url_meta}`
	})
    }],

    toggle_view: function(e) {
	e.target.classList.toggle('my-nav-menu-expanded')
	e.target.nextElementSibling.classList.toggle('my-nav-menu_items-collapsed')
    }
})

app.Main = ng.core.Component({
    selector: 'my-app',
    templateUrl: 'main.template',
    directives: [ng.router.ROUTER_DIRECTIVES, app.Nav],
}).Class({
    constructor: [OBD, function (obd) {
	console.log('app.Main')
	this.obd = obd
    }],

    nav_toggle: function() {
	// how to get a pointer to already created app.Nav instance?
	// if we use 'providers' we get _another_ app.Nav instance :(
	document.querySelector('my-nav > nav').classList.toggle('my-nav_aside')
    }
})

app.Main = ng.router.RouteConfig([
    { path: '/', component: app.LastN, name: 'LastN', useAsDefault: true },
    { path: '/tags/:id', component: app.Tags, name: 'Tags' },
    { path: '/:year/:month/:day/:name', component: app.Post, name: 'Post' }
])(app.Main)


document.addEventListener('DOMContentLoaded', function () {
    ng.platform.browser
	.bootstrap(app.Main, [
	    IndexService,
	    OBD,

	    ng.http.HTTP_PROVIDERS,

	    ng.router.ROUTER_PROVIDERS,
	    ng.core.provide(ng.router.LocationStrategy,
			    { useClass: ng.router.HashLocationStrategy })
	])
})
