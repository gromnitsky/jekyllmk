# jekyllmk

Despite its name, this is not a clone of Jekyll written in a
Make-based language. It's:

* an Angular2 app written in ES6, w/o decorators;
* a Make-based convoluted example of a build system for a JavaScript
  app.

The purpose of it is a stand-alone blog that can be served via any
static HTTP server. (When I write _a stand-alone_ I feel like I'm
being transferred into 2006.) A semi-live example
[exists](http://biterror.tk/blog/), that's hosted on a tuppeny openwrt
router.

Similarities between Jekyll & jekyllmk:

* a name.
* (can't think of anything else at the moment)

Differences between Jekyll & jekyllmk:

* GNU Make + nodejs, no Rubies whatsoever which may be sad for Ruby is
  still the pleasantest language in the world;
* json, not yaml in the configuration;
* only markdown is supported;
* you cannot use any variables from the front-matter in the post body;
* jekyllmk is an SPA that renders .md files on the fly;
* the most common blog widgets are pre-build like navigation, calendar,
  tag search;
* on each post modification/creation an index is rebuild (index is
  used by SPA for navigation);
* Atom feed is build automatically.

## Requirements

* Node.js 5.9.1
* Tcl/Tk 8.6.4 (for generation of a new site only)
* `npm i -g json`


## Quick start

0. Clone the repo.

1. Generate a new site

		$ cd $somedir

	Warning: a Tcl/Tk 8.6 is required for the next step. It'll
	show you a preferences dialog like this:

	![](https://3.bp.blogspot.com/-JKdQSLTrSPo/VvhWoRMSRnI/AAAAAAAAAjU/avxpwIlDngwrT3zmYRcyTrDSXZV_sPiaQ/s1600/jekyllmk-options-gui.png)

		$ make -f $repo/main.mk generate NEW=mysite

	A new dir `mysite` should appear. Build the site using the
	makefile from that dir:

		$ make -f mysite/Makefile

	Give `production/site` dir to any static HTTP server.

2. Write a new post

		$ cd $somedir
		$ make -f mysite/Makefile new
		$ make -f mysite/Makefile

3. Sync with a remote machine

	Edit `sync.dest` variable in `$mysite/Makefile`. Then

		$ cd $somedir
		$ make -f mysite/Makefile sync


## Bugs

* Angular2.
* Works only w/ modern browsers.

## TODO

* Extend tag search to post subjects as well.
* FTS. We can employ sqlite FTS & write a tiny server that responds w/
  an jekyllmk-index-like json.
* A default way to add third-party JS comments systems.

## License

MIT.
