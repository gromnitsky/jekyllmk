'use strict';

let assert = require('assert')
let fs = require('fs')
let util = require('util')

let index = require('../lib/index')
let tags = require('../lib/tags')

let out = process.env.MOCHA_OUT
if (!out) throw new Error('no MOCHA_OUT env var')

suite('tags', function() {

    setup(function() {
	let json = JSON.parse(fs.readFileSync([out, 'index.json'].join('/')).toString())
	let data = {index: json}
//	index.postproc(data)
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

})
