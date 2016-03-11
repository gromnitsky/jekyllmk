/* globals ng, Rx */
'use strict';

let post = require('../lib/post')
let index = require('../lib/index')

let OBD = ng.core.Class({
    constructor: function() {
	this.err = {}
	this.err.text = null
    },

    clean: function() {
	this.err.text = null
    }
})

let IndexService = ng.core.Class({
    constructor: [ng.http.Http, function(http) {
	console.log('IndexService: http.get')
	this.url_index = 'index.json'
	this.url_config = 'config.json'

	let index$ = http.get(this.url_index).map(res => res.json())
	let config$ = http.get(this.url_config).map(res => res.json())
	this.$src = Rx.Observable.zip(index$, config$, (index, config) => {
	    return {
		index,
		config
	    }
	})
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
	this.aside = true
	this.obd = obd

	indser.$src.subscribe((data) => {
	    console.log('NavService: http.get DONE')
	    index.postproc(data, data.config.topmenu.treesort)
	    this.data = data
//	    console.log(data)
	}, (err) => {
	    obd.err.text = `HTTP ${err.status}: ${indser.url_index} || ${indser.url_config}`
	})

    }],

    clean: function() {
	this.obd.clean()
	if (this.ns) this.ns.curpost = null
    }
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
    constructor: [ng.router.Router, IndexService, NavService, function (router, index, ns) {
	this.router = router
	this.index = index
	this.ns = ns

	this.ns.clean()

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

app.Post = ng.core.Component({
    selector: 'post',
    templateUrl: 'post.template',
    directives: [ng.router.ROUTER_DIRECTIVES],
    providers: [PostService]
}).Class({
    constructor:
    [ng.router.Router, ng.router.RouteParams, PostService, OBD, NavService, function (router, params, ps, obd, ns) {
	console.log('app.Post')
	this.router = router
	this.params = params.params
	this.ns = ns
	this.obd = obd

	this.ns.clean()

	ps.html$(this.params).subscribe((data) => {
	    console.log(`app.Post: http.get ${ps.url(this.params)} DONE`)
	    this.data = data
	    this.ns.curpost = ns.data.cal
		.find(this.params.year, this.params.month,
		      `${this.params.day}-${this.params.name}`)

	    this.post_prev = this.find_next_url(-1)
	    this.post_next = this.find_next_url(1)
	}, (err) => {
	    obd.err.text = `HTTP ${err.status}: ${ps.url(this.params)}`
	})
    }],

    find_us: function() {
	if (!this.ns) return -1
	let arr = this.ns.data.index.posts
	for (let idx = 0; idx < arr.length; ++idx) {
	    if (this.params.year === arr[idx].y &&
		this.params.month === arr[idx].m &&
		this.params.day === arr[idx].d &&
		this.params.name === arr[idx].n)
		return idx
	}
	return -1
    },

    find_next: function(pos) {
	let us = this.find_us()
	return this.ns.data.index.posts[us+pos]
    },

    find_next_url: function(pos) {
	let post = this.find_next(pos)
	if (!post) return null
	return {
	    // FIXME
	    url: `#/${post.y}/${post.m}/${post.d}/${post.n}`,
	    subject: post.s
	}
    }
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

    is_selected: function(post) {
	if (!(this.ns && this.ns.curpost)) return false
	return this.ns.curpost.payload.y === post.payload.y &&
	    this.ns.curpost.payload.m === post.payload.m &&
	    this.ns.curpost.name === post.name
    },

    plus_or_minus: function(tnode) {
	if (!(this.ns && this.ns.curpost)) return "topmenu-tree_ctrl-collapsed"
	return this.ns.curpost.ascendant_of(tnode) ? "topmenu-tree_ctrl-expanded" : "topmenu-tree_ctrl-collapsed"
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
    { path: '/:year/:month/:day/:name', component: app.Post, name: 'Post' },
    { path: '/**', redirectTo: ['LastN'] }
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
