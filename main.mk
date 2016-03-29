.PHONY: compile
compile:

.DELETE_ON_ERROR:

pp-%:
	@echo "$(strip $($*))" | tr ' ' \\n

# our 'umbrella' dir
NODE_ENV ?= development

out := $(NODE_ENV)/site
out.tmp := $(NODE_ENV)
src.mk := $(realpath $(lastword $(MAKEFILE_LIST)))
src := $(dir $(src.mk))

ifdef OFFLINE
NPM_OPT += --cache-min 99999999
endif

DATA := $(src)/test/data/shevchenko/
$(if $(filter %/,$(DATA)),,$(error DATA must end with '/'))

mkdir = @mkdir -p $(dir $@)
define copy =
$(mkdir)
cp $< $@
endef

compile.all :=
# $(eval $(call compile-push,$(files)))
define compile-push =
compile: $(1)
compile.all += $(1)
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
	@printf "\033[0;33m%s\033[0;m\n" 'Restarting $(MAKE)...'
	touch $@


data.src := $(shell find $(DATA) -type f \
	! -ipath '*/.git/*' ! -ipath '$(DATA)Makefile')
data.dest := $(patsubst $(DATA)%, $(out)/%, $(data.src))

$(data.dest): $(out)/%: $(DATA)%
	$(copy)

$(eval $(call compile-push,$(data.dest)))

$(out)/index.json: $(data.dest)  node_modules.mk
	$(src)/index $(data.dest) > $@

$(eval $(call compile-push,$(out)/index.json))

$(out)/feed.xml: $(data.dest)  node_modules.mk
	$(src)/feed -c $(out)/config.json $(data.dest) > $@

$(eval $(call compile-push,$(out)/feed.xml))


npm.ext := .min.css .css .min.js .js
ifeq ($(NODE_ENV), development)
npm.ext := .css .dev.js .js
endif
npm.src := angular2/bundles/angular2-polyfills.js \
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
$(eval $(call compile-push,$(npm.dest)))

app.static.src := $(filter-out %.js, $(wildcard $(src)/app/*))
app.static.dest := $(patsubst $(src)/app/%, $(out)/%, $(app.static.src))

$(app.static.dest): $(out)/%: $(src)/app/%
	$(copy)

$(eval $(call compile-push,$(app.static.dest)))

# unconditional compilation
lib.js.src := $(wildcard $(src)/lib/*.js)
lib.js.dest := $(patsubst $(src)/%.js, $(out.tmp)/%.js, $(lib.js.src))

$(out.tmp)/%.js: $(src)/%.js
	$(mkdir)
	$(babel) --presets es2015 $(BABEL_OPT) $< -o $@

$(lib.js.dest): node_modules.mk
$(eval $(call compile-push,$(lib.js.dest)))

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
$(eval $(call compile-push,$(es6.dest)))


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


# a custom minification of angular2 umd bundle
# FIXME: remove after the upstream fix
$(out)/.npm/angular2.js: node_modules/angular2/bundles/angular2-all.umd.js node_modules.mk
ifeq ($(NODE_ENV), production)
	node_modules/.bin/uglifyjs --screw-ie8 -c -o $@ -- $<
else
	$(copy)
endif

$(eval $(call compile-push,$(out)/.npm/angular2.js))


# new site generator
NEW=$(CURDIR)
new.ui := gui

$(NEW)/config.js:
	@[[ ! `ls -A $(NEW) 2>/dev/null` ]] || (printf "%s\n%s\n" 'Directory `$(NEW)` is not empty' 'Retype: make -f ...$(notdir $(src.mk)) generate NEW=some/other/dir'; exit 1)
	$(mkdir)
	$(src)/generator/options-$(new.ui) $(NEW) | $(src)/generator/jekyllmk-new

.PHONY: generate
generate: $(NEW)/config.js


# print a diff between should-be files & a real situation
.PHONY: diff
diff: compile
	@echo "$(strip $(compile.all))" | tr ' ' \\n | sort > should
	@find $(NODE_ENV) -type f | sort > real
	@diff -u should real && rm should real
