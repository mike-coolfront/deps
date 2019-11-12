const assert = require('chai').assert
const deps = require('../index.js')
const _ = require('lodash')
const sinon = require('sinon')
describe("deps core functionality - ", function(){
  let sandbox
  beforeEach(function(){
    sandbox = sinon.createSandbox()
  })
  afterEach(function(){
    sandbox.restore()
  })

  it("finds only package.json files", async function(){
    let files = await deps.getPackagesAsync(__dirname+"/example")
    assert.strictEqual(files.length, 5)
  })

  it("loads package objects in dep order", async function(){
    let packages = await deps.loadPackagesAsync(__dirname+"/example")
    assert.strictEqual(packages.length, 5)

    // console.log(JSON.stringify(_.map(packages, function(v,k){ return v.package.name })))
    assert.strictEqual(packages[0].package.name, 'u')
    assert.strictEqual(packages[1].package.name, 'a')
    assert.strictEqual(packages[2].package.name, 'b')

    //these 2 are peers and could flip flop
    assert.strictEqual(packages[3].package.name, 'aa')
    assert.strictEqual(packages[4].package.name, 'c')

  })

  it("will throw circular deps error", async function(){
    try{
      let packages = await deps.loadPackagesAsync(__dirname+"/example-circular")
      throw new Error("should have thrown an error")
    } catch(err){
      assert.include(err.message, "circular dependency")
      return
    }
  })

  it("will load in dep order with different starting order", async function(){
    sandbox.stub(deps, 'organize').callsFake(function(packages){
      let reOrder = []
      reOrder.push(_.find(packages, function(v,k){ return v.package.name === 'b'}))
      reOrder.push(_.find(packages, function(v,k){ return v.package.name === 'c'}))
      reOrder.push(_.find(packages, function(v,k){ return v.package.name === 'a'}))
      reOrder.push(_.find(packages, function(v,k){ return v.package.name === 'u'}))
      reOrder.push(_.find(packages, function(v,k){ return v.package.name === 'aa'}))
      return reOrder
    })

    let packages = await deps.loadPackagesAsync(__dirname+"/example")
    assert.strictEqual(packages.length, 5)

    assert.strictEqual(packages[0].package.name, 'u')
    assert.strictEqual(packages[1].package.name, 'a')
    assert.strictEqual(packages[2].package.name, 'b')
    assert.strictEqual(packages[3].package.name, 'aa')
    assert.strictEqual(packages[4].package.name, 'c')
  })



  it("will load in dep order with high order deps 1st", async function(){
    sandbox.stub(deps, 'organize').callsFake(function(packages){
      let reOrder = []
      reOrder.push(_.find(packages, function(v,k){ return v.package.name === 'aa'}))
      reOrder.push(_.find(packages, function(v,k){ return v.package.name === 'c'}))
      reOrder.push(_.find(packages, function(v,k){ return v.package.name === 'u'}))
      reOrder.push(_.find(packages, function(v,k){ return v.package.name === 'a'}))
      reOrder.push(_.find(packages, function(v,k){ return v.package.name === 'b'}))
      return reOrder
    })

    let packages = await deps.loadPackagesAsync(__dirname+"/example")
    assert.strictEqual(packages.length, 5)

    assert.strictEqual(packages[0].package.name, 'a')
    assert.strictEqual(packages[1].package.name, 'b')
    assert.strictEqual(packages[2].package.name, 'c')
    assert.strictEqual(packages[3].package.name, 'u') //u is only used by aa.. and when used by a module in the list.. we place it before it.
    assert.strictEqual(packages[4].package.name, 'aa')
  })


  it("will load in dep order with low order deps 1st", async function(){
    sandbox.stub(deps, 'organize').callsFake(function(packages){
      let reOrder = []
      reOrder.push(_.find(packages, function(v,k){ return v.package.name === 'a'}))
      reOrder.push(_.find(packages, function(v,k){ return v.package.name === 'b'}))
      reOrder.push(_.find(packages, function(v,k){ return v.package.name === 'u'}))
      reOrder.push(_.find(packages, function(v,k){ return v.package.name === 'c'}))
      reOrder.push(_.find(packages, function(v,k){ return v.package.name === 'aa'}))
      return reOrder
    })

    let packages = await deps.loadPackagesAsync(__dirname+"/example")
    assert.strictEqual(packages.length, 5)

    assert.strictEqual(packages[0].package.name, 'u')
    assert.strictEqual(packages[1].package.name, 'a')
    assert.strictEqual(packages[2].package.name, 'b')
    assert.strictEqual(packages[3].package.name, 'aa') //aa is inserted here because when we get to the end. we favor inserting just after the last deps we have in the list. which was b
    assert.strictEqual(packages[4].package.name, 'c')
  })

  it("will load in dep order with high order / low order inter mixed", async function(){
    sandbox.stub(deps, 'organize').callsFake(function(packages){
      let reOrder = []
      reOrder.push(_.find(packages, function(v,k){ return v.package.name === 'a'}))
      reOrder.push(_.find(packages, function(v,k){ return v.package.name === 'aa'}))
      reOrder.push(_.find(packages, function(v,k){ return v.package.name === 'u'}))
      reOrder.push(_.find(packages, function(v,k){ return v.package.name === 'c'}))
      reOrder.push(_.find(packages, function(v,k){ return v.package.name === 'b'}))
      return reOrder
    })

    let packages = await deps.loadPackagesAsync(__dirname+"/example")
    assert.strictEqual(packages.length, 5)

    assert.strictEqual(packages[0].package.name, 'a')
    assert.strictEqual(packages[1].package.name, 'b')
    assert.strictEqual(packages[2].package.name, 'c')
    assert.strictEqual(packages[3].package.name, 'u')
    assert.strictEqual(packages[4].package.name, 'aa')
  })


})