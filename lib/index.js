'use strict';

// modifies data!
exports.postproc =  function(data, sort_order) {
    let authors = []
    data.index.authors.forEach( (author) => {
	authors.push({ name: author, count: 0 })
    })

    data.index.posts.forEach( (post, idx) => {
	post.a.forEach(ai => {
	    authors[ai].count++
	})
    })
    data.index.authors = authors

    data.cal = exports.cal(data)
    data.cal.sort_deep(sort_order)
}

// Everybody loves trees!
exports.TNode = class {
    constructor(name, payload, parent, kids) {
	if (!name) throw new Error("TNode requires a `name` arg")
	this.name = name
	this.payload = payload
	this.parent = parent
	this.kids = kids || []
    }

    indexOf(name) {
	if (!name) return -1
	for (let idx = 0; idx < this.kids.length; ++idx) {
	    if (name === this.kids[idx].name) return idx
	}
	return -1
    }

    // Example: tnode.insert(['2100', '01', '02', 'omglol'], {hi: "there"})
    insert(npath, payload) {
	if (!Array.isArray(npath) || !npath.length) return

	let idx = this.indexOf(npath[0])
	if (idx !== -1) {
	    let parent = this.kids[idx]
	    // RECURSION!
	    parent.insert(npath.slice(1), payload)
	    return
	}

	let parent = this
	let kid = new exports.TNode(npath[0],
				    npath.length === 1 ? payload : null)
	parent.kid_add(kid)
	// RECURSION!
	kid.insert(npath.slice(1), payload)
    }

    // Side effect: modifies tnode parent
    kid_add(tnode) {
	if (!tnode) return false
	if (Array.isArray(tnode)) {
	    let arr = tnode.filter( tn => this.indexOf(tn.name) === -1)
	    if (!arr.length) return false
	    arr.map(tn => tn.parent = this)
	    this.kids = this.kids.concat(arr)
	} else {
	    if (this.indexOf(tnode.name) !== -1) return false
	    tnode.parent = this
	    // is this faster than concat()?
	    this.kids.push(tnode)
	}
	return true
    }

    // in place
    sort(order) {
	if (!order) order = "descending"
	return this.kids.sort(exports.TNode.SortOrder[order])
    }

    // in place
    sort_deep(order) {
	if (!order) order = "descending"
	let mysort = function(tnode, level, args) {
	    tnode.sort(order)
	    return { partial: true }
	}
	let msgbus = {}
	this.walk(mysort, 0, [], msgbus)
	this.sort(order)
    }

    // callback_args -- an array
    walk(callback, level, callback_args, msgbus) {
	for (let idx = 0; idx < this.kids.length; ++idx) {

	    let r = callback(this.kids[idx], level, callback_args)
	    if (r) {
		if (r.final) {
		    msgbus.exit = r.final
//		    console.log("*** ABORT")
		    return msgbus.exit
		}

		// RECURSION!
		this.kids[idx].walk(callback, level+1, callback_args, msgbus)
		if (msgbus.exit) return msgbus.exit
	    }
	}
    }

    find(/* arguments */) {
	var args = Array.prototype.slice.call(arguments)
	if (!args.length) return null

	let times_left = args.length
	let search = function(tnode, level, args) {
//	    console.log(`${level}: ${args[level]} ? ${tnode.name}`)
	    let r = {}
	    if (args[level] === tnode.name) {
		times_left--
		r.partial = true
	    }
//	    console.log(tnode.name, args, r, times_left)
//	    console.log('---')

	    if (times_left === 0) {
//		console.log("*** FOUND")
		r.final = tnode
		return r
	    }

	    return r.partial ? r : null
	}
	let msgbus = {}
	return this.walk(search, 0, args, msgbus) || null
    }

    ascendant_of(tnode) {
	let parent = this.parent
	if (parent === tnode.parent) return false // siblings

	while (parent) {
	    if (parent === tnode) return true
	    parent = parent.parent
	}
	return false
    }
}

exports.TNode.SortOrder = {
    "ascending": (a, b) => a.name.localeCompare(b.name),
    "descending": (a, b) => b.name.localeCompare(a.name)
}


// reorganize posts into a calendar
exports.cal = function(data) {
    let root = new exports.TNode("root")
    data.index.posts.forEach( post => {
	root.insert([post.y, post.m, `${post.d}-${post.n}`], post)
    })
    return root
}
