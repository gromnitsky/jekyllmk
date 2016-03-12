'use strict';

let fm = require('front-matter')
let marked = require('marked')

exports.url_fix = function(html, prefix) {
    if (!html) return ''
    // TODO: <a>
    return html.replace(/(<\s*img\s+src=['"])([^'"]+?)/igm,
			`$1${prefix}/$2`)
}

exports.md2html = function(str, prefix) {
    if (!(str && prefix)) return ''
    // FIXME: replace after rendering
    return exports.url_fix(marked(str), prefix)
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
