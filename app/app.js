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

let NavService = ng.core.Class({
    constructor: [IndexService, OBD, function(indser, obd) {
	console.log('NavService')
	this.cal_item = null
	this.aside = true

	indser.$src.subscribe((data) => {
	    console.log('NavService: http.get DONE')
	    index.postproc(data)
	    this.data = data
//	    console.log(data)
	}, (err) => {
	    obd.err.text = `HTTP ${err.status}: ${indser.url_index} || ${indser.url_meta}`
	})

    }]
})

app.Post = ng.core.Component({
    selector: 'post',
    templateUrl: 'post.template',
    directives: [ng.router.ROUTER_DIRECTIVES],
    providers: [PostService]
}).Class({
    constructor:
    [ng.router.Router, ng.router.RouteParams, PostService, OBD, NavService, function (router, params, ps, obd, ns) {
	console.log('app.Post')
	this.router = router;
	this.params = params.params

	ps.html$(this.params).subscribe((data) => {
	    console.log(`app.Post: http.get ${ps.url(this.params)} DONE`)
	    this.data = data
	    ns.cal_item = index.find(ns.data.cal, this.params.year, this.params.month, this.params.day, this.params.name)
//	    console.log(ns.cal_item)
	}, (err) => {
	    obd.err.text = `HTTP ${err.status}: ${ps.url(this.params)}`
	})
    }]
})

app.Nav = ng.core.Component({
    selector: 'topmenu',
    templateUrl: 'topmenu.template',
    directives: [ng.router.ROUTER_DIRECTIVES],
}).Class({
    constructor: [NavService, function (ns) {
	console.log('app.Nav')
	this.ns = ns
    }],

    plus_or_minus: function(yi, mi) {
	let func = this.cal_item_match_month
	if (mi === undefined) func = this.cal_item_match_year
	return func.call(this, yi, mi) ? "topmenu-tree_ctrl-expanded" : "topmenu-tree_ctrl-collapsed"
    },

    cal_item_match_year: function(yi) {
	if (!this.ns.cal_item) return false
	return this.ns.cal_item.pyear === yi
    },

    cal_item_match_month: function(yi, mi) {
	if (!this.ns.cal_item) return false
	return (this.ns.cal_item.pyear === yi &&
		this.ns.cal_item.pmonth === mi)
    },

    cal_item_match: function(yi, mi, pi) {
	if (!this.ns.cal_item) return false
	return (this.ns.cal_item.pyear === yi &&
		this.ns.cal_item.pmonth === mi &&
		this.ns.cal_item.ppost === pi)
    },

    toggle_view: function(e) {
	e.target.classList.toggle('topmenu-tree_ctrl-expanded')
	e.target.classList.toggle('topmenu-tree_ctrl-collapsed')
	e.target.nextElementSibling.classList.toggle('topmenu-tree_node-collapsed')
    }
})

app.Main = ng.core.Component({
    selector: 'my-app',
    templateUrl: 'main.template',
    directives: [ng.router.ROUTER_DIRECTIVES, app.Nav],
}).Class({
    constructor: [OBD, NavService, function (obd, ns) {
	console.log('app.Main')
	this.obd = obd		// template uses it
	this.ns = ns
    }],

    nav_toggle: function() {
	this.ns.aside = !this.ns.aside
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
	    NavService,

	    ng.http.HTTP_PROVIDERS,

	    ng.router.ROUTER_PROVIDERS,
	    ng.core.provide(ng.router.LocationStrategy,
			    { useClass: ng.router.HashLocationStrategy })
	])
})
