.PHONY: compile
compile:

.DELETE_ON_ERROR:

pp-%:
	@echo "$(strip $($*))" | tr ' ' \\n

NODE_ENV ?= development
out := $(NODE_ENV)/site
out.tmp := $(NODE_ENV)
src := $(dir $(realpath $(lastword $(MAKEFILE_LIST))))

DATA := $(src)/test/data/shevchenko

mkdir = @mkdir -p $(dir $@)
define copy =
$(mkdir)
cp $< $@
endef


export NODE_PATH = $(realpath node_modules)
node_modules: package.json
	npm install --loglevel=error --depth=0 $(NPM_OPT)
	touch $@

package.json: $(src)/package.json
	cp $< $@

# automatically restart Make if there is no node_modules folder
include node_modules.mk
node_modules.mk: node_modules
	touch $@


data.src := $(shell find $(DATA) -type f)
data.dest := $(patsubst $(DATA)/%, $(out)/%, $(data.src))

$(data.dest): $(out)/%: $(DATA)/%
	$(copy)

compile: $(data.dest)


$(out)/index.json: $(data.dest)  node_modules.mk
	$(src)/index $(data.dest) > $@

compile: $(out)/index.json


npm.ext := .min.css .css .min.js .js
ifeq ($(NODE_ENV), development)
npm.ext := .css .dev.js .js
endif
npm.src := angular2/bundles/angular2-all.umd.js \
	angular2/bundles/angular2-polyfills.js \
	rxjs/bundles/Rx.umd.js \
	babel-polyfill/dist/polyfill.js \
	angular2-treeview/dist/treeview.css

npm-get-src = $(firstword $(foreach ext,$(npm.ext),\
	$(or $(wildcard node_modules/$(basename $(1))$(ext)))))
define npm-rule =
$(2): $$(call npm-get-src,$(1))
	$$(copy)
endef
npm.dest := $(foreach file, $(npm.src), $(out)/.npm/$(file))
# generate rules on the fly
$(foreach file, $(npm.src), \
	$(eval $(call npm-rule,$(file),$(out)/.npm/$(file))))

$(npm.dest): node_modules.mk
compile: $(npm.dest)


app.static.src := $(filter-out %.js, $(wildcard $(src)/app/*))
app.static.dest := $(patsubst $(src)/app/%, $(out)/%, $(app.static.src))

$(app.static.dest): $(out)/%: $(src)/app/%
	$(copy)

compile: $(app.static.dest)


# unconditional compilation
lib.js.src := $(wildcard $(src)/lib/*.js)
lib.js.dest := $(patsubst $(src)/%.js, $(out.tmp)/%.js, $(lib.js.src))

$(out.tmp)/%.js: $(src)/%.js
	$(mkdir)
	$(babel) --presets es2015 $(BABEL_OPT) $< -o $@

$(lib.js.dest): node_modules.mk
compile: $(lib.js.dest)


# browser-facing javascript
app.js.src := $(wildcard $(src)/app/*.js)
app.js.dest.ext := .es5
ifeq ($(NODE_ENV), development)
app.js.dest.ext := .js
endif
app.js.dest := $(patsubst $(src)/app/%.js, $(out)/%$(app.js.dest.ext), $(app.js.src))

babel := node_modules/.bin/babel
ifeq ($(NODE_ENV), development)
BABEL_OPT := -s inline
endif
$(out)/%$(app.js.dest.ext): $(src)/app/%.js
	$(mkdir)
	$(babel) --presets es2015 $(BABEL_OPT) $< -o $@


# browserify bundles
browserify := node_modules/.bin/browserify
ifeq ($(NODE_ENV), development)
BROWSERIFY_OPT := -d
endif

bundles.src := $(out)/app$(app.js.dest.ext)
bundles.dest := $(patsubst %$(app.js.dest.ext), \
	%.browserify$(app.js.dest.ext), $(bundles.src))

$(bundles.dest): %.browserify$(app.js.dest.ext): %$(app.js.dest.ext)
	$(mkdir)
	$(browserify) $(BROWSERIFY_OPT) $< -o $@

$(bundles.dest): node_modules.mk $(lib.js.dest)


# the end of the browser-facing javascipt chain
es6.dest := $(patsubst %.es5, %.js, $(bundles.dest))
# we need only bundles
.INTERMEDIATE: $(app.js.dest)
ifeq ($(app.js.dest.ext), .es5)
.INTERMEDIATE: $(bundles.dest)
endif
UGLIFYJS_OPT := --screw-ie8 -m -c

%.js: %.es5
	node_modules/.bin/uglifyjs $(UGLIFYJS_OPT) -o $@ -- $<

$(es6.dest): node_modules.mk
compile: $(es6.dest)


mocha := node_modules/.bin/mocha
# for use inside of test scripts
export MOCHA_OUT := $(out)

.PHONY: test
test: node_modules.mk
	$(mocha) -u tdd $(TEST_OPT) $(src)/test/test_*.js


.PHONY: lint
lint: compile

css.dest := $(filter %.css, $(app.static.dest))

.PHONY: lint-css
lint-css: $(css.dest)
	stylelint --config $(src)/stylelint.config.js $^

lint: lint-css
