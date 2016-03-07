'use strict';

let fm = require('front-matter')
let marked = require('marked')

exports.url_fix = function(html, params) {
    if (!html) return ''
    // TODO: <a>
    return html.replace(/(<\s*img\s+src=['"])([^'"]+?)/igm,
			`$1${params.year}/${params.month}/${params.day}/$2`)
}

exports.md2html = function(str, params) {
    if (!(str && params)) return ''
    // FIXME: replace after rendering
    return exports.url_fix(marked(str), params)
}

exports.parse = function(str) {
    if (!str) return {}

    let r = fm(str)
    return {
	_fm: r,
	subject: r.attributes.subject || '(No Subject)',
	authors: [].concat(r.attributes.authors || 'Anonymous'),
	tags: [].concat(r.attributes.tags || 'untagged'),
	time: r.attributes.time	// FIXME: parse the value
    }
}
