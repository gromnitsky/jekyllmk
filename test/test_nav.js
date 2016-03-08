'use strict';

let assert = require('assert')
let fs = require('fs')
let util = require('util')

let index = require('../lib/index')

let out = process.env.MOCHA_OUT
if (!out) throw new Error('no MOCHA_OUT env var')

suite('nav', function() {

    setup(function() {
	let json = JSON.parse(fs.readFileSync([out, 'index.json'].join('/')).toString())
	let data = {index: json}
	index.postproc(data)
	this.cal = data.cal
	console.log(util.inspect(this.cal, { showHidden: false, depth: null }))
    })

    test('calendar entry find', function() {
	assert.equal(null, index.find())

	assert.deepStrictEqual({
	    pyear: 0,
	    pmonth: 4,
	    ppost: 0
	}, index.find(this.cal, '1857', '12', '10', '1'))

	assert.equal(null, index.find(this.cal, '1857', '12', '10', 'omglol'))
    })
})
