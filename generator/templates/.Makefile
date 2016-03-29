.DELETE_ON_ERROR:
src := $(dir $(realpath $(lastword $(MAKEFILE_LIST))))

# debug
pp-%:
	@echo "$(strip $($*))" | tr ' ' \\n

# the directory with jekyllmk repo
jekyllmk.src := {{{ jekyllmk_src }}}

dir.check = $(if $(filter $(CURDIR)/,$(src)),$(error Do not run this task in the directory with your source files))
shellquote = '$(subst ','\'',$(1))'
#'

.PHONY: compile
compile:
	$(dir.check)
	$(MAKE) --no-print-directory -f $(jekyllmk.src)/main.mk NODE_ENV=production DATA=$(src)
# check for leftovers
	@$(MAKE) --no-print-directory -f $(jekyllmk.src)/main.mk \
		NODE_ENV=production DATA=$(src) diff

new.date := $(shell date +%Y/%m/%d)
new.post := $(src)/$(shell mktemp -u $(new.date)/XXXXXX.md)
new.author := $(shell json < $(src)/config.json feed.author)
.PHONY: new
new:
	mkdir -p $(dir $(new.post))
	@printf -- '---\nsubject: A New Post\nauthors: %s\n---\n\nHi' \
		$(call shellquote,$(new.author)) > $(new.post)
	$$EDITOR $(new.post) &

# edit this
sync.dest := root@router:/home/www/blog/

.PHONY: sync
sync: compile
	$(dir.check)
	rsync -avPL --delete -e ssh production/site/ $(sync.dest)
