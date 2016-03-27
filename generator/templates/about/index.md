---
subject: About
---

In general, a page is not that different from a post.

Every page that location starts w/ `#/p/`, for example,
`#/p/about/index` is generated on the fly from a corresponding .md
file, e.g. `p/about/index.md`.

If you have any other files in the directory where your .md file is,
you construct your links to them relative to that directory. For
instance, inserting an image would be:

	<img src="sense-and-sensibility.png">

Exactly like this one:

<img src="sense-and-sensibility.png">

If you want some formulas in the page & you don't want to modify
`production/site/index.html` file, write `<script>` tags in the .md
file.
