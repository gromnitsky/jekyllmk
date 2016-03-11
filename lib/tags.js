'use strict';

exports.count = function(data, prop, index_prop) {
    let tags = []
    data.index[prop].forEach( name => {
	tags.push({ name, count: 0 })
    })

    data.index.posts.forEach( (post, idx) => {
	post[index_prop].forEach(ip => {
	    tags[ip].count++
	})
    })

    return tags
}

exports.parse_query = function(str) {
    let inc = []
    let exc = []
    if (!str || str.match(/^\s*$/)) return { inc, exc }

    let all = str.split(",").map( val => val.replace(/\s+/g, ' ').trim())
	.filter( val => val.length)
    inc = all.filter( val => val.match(/^[^-]/))
    exc = all.filter( val => val.match(/^-/)).map(val => val.replace(/^-/, ''))

    return { inc, exc }
}

exports.match_exact = function(data, query) {
    let qry = exports.parse_query(query)
    if (!qry.inc) return []

    let inc = []
    let exc = {}
    data.index.posts.forEach( (post, idx) => {
	post.a.forEach( author => {
	    if (qry.inc.indexOf(data.index.authors[author].name) !== -1)
		inc.push(idx)
	    if (qry.exc.indexOf(data.index.authors[author].name) !== -1)
		exc[idx] = true
	})
	post.t.forEach( tag => {
	    if (qry.inc.indexOf(data.index.tags[tag].name) !== -1) inc.push(idx)
	    if (qry.exc.indexOf(data.index.tags[tag].name) !== -1)
		exc[idx] = true
	})
    })

    inc = inc.filter( (val, idx, self) => self.indexOf(val) === idx)
    return inc.filter( val => !exc[val])
}
