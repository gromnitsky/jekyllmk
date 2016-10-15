/* globals ng, Rx, JekyllmkConfig */
'use strict';

let post = require('../lib/post')
let index = require('../lib/index')
let tags = require('../lib/tags')
let tw = require('angular2-treeview')

// On-board diagnostic display!
let OBD = ng.core.Class({
    constructor: function() { this.err = [] },
    push: function(text) { this.err.push(text) },
    clean: function() { this.err = [] }
})

// Fetch index & config
let IndexService = ng.core.Class({
    constructor: [ng.http.Http, function(http) {
	console.log('IndexService: http.get')
	this.url_index = 'index.json'

	let index$ = http.get(this.url_index).map(res => res.json())
	this.$src = Rx.Observable.zip(index$, (index) => {
	    return {
		index,
		config: JekyllmkConfig
	    }
	})
    }]
})

// Fetch custom header & footer
let HeaderFooterService = ng.core.Class({
    constructor: [ng.http.Http, function(http) {
	console.log('HeaderFooterService: http.get')
	this.url_header = 'local.header.html'
	this.url_footer = 'local.footer.html'
	this.http = http
    }],

    header$: function() {
	return this.http.get(this.url_header)
    },

    footer$: function() {
	return this.http.get(this.url_footer)
    }
})

// Fetch a post
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

// Receive an index, process it
let NavService = ng.core.Class({
    constructor: [IndexService, OBD, function(indser, obd) {
	console.log('NavService')
	this.sidebar1_expanded = false

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
	    obd.push(`NavService: HTTP ${err.status}: ${indser.url_index} || ${indser.url_config}`)
	})

    }],

    find_about_page: function(data) {
	for (let page of data.index.pages) {
	    if (page.n === "about/index") return page
	}
	return null
    },

    clean: function() {
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
    template: `<p>[a-dancing-cat.gif] Getting an index of the last post...</p>`
}).Class({
    constructor:
    [ng.router.Router, NavService, OBD, function (router, ns, obd) {
	console.log("app.LastN")
	this.router = router
	this.ns = ns
	this.obd = obd

	ns.data$.subscribe((data) => {
	    console.log('app.LastN: ns.data$.subscribe')
	    this.redirect(data)
	})
    }],

    redirect: function(data) {
	let first = this.ns.data.config.calendar.treesort === "descending" ? data.index.posts.length-1 : 0
	let post = data.index.posts[first]
	if (post) {
	    this.router.navigate(['/', post.y, post.m, post.d, post.n ])
	} else {
	    this.obd.push('app.LastN: no posts, cannot redirect')
	}
    }
})

app.Tags = ng.core.Component({
    selector: 'tags',
    templateUrl: 'tags.template',
}).Class({
    constructor:
    [ng.router.ActivatedRoute, ng.common.Location, NavService, ng.platformBrowser.Title, function (activated_route, location, ns, title) {
	console.log("app.Tags")
	this.location = location
	this.ns = ns
	this.title = title
	this.result = []

	// the callback runs every time route params change
	activated_route.params.subscribe( fresh_params => {
	    this.query = fresh_params.list
	    ns.clean()
	    ns.data$.subscribe( _unused => {
		console.log('app.Tags: ns.data$.subscribe')
		this.on_submit()
	    })
	})
    }],

    on_submit: function() {
	console.log("app.Tags: on_submit")
	this.title.setTitle(`${this.ns.data.config.title} :: Tags :: ${this.query}`)

	let r = tags.match_exact(this.ns.data, this.query)
	this.result = this.ns.data.config.calendar.treesort === "descending" ? r.reverse() : r
	// should work w/o triggering the router
	this.location.replaceState(`/tags/${this.query}`)
    }
})

app.Post = {}
app.Post.Nav = ng.core.Component({
    selector: 'post-nav',
    template: `
<nav class="jekyllmk-postnav">
  <a *ngIf="ps?.post_prev"
     [routerLink]="[ps?.post_prev?.url]" title="{{ ps?.post_prev?.subject }}">&lArr;</a>
  <a *ngIf="ps?.post_next"
     [routerLink]="[ps?.post_next?.url]" title="{{ ps?.post_next?.subject }}">&rArr;</a>
</nav>
`,
}).Class({
    constructor: [PostService, function(ps) {
	console.log("app.Post.Nav")
	this.ps = ps
    }]
})

