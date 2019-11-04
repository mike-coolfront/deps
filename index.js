'use strict';

const readdir = require('recursive-readdir')
const _ =       require('lodash')


module.exports = class Deps{

  /**
   * turns true if the given file objected and related stats object represent a situation where the file should be ignored.
   * @param {object} file
   * @param {object} stats
   * @returns {boolean} true if file should be ignored.
   */
  static ignore(file,stats){
    return (stats.isDirectory() && file.includes('node_modules')) || (! stats.isDirectory() && !file.match(/[/\\]{0,1}package\.json/))
  }

  /**
   * gets a list of files for each package.json file found in the target folder hierarchy.
   * @param {string} path - file system path to root folder to use in search for package.json files
   */
  static async getPackagesAsync(path){
    let files = await readdir(path, [function ignore(file, stats){
      let shouldIgnore = Deps.ignore(file, stats)
      return shouldIgnore
    }])

    return files
  }

  /**
   * return a sorted list of package objects with related file system path.
   * @param {string} path - file system path to root folder to use in search for package.json files
   * @returns {array} [{path:string, package:object}, ...]
   */
  static async loadPackagesAsync(path){
    let files = await Deps.getPackagesAsync(path)
    let packages = []
    for(let f = 0 ; f < files.length; f++){
      let file = files[f]
      packages.push({ path: file, package: require(file)  }  )
    }

    let lastSort = []
    let newSort = packages.slice(0)
    let lastSortId = ""
    let newSortId = ""
    do{
      lastSort = newSort.slice(0)

      //apply dep analysis to sort list.
      newSort.sort( function(a, b){

        let isBinADeps = _.find(a.package.dependencies, function(val,key){
          return key === b.package.name
        })

        isBinADeps = isBinADeps || _.find(a.package.devDependencies, function(val, key){
          return key === b.package.name
        })


        let isAInBDeps = _.find(b.package.dependencies, function(val, key){
          return key === a.package.name
        })

        isAInBDeps = isAInBDeps || _.find(b.package.devDependencies, function(val, key){
          return key === a.package.name
        })

        if(isAInBDeps && isBinADeps){
          throw new Error("circular dependency")
        }

        if(isBinADeps){
          return 1
        }


        if(isAInBDeps){
          return -1
        }

        if(a.package.name > b.package.name){
          return 1
        }

        if(a.package.name <= b.package.name){
          return -1
        }

        return 0

      })

      lastSortId = JSON.stringify(_.map(lastSort, function(o){ return (o && o.package) ? o.package.name : ""; }))
      newSortId = JSON.stringify(_.map(newSort, function(o){ return (o && o.package) ? o.package.name : ""; }))

    } while(newSortId != lastSortId);


    return newSort
  }

}
