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
