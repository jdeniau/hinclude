/*
hinclude.js -- HTML Includes (version 0.9.5)

Copyright (c) 2005-2014 Mark Nottingham <mnot@mnot.net>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

------------------------------------------------------------------------------

See http://mnot.github.com/hinclude/ for documentation.
*/

/*jslint indent: 2, browser: true, vars: true, nomen: true */
/*global alert, ActiveXObject */

var hinclude;

(function () {

  "use strict";

  hinclude = {
    classprefix: "include_",

    trigger_event: function (target, type, event) {
        var doc = document;
        if (doc.createEvent) {
            event = doc.createEvent("Event");
            event.initEvent(type, true, true);
            target.dispatchEvent(event);
        } else {
            event = doc.createEventObject();
            target.fireEvent('on' + type, event);
        }
    },

    call_user_callback: function (element, req, user_cb) {
      if (typeof user_cb === 'string') {
        new Function('element', user_cb+'(element)')(element);
      }
    },

    create_fragment: function (htmlText) {
      var fragment = document.createDocumentFragment();
      var parentNode = document.createElement('div');
      parentNode.innerHTML = htmlText;
      while (parentNode.firstChild) {
        fragment.appendChild(parentNode.firstChild);
      }
      return fragment;
    },

    replace_html: function (element, htmlText) {
      while (element.firstChild) {
        element.removeChild(element.firstChild);
      }
      element.appendChild(this.create_fragment(htmlText));
    },

    set_content_async: function (element, req, user_cb) {
      if (req.status === 200 || req.status === 304) {
        this.replace_html(element, req.responseText);
        this.call_user_callback(element, req, user_cb);
      }
      element.className = hinclude.classprefix + req.status;
      hinclude.trigger_event(document, 'hinclude_content_set');
    },

    buffer: [],
    set_content_buffered: function (element, req, user_cb) {
      hinclude.buffer.push([element, req, user_cb]);
      hinclude.outstanding -= 1;
      if (hinclude.outstanding === 0) {
        hinclude.show_buffered_content();
      }
    },

    show_buffered_content: function () {
      var include;
      while (hinclude.buffer.length > 0) {
        this.set_content_async.apply(this, hinclude.buffer.pop());
      }
    },

    outstanding: 0,
    includes: [],
    run: function (doc) {
      doc = doc||document;
      var i = 0;
      var mode = this.get_meta("include_mode", "buffered");
      var callback;
      this.includes = doc.getElementsByTagName("hx:include");
      if (this.includes.length === 0) { // remove ns for IE
        this.includes = doc.getElementsByTagName("include");
      }
      if (mode === "async") {
        callback = this.set_content_async;
      } else if (mode === "buffered") {
        callback = this.set_content_buffered;
        var timeout = this.get_meta("include_timeout", 2.5) * 1000;
        setTimeout(function(){
          hinclude.show_buffered_content.apply(hinclude);
        }, timeout);
      }

      for (i; i < this.includes.length; i += 1) {
        this.include(this.includes[i], this.getUrl(this.includes[i]), this.includes[i].getAttribute("media"), callback, this.includes[i].getAttribute("data-callback"));
      }
    },

    getUrl: function(element) {
      var callback = element.getAttribute('data-src-generator');
      if (callback && typeof window[callback] == 'function') {
        return window[callback]();
      }

      return element.getAttribute("src");
    },

    include: function (element, url, media, incl_cb, user_cb) {
      if (media && window.matchMedia && !window.matchMedia(media).matches) {
        return;
      }
      var scheme = url.substring(0, url.indexOf(":"));
      if (scheme.toLowerCase() === "data") { // just text/plain for now
        var data = decodeURIComponent(url.substring(url.indexOf(",") + 1, url.length));
        element.innerHTML = data;
      } else {
        var req = true;
        // Test if the element has a beforeload statement
        var beforeload = element.getAttribute('beforeload');
        if (beforeload && typeof window[beforeload] == 'function' && window[beforeload]() === false) {
          req = false;
        }

        // test if the element has a claimed cookie
        var cookie_value = element.getAttribute("cookie");
        var hasCookie = false;
        if (cookie_value) {
          var cookie_list = cookie_value.split('||');
          var i;
          for (i in cookie_list) {
            var cookieValue = cookie_list[i].trim();
            var cookieCondition = true;
            if (cookieValue.indexOf('!') == 0) {
              cookieValue = cookieValue.slice(1);
              cookieCondition = false;
            }
            if (cookie_list.hasOwnProperty(i) && (cookieCondition == this.has_cookie(cookieValue))) {
              hasCookie = true;
              break;
            }
          }
        }
        if (!req || (cookie_value && !hasCookie)) {
          req = false;
        } else {
          if (window.XMLHttpRequest) {
            try {
              req = new XMLHttpRequest();
            } catch (e1) {
              req = false;
            }
          } else if (window.ActiveXObject) {
            try {
              req = new ActiveXObject("Microsoft.XMLHTTP");
            } catch (e2) {
              req = false;
            }
          }
        }
        if (req) {
          this.outstanding += 1;
          req.onreadystatechange = function () {
            if (req.readyState === 4) {
              if (typeof incl_cb === 'function') {
                incl_cb(element, req, user_cb);
              }
            }
          };
          try {
            req.open("GET", url, true);
            req.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            req.send("");
          } catch (e3) {
            this.outstanding -= 1;
            alert("Include error: " + url + " (" + e3 + ")");
          }
        }
      }
    },

    refresh: function (element_id) {
      var i = 0;
      var callback = this.set_content_buffered;
      for (i; i < this.includes.length; i += 1) {
        if (this.includes[i].getAttribute("id") === element_id) {
          this.include(this.includes[i], this.getUrl(this.includes[i]), callback);
        }
      }
    },

    get_meta: function (name, value_default) {
      var m = 0;
      var metas = document.getElementsByTagName("meta");
      var meta_name;
      for (m; m < metas.length; m += 1) {
        meta_name = metas[m].getAttribute("name");
        if (meta_name === name) {
          return metas[m].getAttribute("content");
        }
      }
      return value_default;
    },

    has_cookie: function (name) {
      var dc = '; ' + document.cookie + ';';
      var prefix = "; " + name + "=";
      var begin = dc.indexOf(prefix);

      // begin === -1 means that the key is not found in the cookie string
      if (begin === -1) {
        return false;
      }
      // test if the cookie is empty
      // Example, "test" cookie is empty will store : "[...]; test=;[...]" in the cookie string
      begin = dc.indexOf(prefix + ';');
      return (begin === -1);
    },

    /*
     * (c)2006 Dean Edwards/Matthias Miller/John Resig
     * Special thanks to Dan Webb's domready.js Prototype extension
     * and Simon Willison's addLoadEvent
     *
     * For more info, see:
     * http://dean.edwards.name/weblog/2006/06/again/
     *
     * Thrown together by Jesse Skinner (http://www.thefutureoftheweb.com/)
     */
    addDOMLoadEvent: function (func) {
      if (!window.__load_events) {
        var init = function () {
          var i = 0;
          // quit if this function has already been called
          if (hinclude.addDOMLoadEvent.done) {return; }
          hinclude.addDOMLoadEvent.done = true;
          if (window.__load_timer) {
            clearInterval(window.__load_timer);
            window.__load_timer = null;
          }
          for (i; i < window.__load_events.length; i += 1) {
            window.__load_events[i]();
          }
          window.__load_events = null;
          // clean up the __ie_onload event
          /*@cc_on
          document.getElementById("__ie_onload").onreadystatechange = "";
          @*/
        };
        // for Mozilla/Opera9
        if (document.addEventListener) {
          document.addEventListener("DOMContentLoaded", init, false);
        }
        // for Internet Explorer
        /*@cc_on
        document.write(
          "<scr"
            + "ipt id=__ie_onload defer src='//:'><\/scr"
            + "ipt>"
        );
        var script = document.getElementById("__ie_onload");
        script.onreadystatechange = function () {
          if (this.readyState === "complete") {
            init(); // call the onload handler
          }
        };
        @*/
        // for Safari
        if (/WebKit/i.test(navigator.userAgent)) { // sniff
          window.__load_timer = setInterval(function () {
            if (/loaded|complete/.test(document.readyState)) {
              init();
            }
          }, 10);
        }
        // for other browsers
        window.onload = init;
        window.__load_events = [];
      }
      window.__load_events.push(func);
    }
  };

  hinclude.addDOMLoadEvent(function () { hinclude.run(); });

}());

if (typeof module === 'object' && module.exports) {
  module.exports = hinclude;
}
