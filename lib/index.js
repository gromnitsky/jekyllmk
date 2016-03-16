'use strict';

let tags = require('./tags')
let tw = require('angular2-treeview')

// modifies data!
exports.postproc =  function(data, sort_order) {
    data.index.authors = tags.count(data, "authors", "a")
    data.index.tags = tags.count(data, "tags", "t")

    data.cal = exports.cal(data)
    data.cal.sort_deep(sort_order)
}

// reorganize posts into a calendar
exports.cal = function(data) {
    let root = new tw.TNode("root")
    data.index.posts.forEach( post => {
	root.insert([post.y, post.m, `${post.d}-${post.n}`], post)
    })
    return root
}
