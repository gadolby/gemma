# Gemma

**Gemma** is a javascript library and command-line application for exploring and geographic mapping
genetic variations in populations.

* [CLI documentation](https://dglmoore.com/gemma/cli)
* [API documentation](https://dglmoore.com/gemma/lib)

| **Build Status**                                                                                |
|:-----------------------------------------------------------------------------------------------:|
| [![][travis-img]][travis-url] [![][appveyor-img]][appveyor-url] [![][codecov-img]][codecov-url] |

[travis-img]: https://travis-ci.com/dglmoore/gemma.svg?branch=master
[travis-url]: https://travis-ci.com/dglmoore/gemma

[appveyor-img]: https://ci.appveyor.com/api/projects/status/h69jkx7p2c8l3e3w/branch/master?svg=true
[appveyor-url]: https://ci.appveyor.com/project/dglmoore/gemma

[codecov-img]: https://codecov.io/gh/dglmoore/gemma/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/dglmoore/gemma

## Installation

To install and use **Gemma** you'll first need to install [node.js](https://nodejs.org) v10.15.1 or
greater. On Linux and Mac OS, we recommend using [nvm](https://github.com/creationix/nvm).

If you are primarily going to be using **Gemma**'s CLI, you should install it globally
```shell
> npm install --global @dglmoore/gemma
```
This will install the scripts so that you can run execute them at the command-line.

If, on the other hand, you are wanting to use **Gemma** as a dependency for your personal javascript
project, then you'll want to install it locally
```shell
> npm install --save @dglmoore/gemma
```
This will install the library and scripts in the `node_modules` directory of your `npm` project and
let you used them within your source files.

## Getting Help
**Gemma** is being developed to make exploring genomic data as easy as possible. We cannot do that
without your feedback. We host the project's source code and issue tracker on
[Github](https://github.com/dglmoore/gemma). Please create an issue if you find a bug, an error in
the documentation, or have a feature you'd like to request. Your contributions will make **Gemma** a
better tool for everyone.

**Source Repository**: https://github.com/dglmoore/gemma

**Issue Tracker**: https://github.com/dglmoore/gemma/issues

## Relevant Publications

_In the works..._

## Copyright and Licensing

Copyright © 2018-2019 Greer Dolby and Douglas G. Moore. Free use of this software is grated under
the terms of the MIT License.

See the [LICENSE](https://github.com/dglmoore/gemma/blob/master/LICENSE) file for details.
