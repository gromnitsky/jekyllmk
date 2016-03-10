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
	this.data = data
    })

    test('tnode sort flat', function() {
	let root = new index.TNode("root")
	root.kid_add([new index.TNode("apple"), new index.TNode("banana")])
	root.sort()
	assert.deepEqual(["banana", "apple"], root.kids.map(tn => tn.name))
	root.sort("ascending")
	assert.deepEqual(["apple", "banana"], root.kids.map(tn => tn.name))
    })

    test('tnode sort deep', function() {
	let cal = index.cal(this.data)
	cal.sort_deep()
//	console.log(util.inspect(cal, {depth: null}))
	assert.equal("23-1", cal.kids[1].kids[1].kids[0].name)
    })

    test('tnode find', function() {
	assert.equal(null, this.data.cal.find())
	assert.equal("15-2", this.data.cal.find('1857', '08', '15-2').name)
	assert.equal("13-1", this.data.cal.find('1858', '07', '13-1').name)
	assert.equal("12-1", this.data.cal.find('1857', '06', '12-1').name)
	assert.equal(null, this.data.cal.find('1858', '07', 'omglol'))
    })

})
