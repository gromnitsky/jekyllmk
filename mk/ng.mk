ng.self.dir := $(dir $(realpath $(lastword $(MAKEFILE_LIST))))

ng.dest ?= angular.browserify.js
ng.template := $(ng.self.dir)/ng.m4

# remove '-m' if a browser has troubles w/ the minified output
NG_UGLIFYJS_OPT := --screw-ie8 -m -c warnings=false

PHONY: ng-compile
ng-compile:

# in a production build we need to minify the angular bundle, thus we
# make a bundle w/ .es5 extension which is later on is automatically
# minified by uglifyjs into a usual .js.
ng.dest.inter := $(ng.dest)
ifeq ($(NODE_ENV), production)
ng.dest.inter := $(addsuffix .es5, $(basename $(ng.dest)))
.INTERMEDIATE: $(ng.dest.inter)

$(ng.dest): %.js: %.es5
	node_modules/.bin/uglifyjs $(NG_UGLIFYJS_OPT) -o $@ -- $<
endif

$(ng.dest.inter): $(ng.template)
	@mkdir -p $(dir $@)
	m4 -D NODE_ENV=$(NODE_ENV) $< | node_modules/.bin/browserify - $(NG_BROWSERIFY_OPT) -s ng -o $@


ng.compile := $(ng.dest)
ng-compile: $(ng.compile)
