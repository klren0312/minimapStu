# @kjn/svg-minimap

[![semantic-release: angular](https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release)](https://github.com/semantic-release/semantic-release)

[![npm version](https://badge.fury.io/js/@kjn%2Fsvg-minimap.svg)](https://badge.fury.io/js/@kjn%2Fsvg-minimap)

Creates a zoomable, pannable minimap component for your svg elements.

# Usage

Install this package

```sh
npm install @kjn/svg-minimap
```

Import and initialise the minimap

```js
import SvgMinimap from "@kjn/svg-minimap";

new SvgMinimap(document.getElementById("svg"), document.getElementById("minimapContainer"));
```

Assuming that we have a `<svg>` element that contains various svg drawings.
AND that there exists a (preferably bounded) container where the minimap should be placed into.

For more details on how to use, check the examples directory.