app.Post.TagsList = ng.core.Component({
    selector: 'post-tags-list',
    inputs: ['src'],
    template: `
<span *ngFor="let name of src; let last = last">
  <a [routerLink]="['/tags/', name]">{{ name }}</a><span *ngIf="!last">,</span>
</span>
`,
}).Class({
    constructor: function() {
	console.log("app.Post.TagsList")
    }
})

app.Post.Main = ng.core.Component({
    selector: 'post',
    templateUrl: 'post.template',
}).Class({
    constructor:
    [ng.router.ActivatedRoute, PostService, OBD, NavService, ng.platformBrowser.Title, function (activated_route, ps, obd, ns, title) {
	console.log('app.Post.Main')
	this.params = activated_route.snapshot.params
	this.ns = ns
	this.title = title

	// the callback runs every time route params change
	activated_route.params.subscribe( fresh_params => {
	    this.params = fresh_params

	    ns.clean()
	    ps.html$(this.params).toPromise().then(data => {
		console.log(`app.Post.Main: http.get ${ps.url(this.params)} DONE`)
		this.data = data
		if (!this.ns.data) throw new Error("no NavServide data")
		this.ns.curpost = ns.data.cal
		    .find(this.params.year, this.params.month,
			  `${this.params.day}-${this.params.name}`)

		this.title.setTitle(`${this.ns.data.config.title} :: ${['y', 'm', 'd'].map(val => this.ns.curpost.payload[val]).join('/')} :: ${this.ns.curpost.payload.s}`)
		ps.post_prev = this.find_next_url(-1)
		ps.post_next = this.find_next_url(1)
	    }).catch( err => {
		obd.push(`app.Post.Main: error in processing ${ps.url(this.params)}: ${err.message || err.status}`)
	    })
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
	    url: `/${post.y}/${post.m}/${post.d}/${post.n}`,
	    subject: post.s
	}
    }
})

app.Page = ng.core.Component({
    selector: 'page',
    templateUrl: 'page.template',
    providers: [PageService]
}).Class({
    constructor:
    [ng.router.ActivatedRoute, PageService, OBD, NavService, ng.platformBrowser.Title, function (activated_route, ps, obd, ns, title) {
	console.log('app.Page')
	this.params = activated_route.snapshot.params
	this.ns = ns
	this.title = title

	// the callback runs every time route params change
	activated_route.params.subscribe( fresh_params => {
	    this.params = fresh_params

	    ns.clean()
	    ps.html$(this.params).toPromise().then( data => {
		console.log(`app.Page: http.get ${ps.url(this.params)} DONE`)
		this.data = data
		this.ns.curpage = this.params.name
		if (!this.ns.data) throw new Error("no NavServide data")
		this.title.setTitle(`${this.ns.data.config.title} :: ${data.subject}`)
	    }).catch( err => {
		ns.clean()
		obd.push(`app.Page: error in processing ${ps.url(this.params)}: ${err.message || err.status}`)
	    })
	})
    }]
})

app.Sidebar1 = {}
app.Sidebar1.TagsList = ng.core.Component({
    selector: 'tagsList',
    inputs: ['src'],
    template: `
<ul>
  <li *ngFor="let idx of src">
    <a [routerLink]="['/tags/', idx.name]">{{ idx.name }}</a>
    ({{ idx.count }})
  </li>
</ul>
`
}).Class({
    constructor: function() {
	console.log('app.Sidebar1.TagsList')
    }
})

app.Sidebar1.AboutLink = ng.core.Component({
    selector: 'aboutLink',
    template: `
<div class="jekyllmk-about">
  <p *ngIf="ns?.data?.config?.avatar">
    <img src="{{ ns?.data?.config?.avatar }}" alt="avatar">
  <p>
  <p *ngIf="ns?.about">
    <a [routerLink]="['/p/', ns?.about?.n]"
       [class.selected]="ns?.about?.n == ns?.curpage">
      &diams; {{ ns?.about?.s }}
    </a>
  </p>
</div>
`,
}).Class({
    constructor: [NavService, function (ns) {
	console.log('app.Sidebar1.AboutLink')
	this.ns = ns
    }]
})

app.Sidebar1.Main = ng.core.Component({
    selector: 'sidebar1',
    templateUrl: 'sidebar1.template',
}).Class({
    constructor: [ng.router.Router, NavService, function(router, ns) {
	console.log('app.Sidebar1.Main')
	this.ns = ns
	this.router = router
	this.parent = this
    }],

    node_print: function(tnode) {
	if (!tnode) return null
	return tnode.kids.length ? tnode.name : tnode.payload.s
    },

    node_click: function(event, tnode) {
	if (!(tnode && tnode.kids.length === 0)) return
	// `this` here is a TreeView instance
	this.parent.router.navigate(['/', tnode.payload.y, tnode.payload.m, tnode.payload.d, tnode.payload.n])
    },
})

app.OBD = ng.core.Component({
    selector: 'obd',
    template: `<div id="jekyllmk-obd" *ngIf="obd.err.length">
<ul>
  <li *ngFor="let item of obd.err">{{ item }}</li>
</ul>
</div>`,
}).Class({
    constructor: [OBD, function (obd) {
	console.log('app.OBD')
	this.obd = obd
    }]
})

app.Main = ng.core.Component({
    selector: 'my-app',
    templateUrl: 'main.template',
}).Class({
    constructor: [NavService, HeaderFooterService, function(ns, hfs) {
	console.log('app.Main')
	this.ns = ns
	this.header = ''
	this.footer = '<p>A place for an inspiration quote & a fax number.</p>';

	// pseudo-macros!
	['header', 'footer'].forEach( idx => {
	    hfs[`${idx}$`]().subscribe( data => {
		console.log(`app.Main: ${idx} DONE`)
		this[idx] = data._body
	    }, err => console.log(`app.Main: no custom ${idx}`))
	})

    }],

    sidebar1_toggle: function() {
	this.ns.sidebar1_expanded = !this.ns.sidebar1_expanded
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
	// 50% (well, not really) chance of displaying
	this.insult = horrible_insults[Math.floor(Math.random() * 2 * horrible_insults.length + 1)]
    }]
})


app.MainModule = ng.core.NgModule({
    imports: [
	ng.platformBrowser.BrowserModule,
	ng.forms.FormsModule,
	ng.http.HttpModule,
	ng.router.RouterModule.forRoot([
	    { path: '', component: app.LastN },
	    { path: 'LastN', component: app.LastN },
	    { path: 'tags/:list', component: app.Tags },
	    { path: ':year/:month/:day/:name', component: app.Post.Main },
	    { path: 'p/:name', component: app.Page },
	    { path: 'search', loadChildren: 'fts-angular2.js#JekyllmkFTSModule'},
	    { path: 'search/:q', loadChildren: 'fts-angular2.js#JekyllmkFTSModule'},
	    { path: '**', component: app.RouteError },
	], { useHash: true }),
    ],
    providers: [
	OBD,
	IndexService,
	HeaderFooterService,
	PostService,
	NavService,
	PageService,
    ],
    declarations: [
	tw.TreeView,
	app.Sidebar1.AboutLink,
	app.Sidebar1.TagsList,
	app.Post.TagsList,
	app.Post.Nav,
	app.OBD,

	app.LastN,
	app.Tags,
	app.Post.Main,
	app.Page,
	app.Sidebar1.Main,
	app.RouteError,

	app.Main
    ],
    bootstrap: [ app.Main ]
}).Class({
    constructor: function() {},
})


let boot = function() {
    let config = 'config.json'
    fetch(config)
	.then( res => {
	    return res.json()
	}).then( json => {
	    // create a global config object
	    window.JekyllmkConfig = json
	    ng.platformBrowserDynamic.platformBrowserDynamic()
		.bootstrapModule(app.MainModule)
	}).catch( err => {
	    console.log(err)
	    document.body.innerHTML = `<h1>Failed to load ${config}</h1>`
	})
}

if (document.readyState === "loading")
    document.addEventListener('DOMContentLoaded', boot)
else
    boot()
