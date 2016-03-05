.PHONY: compile
compile:

.DELETE_ON_ERROR:

pp-%:
	@echo "$(strip $($*))" | tr ' ' \\n

NODE_ENV ?= development
out := $(NODE_ENV)
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
	cp -a $< $@

# automatically restart Make if there is no node_modules folder
include node_modules.mk
node_modules.mk: node_modules
	touch $@


data.src := $(shell find $(DATA) -type f)
data.dest := $(patsubst $(DATA)/%, $(out)/%, $(data.src))

$(data.dest): $(out)/%: $(DATA)/%
	$(mkdir)
	cp -a $< $@

compile: $(data.dest)


$(out)/index.json: $(data.dest)  node_modules.mk
	$(src)/index $(data.dest) > $@

compile: $(out)/index.json


npm.js.ext := .min.js .js
ifeq ($(NODE_ENV), development)
npm.js.ext := .dev.js .js
endif
npm.js.src := angular2/bundles/angular2-all.umd \
	angular2/bundles/angular2-polyfills \
	rxjs/bundles/Rx.umd \
	babel-polyfill/dist/polyfill

npm-get-src = $(firstword $(foreach ext,$(npm.js.ext),\
	$(or $(wildcard node_modules/$(1)$(ext)))))
define npm-rule =
$(2): $$(call npm-get-src,$(1))
	$$(copy)
endef
npm.js.dest := $(foreach file, $(npm.js.src), $(out)/.npm/$(file).js)
# generate rules on the fly
$(foreach file, $(npm.js.src), \
	$(eval $(call npm-rule,$(file),$(out)/.npm/$(file).js)))

$(npm.js.dest): node_modules.mk
compile: $(npm.js.dest)


app.static.src := $(filter-out %.js, $(wildcard $(src)/app/*))
app.static.dest := $(patsubst $(src)/app/%, $(out)/%, $(app.static.src))

$(app.static.dest): $(out)/%: $(src)/app/%
	$(copy)

compile: $(app.static.dest)


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


es6.dest := $(patsubst %.es5, %.js, $(app.js.dest))
ifeq ($(app.js.dest.ext), .es5)
.INTERMEDIATE: $(app.js.dest)
endif
UGLIFYJS_OPT := --screw-ie8 -m -c

%.js: %.es5
	node_modules/.bin/uglifyjs $(UGLIFYJS_OPT) -o $@ -- $<

$(es6.dest): node_modules.mk
compile: $(es6.dest)
