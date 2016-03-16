'use strict';

let assert = require('assert')
let fs = require('fs')
let util = require('util')

let out = process.env.MOCHA_OUT
if (!out) throw new Error('no MOCHA_OUT env var')

// a mock that ran amok
global.ng = {
    core: {
	forwardRef: function() {},
	Component: function() { return {Class: function() {}} }
    },
    router: {}
}

let index = require('../lib/index')
let tags = require('../lib/tags')


suite('tags', function() {

    setup(function() {
	let json = JSON.parse(fs.readFileSync([out, 'index.json'].join('/')).toString())
	let data = {index: json}
	index.postproc(data)
	this.data = data
    })

    test('parse_query', function() {
	assert.deepEqual({inc:[],exc:[]}, tags.parse_query())
	assert.deepEqual({inc:[],exc:[]}, tags.parse_query("   "))

	assert.deepEqual({inc: ["1 2","3 4"], exc: []},
			 tags.parse_query(" 1 2, 3  4  "))
	assert.deepEqual({inc: ["1 2"], exc: []}, tags.parse_query(" 1 2,   "))
	assert.deepEqual({inc:[],exc:[]}, tags.parse_query(" ,   "))

	assert.deepEqual({inc: ["1 2"], exc: ["3 4"]},
			 tags.parse_query(" 1  2, -3  4  "))
    })

    test('match_exact', function() {
	assert.deepEqual([6,9], tags.match_exact(this.data, "image"))
	assert.deepEqual([4], tags.match_exact(this.data, "Tomasz Zbrożek"))
	assert.deepEqual([3,4], tags.match_exact(this.data, "Федор Чельцов,Tomasz Zbrożek"))
	assert.deepEqual([3], tags.match_exact(this.data, "Федор Чельцов, -Tomasz Zbrożek"))

	let r1 = tags.match_exact(this.data, "Тарас Шевченко")
	let r2 = tags.match_exact(this.data, "Тарас Шевченко, -image")
	assert.equal(9, r1.length)
	assert.equal(7, r2.length)
    })
})
