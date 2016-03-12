/* globals ng, Rx */
'use strict';

let post = require('../lib/post')
let index = require('../lib/index')
let tags = require('../lib/tags')

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

	this.data$ = new Rx.Subject()

	indser.$src.subscribe((data) => {
	    console.log('NavService: http.get DONE')
	    index.postproc(data, data.config.topmenu.treesort)
	    this.data = data

	    this.data$.next(data)
	    this.data$.complete()
//	    console.log(data)
	}, (err) => {
	    obd.err.text = `HTTP ${err.status}: ${indser.url_index} || ${indser.url_config}`
	})

    }],

    clean: function() {
	this.obd.clean()
	this.curpost = null
    }
})


let app = {}

// Detect the latest post & make a redirect to it
app.LastN = ng.core.Component({
    selector: 'lastn',
    template: '<p>Wait please...</p>'
}).Class({
    constructor:
    [ng.router.Router, NavService, OBD, function (router, ns, obd) {
	console.log("app.LastN")
	this.router = router
	this.ns = ns

	if (this.ns.data) {
	    console.log('app.LastN: redirect')
	    this.redirect(this.ns.data)
	} else {
	    ns.data$.subscribe((data) => {
		console.log('app.LastN: ns.data$.subscribe')
		this.redirect(data)
	    }, (err) => {
		obd.err.text = "Failed to detect the latest post."
	    })
	}
    }],

    redirect: function(data) {
	let post = data.index.posts[0]
	this.router.navigate(['/Post', {year: post.y, month: post.m, day: post.d, name: post.n }])
    }
})

app.Tags = ng.core.Component({
    selector: 'tags',
    templateUrl: 'tags.template',
    directives: [ng.router.ROUTER_DIRECTIVES],
}).Class({
    constructor:
    [ng.router.Router, ng.router.RouteParams, ng.router.Location, NavService, ng.platform.browser.Title, function (router, params, location, ns, title) {
	console.log("app.Tags")
	this.router = router
	this.params = params.params
	this.location = location
	this.ns = ns
	this.title = title
	this.query = this.params.list
	this.result = []

	this.ns.clean()
	this._first = true
	this.on_submit()
    }],

    on_submit: function() {
	console.log("app.Tags: on_submit")
	this.title.setTitle(`${this.ns.data.config.title} :: Tags :: ${this.query}`)

	let r = tags.match_exact(this.ns.data, this.query)
	this.result = this.ns.data.config.topmenu.treesort === "descending" ? r.reverse() : r
	// should work w/o triggering the router
	if (!this._first) this.location.replaceState(`/tags/${this.query}`)
	this._first = false
    }
})

app.Post = ng.core.Component({
    selector: 'post',
    templateUrl: 'post.template',
    directives: [ng.router.ROUTER_DIRECTIVES],
    providers: [PostService]
}).Class({
    constructor:
    [ng.router.Router, ng.router.RouteParams, PostService, OBD, NavService, ng.platform.browser.Title, function (router, params, ps, obd, ns, title) {
	console.log('app.Post')
	this.router = router
	this.params = params.params
	this.ns = ns
	this.obd = obd
	this.title = title

	this.ns.clean()

	ps.html$(this.params).subscribe((data) => {
	    console.log(`app.Post: http.get ${ps.url(this.params)} DONE`)
	    this.data = data
	    this.ns.curpost = ns.data.cal
		.find(this.params.year, this.params.month,
		      `${this.params.day}-${this.params.name}`)

	    this.title.setTitle(`${this.ns.data.config.title} :: ${['y', 'm', 'd'].map(val => this.ns.curpost.payload[val]).join('/')} :: ${this.ns.curpost.payload.s}`)
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
    { path: '/tags/:list', component: app.Tags, name: 'Tags' },
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
			    { useClass: ng.router.HashLocationStrategy }),
	    ng.platform.browser.Title
	])
})
