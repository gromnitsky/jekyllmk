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
	    let url_prefix = `${params.year}/${params.month}/${params.day}`
	    r.body = post.md2html(r._fm.body, url_prefix)
	    r.url_src = res.url
	    delete r._fm
	    return r
	})
    }
})

let NavService = ng.core.Class({
    constructor: [IndexService, OBD, function(indser, obd) {
	console.log('NavService')
	this.sidebar1_aside = true
	this.obd = obd

	this.data$ = new Rx.AsyncSubject()

	indser.$src.subscribe((data) => {
	    console.log('NavService: http.get DONE')
	    this.about = this.find_about_page(data)
	    index.postproc(data, data.config.calendar.treesort)
	    this.data = data

	    this.data$.next(data)
	    this.data$.complete()
//	    console.log(data)
	}, (err) => {
	    obd.err.text = `HTTP ${err.status}: ${indser.url_index} || ${indser.url_config}`
	})

    }],

    find_about_page: function(data) {
	for (let page of data.index.pages) {
	    if (page.n === "about/index") return page
	}
	return null
    },

    clean: function() {
	this.obd.clean()
	this.curpost = null
	this.curpage = null
    }
})

let PageService = ng.core.Class({
    constructor: [ng.http.Http, function(http) {
	console.log('PageService')
	this.http = http
    }],

    url: function(params) {
	return `p/${params.name}.md`
    },

    html$: function(params) {
	return this.http.get(this.url(params)).map(res => {
	    let r = post.parse(res._body)
	    // basename
	    let url_prefix = `p/${params.name.replace(/\/[^\/]+$/, '')}`
	    r.body = post.md2html(r._fm.body, url_prefix)
	    r.url_src = res.url
	    delete r._fm
	    return r
	})
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

	ns.data$.subscribe((data) => {
	    console.log('app.LastN: ns.data$.subscribe')
	    this.redirect(data)
	}, (err) => {
	    obd.err.text = "Failed to detect the latest post."
	})
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
	this.result = this.ns.data.config.calendar.treesort === "descending" ? r.reverse() : r
	// should work w/o triggering the router
	if (!this._first) this.location.replaceState(`/tags/${this.query}`)
	this._first = false
    }
})

app.Post = ng.core.Component({
    selector: 'post',
    templateUrl: 'post.template',
    directives: [ng.router.ROUTER_DIRECTIVES],
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

app.Page = ng.core.Component({
    selector: 'page',
    templateUrl: 'page.template',
    directives: [ng.router.ROUTER_DIRECTIVES],
    providers: [PageService]
}).Class({
    constructor:
    [ng.router.Router, ng.router.RouteParams, PageService, OBD, NavService, ng.platform.browser.Title, function (router, params, ps, obd, ns, title) {
	console.log('app.Page')
	this.router = router
	this.params = params.params
	this.ns = ns
	this.obd = obd
	this.title = title

	this.ns.clean()

	ps.html$(this.params).subscribe((data) => {
	    console.log(`app.Page: http.get ${ps.url(this.params)} DONE`)
	    this.data = data
	    this.ns.curpage = this.params.name
	    this.title.setTitle(`${this.ns.data.config.title} :: ${data.subject}`)
	}, (err) => {
	    obd.err.text = `HTTP ${err.status}: ${ps.url(this.params)}`
	})
    }]
})

app.Sidebar1 = ng.core.Component({
    selector: 'sidebar1',
    templateUrl: 'sidebar1.template',
    directives: [ng.router.ROUTER_DIRECTIVES],
}).Class({
    constructor: [NavService, function (ns) {
	console.log('app.Sidebar1')
	this.ns = ns
    }],

    is_selected: function(post) {
	if (!(this.ns && this.ns.curpost)) return false
	return this.ns.curpost.payload.y === post.payload.y &&
	    this.ns.curpost.payload.m === post.payload.m &&
	    this.ns.curpost.name === post.name
    },

    plus_or_minus: function(tnode) {
	if (!(this.ns && this.ns.curpost)) return "jekyllmk-sidebar1__tree_ctrl--collapsed"
	return this.ns.curpost.ascendant_of(tnode) ? "jekyllmk-sidebar1__tree_ctrl--expanded" : "jekyllmk-sidebar1__tree_ctrl--collapsed"
    },

    toggle_view: function(e) {
	e.target.classList.toggle('jekyllmk-sidebar1__tree_ctrl--expanded')
	e.target.classList.toggle('jekyllmk-sidebar1__tree_ctrl--collapsed')
	e.target.nextElementSibling.classList.toggle('jekyllmk-sidebar1__tree_node--collapsed')
    }
})

app.OBD = ng.core.Component({
    selector: 'obd',
    template: '<div id="jekyllmk-obd" *ngIf="obd.err.text">{{ obd.err.text }}</div>',
}).Class({
    constructor: [OBD, NavService, function (obd, ns) {
	console.log('app.OBD')
	this.obd = obd
	this.ns = ns
    }]
})

app.Main = ng.core.Component({
    selector: 'my-app',
    templateUrl: 'main.template',
    directives: [ng.router.ROUTER_DIRECTIVES, app.Sidebar1, app.OBD],
}).Class({
    constructor: [NavService, function(ns) {
	console.log('app.Main')
	this.ns = ns
    }],

    sidebar1_toggle: function() {
	this.ns.sidebar1_aside = !this.ns.sidebar1_aside
    }
})

app.RouteError = ng.core.Component({
    selector: 'route-error',
    template: `<h2>Invalid route</h2><p>{{ insult }}</p>`,
}).Class({
    constructor: [OBD, function(obd) {
	console.log('app.RouteError')
	obd.clean()
	let horrible_insults = [
	    "Calling you stupid is an insult to stupid people.",
	    "Your dreams may not come true.",
	    "You're weak.",
	    "You're the worst hacker ever.",
	]
	// 50% (not really) chance of displaying
	this.insult = horrible_insults[Math.floor(Math.random() * 2 * horrible_insults.length + 1)]
    }]
})

app.Main = ng.router.RouteConfig([
    { path: '/', component: app.LastN, name: 'LastN', useAsDefault: true },
    { path: '/tags/:list', component: app.Tags, name: 'Tags' },
    { path: '/:year/:month/:day/:name', component: app.Post, name: 'Post' },
    { path: '/p/*name', component: app.Page, name: 'Page' },
    { path: '/**', component: app.RouteError, name: 'RouteError' }
])(app.Main)


document.addEventListener('DOMContentLoaded', function () {
    ng.platform.browser
	.bootstrap(app.Main, [
	    IndexService,
	    OBD,
	    NavService,
	    PostService,

	    ng.http.HTTP_PROVIDERS,

	    ng.router.ROUTER_PROVIDERS,
	    ng.core.provide(ng.router.LocationStrategy,
			    { useClass: ng.router.HashLocationStrategy }),
	    ng.platform.browser.Title
	])
})
