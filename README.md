## Requirements

### User

* Node.js 5.9.1
* Tcl/Tk 8.6.4 (for generation of a new site only)
* `npm i -g json`


## Usage

0. Clone the repo.

1. Generate a new site

		$ cd $somedir
		$ make -f $repo/main.mk generate NEW=mysite
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


## License

MIT.
