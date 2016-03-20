'use strict';

let fm = require('front-matter')
let marked = require('marked')

// requires DOM
exports.md2html = function(str, prefix) {
    if (!(str && prefix)) return ''
    let html = marked(str)
    let dp = new DOMParser()
    let doc = dp.parseFromString(html, 'text/html')

    let fix = function(tag, attr) {
	[].forEach.call(doc.querySelectorAll(tag), function(elm) {
	    let url = elm.getAttribute(attr)
	    if (!url) return
	    if (url.match(/^[a-z]+:/)) return
	    elm.setAttribute(attr, `${prefix}/${url}`)
	})
    }

    fix('img', 'src')
    fix('a', 'href')

    html = doc.querySelector('body').innerHTML

    return html
}

let tags_normalize = function(arr) {
    return arr.map( val => val.replace(/\s+/g, ' ').trim())
	.filter( val => val.length)
	.filter( (val, idx, self) => self.indexOf(val) === idx)
}

exports.parse = function(str) {
    if (!str) return {}

    let r = fm(str)
    return {
	_fm: r,
	subject: r.attributes.subject || '(No Subject)',
	authors: [].concat(r.attributes.authors || 'Anonymous'),
	tags: tags_normalize([].concat(r.attributes.tags || 'untagged')
			     .map(val => val.toLowerCase())),
	time: r.attributes.time	// FIXME: parse the value
    }
}
