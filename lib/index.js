'use strict';

let num_comp = {
    descending: (a, b) => b - a,
    ascending: (a, b) => a - b
}

// makes sense only for posts of the same month
let num_comp_post = {
    descending: (a, b) => {
	if (b.d !== a.d) return b.d - a.d
	return b.n.localeCompare(a.n)
    },
    ascending: (a, b) => {
	if (a.d !== b.d) return a.d - b.d
	return a.n.localeCompare(b.n)
    }
}

// modifies data!
exports.postproc =  function(data, sort) {
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

    data.cal = exports.calendar(data, sort || "descending")
}

// reorganize posts into a calendar
exports.calendar = function(data, sort_order) {
    let years = {}
    data.index.posts.forEach( post => {
	if (post.y in years) {
	    years[post.y].push(post)
	} else {
	    years[post.y] = [post]
	}
    })

    let calendar = []
    Object.keys(years).sort(num_comp[sort_order]).forEach( (year, idx) => {
	let months = {}
	years[year].forEach( post => {
	    if (post.m in months) {
		months[post.m].push(post)
	    } else {
		months[post.m] = [post]
	    }
	})

	calendar[idx] = { year }
	Object.keys(months).sort(num_comp[sort_order]).forEach( key => {
	    calendar[idx].months = calendar[idx].months || []
	    calendar[idx].months.push({
		month: key,
		posts: months[key].sort(num_comp_post[sort_order])
	    })
	})
    })

    return calendar
}

exports.find = function(cal, year, month, day, name) {
//    console.log(cal, year, month, day, name)
    if (!(cal && year && month && day && name)) return null

    let pyear = null
    for (let yi = 0; yi < cal.length; ++yi) {
	if (cal[yi].year === year) {
//	    console.error('pyear %s: %s === %s', yi, cal[yi].year, year)
	    pyear = yi

	    let pmonth = null
	    for (let mi = 0; mi < cal[yi].months.length; ++mi) {
		if (cal[yi].months[mi].month === month) {
//		    console.error('pmonth %s: %s === %s', mi, cal[yi].months[mi].month, month)
		    pmonth = mi

		    let ppost = null
		    for (let pi = 0; pi < cal[yi].months[mi].posts.length; ++pi) {
			let post = cal[yi].months[mi].posts[pi]
			//			console.error(post)
			if (post.d === day && post.n === name) return {
			    pyear: pyear,
			    pmonth: pmonth,
			    ppost: pi
			}
		    }

		    return null
		}
	    }

	    return null
	}
    }

    return null
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
}

exports.TNode.SortOrder = {
    "ascending": (a, b) => a.name.localeCompare(b.name),
    "descending": (a, b) => b.name.localeCompare(a.name)
}


exports.cal = function(data) {
    let root = new exports.TNode("root")
    data.index.posts.forEach( post => {
	root.insert([post.y, post.m, `${post.d}-${post.n}`], post)
    })
    return root
}
