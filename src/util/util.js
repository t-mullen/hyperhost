/*

Copyright (c) 2016 Thomas Mullen. All rights reserved.
MIT License

Utilities.

*/

var mimeTypes = require('./mimeTypes.json')

var base64 = {
  _keyStr: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',

  encode: function (input) {
    var output = '',
      chr1, chr2, chr3, enc1, enc2, enc3, enc4,
      i = 0

    input = base64._utf8_encode(input)

    while (i < input.length) {
      chr1 = input.charCodeAt(i++)
      chr2 = input.charCodeAt(i++)
      chr3 = input.charCodeAt(i++)

      enc1 = chr1 >> 2
      enc2 = ((chr1 & 3) << 4) | (chr2 >> 4)
      enc3 = ((chr2 & 15) << 2) | (chr3 >> 6)
      enc4 = chr3 & 63

      if (isNaN(chr2)) {
        enc3 = enc4 = 64
      } else if (isNaN(chr3)) {
        enc4 = 64
      }

      output = output +
                this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
                this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4)
    }
    return output
  },

    // private method for UTF-8 encoding
  _utf8_encode: function (string) {
    string = string.replace(/\r\n/g, '\n')

    var utftext = ''

    for (var n = 0; n < string.length; n++) {
      var c = string.charCodeAt(n)
      if (c < 128) {
        utftext += String.fromCharCode(c)
      } else if ((c > 127) && (c < 2048)) {
        utftext += String.fromCharCode((c >> 6) | 192)
                        + String.fromCharCode((c & 63) | 128)
      } else {
        utftext += String.fromCharCode((c >> 12) | 224);
        +String.fromCharCode(((c >> 6) & 63) | 128);
        +String.fromCharCode((c & 63) | 128)
      }
    }
    return utftext
  }
}

// Escapes a regex expression
module.exports.escapeRegex = function (str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&')
}

// Creates a dataURI from some data
module.exports.toDataURI = function (content, extension) {
  var prefix = 'data:' + mimeTypes[extension] + ';base64,'

  if (content.slice(0, 5) === 'data:') {
    return content // Likely alredy encoded
  }
  if (content.indexOf(prefix) !== -1) {
    return content // Likely to be already encoded
  }
  try {
    return prefix + base64.encode(content)
  } catch (err) {
    console.warn(err)
    try {
      return prefix + base64.encode(unescape(encodeURIComponent(content)))
    } catch (err) {
      console.warn(err)
      return ''
    }
  }
}

// Gets the extension of a file name
module.exports.nameToExtension = function (name) {
  var ext = name.split('.')
  ext = ext[ext.length - 1].toLowerCase()
  return ext
}

// Check if array contains an item
module.exports.contains = function (array, item) {
  return array.indexOf(item) !== -1
}

// Deeply sets a nested object/array tree, creating ancestors where they are missing
// Ancestors is an array of names that lead from root to the target object
module.exports.deepSetTree = function (tempObj, value, ancestors) {
  for (var i = 0; i < ancestors.length; i++) {
    var found = false
    for (var i2 = 0; i2 < tempObj.nodes.length; i2++) { // Locate the ancestors
      if (tempObj.nodes[i2].name === ancestors[i]) {
        tempObj = tempObj.nodes[i2]
        found = true
        break
      }
    }
    if (!found) {
      tempObj.nodes.push({ // Create the ancestor if it doesn't exits
        name: ancestors[i],
        nodes: []
      })
      for (var i2 = 0; i2 < tempObj.nodes.length; i2++) { // Get the reference of the new object
        if (tempObj.nodes[i2].name === ancestors[i]) {
          tempObj = tempObj.nodes[i2]
          break
        }
      }
    }
  }
  tempObj.nodes.push(value)
}

// Injects an array of urls as scripts into the document
module.exports.injectScripts = function (scripts, mappingObject, callback) {
  var remaining = scripts.length

  function loadScript (i) {
    if (!scripts[i]) {
      callback()
      return
    }
    var script = document.createElement('script')
    script.type = 'text/javascript'

    if (script.readyState) { // IE
      script.onreadystatechange = function () {
        if (script.readyState === 'loaded' || script.readyState === 'complete') {
          script.onreadystatechange = null
          remaining--
          if (remaining === 0) {
            callback()
          } else {
            if (i < scripts.length - 1) {
              loadScript(i + 1)
            }
          }
        }
      }
    } else { // Others
      script.onload = function () {
        remaining--
        if (remaining === 0) {
          callback()
        } else {
          loadScript(i + 1)
        }
      }
    }

    script.src = mappingObject[scripts[i]]
    document.getElementsByTagName('head')[0].appendChild(script)
  }
  loadScript(0)
}

// Basic ajax call
module.exports.ajax = function (method, url, xOriginProxy, successCallback, errorCallback) {
  var xhr = new XMLHttpRequest()
  url = xOriginProxy + url
  xhr.open(method, url, true)
  xhr.onreadystatechange = function (e) {
    if (this.readyState === 4) {
      if (this.status >= 200 && this.status < 400) {
        if (successCallback && successCallback.constructor == Function) {
          return successCallback(this.responseText)
        }
      } else {
        if (errorCallback && errorCallback.constructor == Function) {
          return errorCallback(this.statusText)
        } else {
          console.error("Failed to get resource '" + url + "' Error: " + this.statusText)
        }
      }
    }
  }
  xhr.onerror = function (e) {
    if (errorCallback && errorCallback.constructor == Function) {
      return errorCallback(this.statusText)
    } else {
      console.error('Failed to get resource. Error: ' + this.statusText)
    }
  }
  xhr.send(null)
}

// Ajax-es an array of urls, only returning when all have been loaded
module.exports.ajaxMulti = function (arr, successCallback, errorCallback) {
  var result = []
  var remaining = arr.length
  for (var i = 0; i < arr.length; i++) {
    ajax(arr[i],
            function (data) {
              result[i] = data
              remaining--
              if (remaining === 0) {
                successCallback(result)
              }
            }, errorCallback)
  }
}

// dash-case to camelCase
module.exports.camelize = function (str) {
  return str.replace(/-([a-z])/g, function (g) {
    return g[1].toUpperCase()
  })
}
