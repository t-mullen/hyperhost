/*
Copyright (c) 2016 Thomas Mullen. All rights reserved.
MIT License

Injects encoded assets and subviews into views.
*/

const util = require('../util/util.js')

function Compiler () {
  'use strict'

    // Inject assets into views
  const injectAssets = function injectAssets (views, assets) {
      let i, i2, regex
      i = views.length
      while (i--) {
        i2 = assets.length
        while (i2--) {
          if (views[i].isRoot) {
                    // Find instances of the path name and replace with encoded content
            regex = new RegExp('(.\/|)' + util.escapeRegex(assets[i2].old), 'g')
            views[i].content = views[i].content.replace(regex, assets[i2].new)
          } else if (views[i].extension === 'css') {
                    // Relaxes exact path matching for CSS files (only name match is required)
            regex = new RegExp('url\(([^)]*)(.\/|)' + util.escapeRegex(assets[i2].name) + '([^)]*)\)', 'g')
            views[i].content = views[i].content.replace(regex, 'url(' + assets[i2].new)
          } else {
                    /*
                    TODO: Support relative paths in more than just stylesheets.

                    Javascript may have many false matches.
                    Other types are completely unknown.
                    */
          }
        }
      }
    },

    // Inject subsviews into views
    injectViews = function injectViews (views) {
      let i, i2, regex, navScript

      i = views.length
      while (i--) {
        if (views[i].isInvalid) continue
        if (views[i].extension !== 'html') continue // Subviews only make sense for HTML

        i2 = views.length
        while (i2--) {
          if (views[i2].isInvalid) continue

          switch (views[i2].extension) {

            case 'css':
                        // External CSS files are replaced by embedded stylesheets
              regex = new RegExp("<link.*rel\\s*=\\s*[\"']stylesheet[\"'].*href\\s*=\\s*[\"'](.\/|)" + util.escapeRegex(views[i2].path) + "[\"'].*>", 'g')
              views[i].content = views[i].content.replace(regex, '<style>' + views[i2].content + '</style>')

              break

            case 'html':
                        // Links to internal HTML files are replaced via navigation scripts
              regex = new RegExp("href\\s*=\\s*['\"](.\/|)" + util.escapeRegex(views[i2].path) + "(#[^'\"]*['\"]|['\"])", 'g')

              navScript = `href='#' onclick="event.preventDefault();var parent=window.parent;var event = new CustomEvent('hypermessage', {detail: {type: 'navigate',path:'` + views[i2].path + `'}});parent.dispatchEvent(event)"`

              views[i].content = views[i].content.replace(regex, navScript)

              break

            default:
                        // TODO support other kinds of injectable views (are there any?)
              continue
          }
        }
      }
    },

    // Replaces hash links with scrolling scripts
    replaceHashLinks = function replaceHashLinks (views) {
      let i, i2, regex, regex2, regex3, matches, anchorID

      i = views.length
      while (i--) {
        if (views[i].isInvalid) continue
        if (views[i].extension !== 'html') continue

            // Replace hash links

            // Get all href attributes that begin with a hash
        regex = new RegExp("href\\s*=\\s*['\"](.\/|)\\s*#[^'\"]+['\"]", 'g')
        matches = views[i].content.match(regex)

        if (matches !== null) {
          i2 = matches.length
          while (i2--) {
                    // Get the actual name (without the #)
            regex2 = new RegExp("#[^'\"]+['\"]", 'g')
            anchorID = matches[i2].match(regex2)[0]
            anchorID = anchorID.substr(1, anchorID.length - 2)

                    // Get the full href again
            regex3 = new RegExp("href\\s*=\\s*['\"](.\/|)\\s*#" + util.escapeRegex(anchorID) + "['\"]", 'g')

                    // Inject a script to control scrolling
                    // TODO: Is this the best solution?
            views[i].content = views[i].content.replace(regex3, `href="#" onclick="event.preventDefault(); document.getElementById('` + anchorID + `').scrollIntoView();"`)
          }
        }
      }
    }

    /*
        Accepts an array of views and an array of pre-encoded assets.
        Compiles these views in-place.
        Returns the array of compiled views.
    */
  this.compile = function compile (views, assets) {
    injectAssets(views, assets)
    injectViews(views)
    replaceHashLinks(views)
    return views
  }
}

module.exports = Compiler
