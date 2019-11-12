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

    Deps.rank(packages)
    packages = Deps.organize(packages)

    let lastSort = []
    let newSort = packages.slice(0)
    let lastSortId = ""
    let newSortId = ""

    let start = JSON.stringify(_.map(newSort, function(o){ return (o && o.package) ? o.package.name : ""; }))
    Deps.log(start)

      // do{
      lastSort = newSort.slice(0)

      //apply dep analysis to sort list.
      newSort = Deps.sort(newSort)
      lastSortId = JSON.stringify(_.map(lastSort, function(o){ return (o && o.package) ? o.package.name : ""; }))
      newSortId = JSON.stringify(_.map(newSort, function(o){ return (o && o.package) ? o.package.name+":"+o.rank : ""; }))
      Deps.log("newSort: "+ newSortId)

    return newSort
  }

  static organize(packages){
    packages.sort(function(a, b){
      let astr = a.package.name || ""
      let bstr = b.package.name || ""
      return astr.localeCompare(bstr) > 0 ? -1 : 1
    })
    return packages

  }

  /**
   *
   * @param {array} packages
   */
  static sort(packages){

    let newAr = []
    let list = packages.slice(0)

    //for every item in our list
    //pop the front for insert into our new list
    //with item to add, go through new list and determine position to insert.
    //If list is empty just add
    //starting from 0 -> end of list
    //if current new list item is used by our new item then iterate. keeping track of that position. i+1
    //if current new list item is a user of our new item then insert before the new list item.
    //if current new list item is neither then
    // if we are not at the end of the new list then continue on to the next new list item.
    // if we are at the end of the list
    //   if we are used by a new list item.. then insert in the tracked position.
    //   else
    //   add to the end if we our rank the current new list item.
    //   or add ot the front if we do not out rank.


    for(let a = 0; a < list.length; a++){
      let aitem = list[a]
      if(newAr.length === 0) {
        newAr.push(aitem)
        continue;
      }
      let insertAt =0
      Deps.log(JSON.stringify(_.map(newAr, function(o){ return (o && o.package) ? o.package.name+":"+o.rank : ""; })))

      for(let i = 0; i < newAr.length; i++){
        let newArItem = newAr[i]
        let doIUseYou = Deps.doesAUseB(aitem, newArItem)
        let doYouUseMe = Deps.doesAUseB(newArItem, aitem)
        if(doIUseYou && doYouUseMe){
          throw new Error("circular dependency")
        }

        if(doIUseYou){
          if(i === newAr.length -1){
            newAr.push(aitem)
            break;
          } else{
            insertAt = i+1
            continue
          }

        } else{
          if(doYouUseMe){
            let endChunk = newAr.splice(i)
            newAr.push(aitem)
            newAr = newAr.concat(endChunk)
            break;
          } else{

            if(i === newAr.length-1){
              if(insertAt > 0){
                //we use someone.. insert after them
                let endChunk = newAr.splice(insertAt)
                newAr.push(aitem)
                newAr = newAr.concat(endChunk)
                break;

              }
              else{
                //if we get here it just means no one in the current list uses us.
                //but a future add could.
                //In this case use our cross dep count "rank" to determine if we go to the end of the list(high order deps)
                //or the end (lower order deps)
                //Note that the resulting list will not be ordered by rank. you can see a lower rank ahead of another.
                if(aitem.rank > newArItem.rank){
                  newAr.push(aitem)
                }
                else{
                  newAr.unshift(aitem)
                }
                break;
              }
            }

            //at this point we'll just continue.
            //this should allow the current insertAt to be retain and for the
            //item to add "aitem" to be checked against the next item in the new list.

            continue;
          }
        }

      }
    }
    return newAr
  }

  static doesAUseB(a,b){
    let deps = _.extend({}, a.package.dependencies, a.package.devDependencies)
     return !!_.find(deps, function(val,key){
      return key === b.package.name
    })
  }

  static rank(packages){
    for(let a = 0; a < packages.length; a++){
      let packToRank = packages[a]
      packToRank.rank = 0
      for(let b = 0; b < packages.length; b++){
        let packB = packages[b]
        if(Deps.doesAUseB(packToRank,packB)){
          packToRank.rank++
        }
      }
    }
  }

  static log(msg){
    if(process.env.DEBUG && process.env.DEBUG.toLowerCase() === 'true'){
      Deps.log(msg)
    }
  }


}
