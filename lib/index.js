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
//		console.error('pmonth %s: %s === %s', mi, cal[yi].months[mi].month, month)
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
