'use strict';

// modifies data!
exports.postproc =  function(data) {
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

    // reorganize posts into a calendar
    let years = {}
    data.index.posts.forEach( post => {
	if (post.y in years) {
	    years[post.y].push(post)
	} else {
	    years[post.y] = [post]
	}
    })

    let calendar = []
    Object.keys(years).sort().forEach( (year, idx) => {
	let months = {}
	years[year].forEach( post => {
	    if (post.m in months) {
		months[post.m].push(post)
	    } else {
		months[post.m] = [post]
	    }
	})

	calendar[idx] = { year }
	Object.keys(months).sort().forEach( key => {
	    calendar[idx].months = calendar[idx].months || []
	    calendar[idx].months.push({ month: key, posts: months[key]})
	})
    })

    data.cal = calendar
}
