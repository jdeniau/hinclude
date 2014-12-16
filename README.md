# hinclude.js

<a href="http://travis-ci.org/mnot/hinclude"><img src="https://secure.travis-ci.org/mnot/hinclude.png?branch=master"></a>

Tired of regenerating HTML pages from templates? Want more from Web caches? **HInclude** makes one thing very easy; including other bits of HTML into your Web page, *using the browser*.

See [the demo page](http://mnot.github.com/hinclude/) for examples.



## The Basics

Hinclude adds one element to HTML; `hx:include`. When the browser encounters this element, it will include the document at the end of the `src` attribute.

To use it, first download a copy of the library and make it available on your site;

**Download**: [hinclude.js](https://github.com/mnot/hinclude/tags)

Now, in each page where you want to use HInclude, add a namespace declaration and a script tag to the top (*changing the script tag to point to your copy*):

```html
	<head>
		<script src="/lib/hinclude.js"
			type="text/javascript"></script>
  	...
```

Then, wherever you want to include something, do this:

```html
	<hx:include src="/other/document/here.html"></hx:include>
```

Where `/other/document/here.html` is the document you want to include. Note that because of limitations in the JavaScript security model, it **must** be on the same server.



## Rendering Mode

By default, each one is fetched in the background, and the page is updated only when they all are available.

This is bounded by a timeout, by default five seconds. After the timeout, HInclude will show what it has and keep on listening for the remaining responses. The timeout is configurable; e.g.,

```html
	<meta name="include_timeout" content="2" />
```

in the document's head section will set the timeout to two seconds.

However, it's also possible to have HIncludes become visible as they're available, using the `include_mode` meta element with a value of "async". While this shows the included content quicker, it may be less visually smooth.
For example, including this in the head section of your HTML:

```html
	<meta name="include_mode" content="async" />
```

will instruct HInclude to show included sections as soon as they're available.



## Default Content

Before the included content is displayed, anything inside the include element (hereafter, *default content*) will be visible. For example, this:

```html
	<hx:include src="new">
		this content will be overwritten by the included content
	</hx:include>
```

Since HTML instructs browsers to ignore elements they don&#8217;t understand, default content is also shown by those that have JavaScript turned off.

Of course, you can have no default content, in which case nothing will show up until the include is successful. Which brings up&#8230;



## Cookie Conditioning

The request could be conditioned to a cookie presence. The content will be dynamically fetch only if the user has a specific cookie.
For example, this could be useful to customize an interface only for authenticated users:

```html
	<hx:include src="authenticated" cookie="knownUser">
		this content will be overwritten, only if the user has a "knownUser" cookie.
	</hx:include>
```

You also can set up OR conditions with a "||" separator:

```html
	<hx:include src="authenticated" cookie="knownUser || regularUser">
		this content will be overwritten, only if the user has a "knownUser" or a "regularUser" cookie.
	</hx:include>
```

## Custom conditoning

The request could be conditionned using a custom statement using `beforeload` property 

```html
	<hx:include src="authenticated" beforeload="knownUser()">
		this content will be overwritten, only if the `knownUser` function return `true`.
	</hx:include>
```


## Advanced Error Handling

Hinclude will also show default content if there is some problem with loading the include.

That's adequate for typical applications. However, for debugging and other specialised purposes, HInclude allows you to control the display of errors through CSS, by changing the class of the include element based on the result of inclusion.

For example, if fetching the included URL results in a `404 Not Found` status code, the class of the include element will be changed to `include_404`. Likewise, a `500 Server Error` status code will result in the include element&#8217;s class being changed to `include_500`.



## JavaScript event

You can execute a JavaScript function when the content is loaded. This callback will be executed with the `hx:include` element as first parameter.

```html
	<hx:include src="new" data-callback="newCallback">
	</hx:include>
```

```js
	function newCallback(element) {
		alert(element.innerHTML);
		// Display the HInclude response content
	}
```

The JavaScript callback must be a function in the global scope. But you can wrap it in a exposed context.

```html
	<hx:include src="new" data-callback="hincludeCallback.new">
	</hx:include>
```

```js
	var hincludeCallback = {
		new: function (element) {
			alert(element.innerHTML);
			// Display the HInclude response
		}
	}
```



## JavaScript API

You can re-run hinclude, and resolve every `hx:include` element, when you want.

```js
	hinclude.run();
```

If you want to parse a small part of your HTML, for example for a content loaded in AJAX, you can give the root element as first parameter.

```html
	<hx:include src="content1"></hx:include>
	<div id="side">
		<hx:include src="content2"></hx:include>
	</div>
```

```js
	hinclude.run( document.getElementById('side') );
	// Only the content2 will call & load 
```
