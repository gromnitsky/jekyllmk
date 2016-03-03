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


export NODE_PATH = $(realpath node_modules)
node_modules: package.json
	npm install --loglevel=error --depth=0 $(NPM_OPT)
	touch $@

package.json: $(src)/package.json
	cp -a $< $@


data.src := $(shell find $(DATA) -type f)
data.dest := $(patsubst $(DATA)/%, $(out)/%, $(data.src))

$(data.dest): $(out)/%: $(DATA)/%
	$(mkdir)
	cp -a $< $@

compile: $(data.dest)


$(out)/index.json: $(data.dest) node_modules
	$(src)/index $(data.dest) > $@

compile: $(out)/index.json
