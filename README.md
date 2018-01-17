# Radial gradient origin workaround for Adobe Illustrator Extendscript API

The Ilustrator Extendscript API only provides the origins of radial gradiants as an integer coordinates - these functions let you get the origins to unlimited decimal precision.

## Usage

Get the origin of a radial gradient in the `strokeColor` property of a PathItem `p`, accurate to 6 decimal places:

```js
var origin = getRadialGradientOrigin(p, "strokeColor", 6);
// returns [455.768938567,456.567849567]
```

Get the origin of the radial gradients in the `strokeColor` property of a PathItem `p1` and the `fillColor` property of a PathItem `p2`, accurate to 3 decimal places:

```js
var origins = getRadialGradientOrigins([{
    pathItem: p1,
    colorPropertyName: "strokeColor"
},
{
    pathItem: p2,
    colorPropertyName: "fillColor"
}], 3);
// returns [[455.768938567,456.567849567],[4364.565859, 6.3733303]]
```

Using `getRadialGradientOrigins` for multiple gradients will have better performance than repeatly calling `getRadialGradientOrigin` due to the lower number of Illustrator redraws required.