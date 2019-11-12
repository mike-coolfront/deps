const assert = require('chai').assert
const deps = require('../index.js')
const _ = require('lodash')
describe("deps core functionality - ", function(){

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

    assert.strictEqual(packages[3].package.name, 'c')
    assert.strictEqual(packages[4].package.name, 'aa')

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


})