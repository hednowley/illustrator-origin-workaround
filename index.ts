/// <reference types="types-for-adobe/illustrator/2015.3"/>

// Get the radial gradient origin to a specified decimal precision.
function getRadialGradientOrigin(pathItem: PathItem, colorPropertyName: string, decimalAccuracy: number) {
    return getRadialGradientOrigins([{ pathItem: pathItem, colorPropertyName: colorPropertyName}], decimalAccuracy)[0];
}

// Get the radial gradient origins to a specified decimal precision.
// Returns an array of origins mapping to the gradient array paramater.
function getRadialGradientOrigins(gradients: GradientInfo[], decimalAccuracy: number) {

    var tempLayer = activeDocument.layers.add();

    var copies: {
        pathItem: PathItem | CompoundPathItem; // Copy of the item with the colour gradient
        observablePathItem: PathItem, // Usually same as pathItem unless it's a compound path
        colorProp: string; // Name of the property with the colour gradient (i.e. stroke or fill)
        x0: number;
        xLower: number;
        xUpper: number;
        xFactor: number; // Scale factor to deal with negative X
        y0: number;
        yLower: number;
        yUpper: number;
        yFactor: number; // Scale factor to deal with negative Y
        dX: number; // Net path transformation in X
        dY: number; // Net path transformation in Y
    }[] = [];

    for (var gradient of gradients) {
        var pathItem = gradient.pathItem;

        // Make a copy of the parent item
        var pathItemCopy = pathItem.duplicate(tempLayer, null) as PathItem|CompoundPathItem;
        pathItemCopy.hidden = true;

        // If this is a compound path item then we use it for transformations but read gradient origins from one of its children
        var workingPathItem: PathItem;
        if (pathItemCopy.typename == "CompoundPathItem") {
            var c = <CompoundPathItem>pathItemCopy
            workingPathItem = (<CompoundPathItem>pathItemCopy).pathItems[0]
        } else {
            workingPathItem = <PathItem>pathItemCopy;
        }

        // Transformations don't behave intuitively on origins with negative X or y.
        // Hence make both positive now and revert any changes to the sign later.
        var x: number = workingPathItem[gradient.colorPropertyName].origin[0];
        var xFactor: number;
        if (x < 0) {
            x = -x;
            xFactor = -1;
        } else {
            xFactor = 1;
        }

        var y: number = workingPathItem[gradient.colorPropertyName].origin[1];
        var yFactor: number;
        if (y < 0) {
            y = -y;
            yFactor = -1;
        } else {
            yFactor = 1;
        }

        copies.push({
            pathItem: pathItemCopy,
            observablePathItem: workingPathItem,
            colorProp: gradient.colorPropertyName,
            x0: x,
            xLower: x,
            xUpper: x + 1,
            xFactor: xFactor,
            y0: y,
            yLower: y,
            yUpper: y + 1,
            yFactor: yFactor,
            dX: 0,
            dY: 0
        });
    }

    var xCentre = 1;
    var yCentre = 1;

    var range = 1;
    var min = Math.pow(0.1, decimalAccuracy)
    while (range > min) {

        for (var copy of copies) {

            // Translate bounds to make them symmetric around the next integer
            var xDiff = xCentre - (copy.xUpper + copy.xLower) * 0.5;
            copy.xLower += xDiff;
            copy.xUpper += xDiff;

            var yDiff = yCentre - (copy.yUpper + copy.yLower) * 0.5;
            copy.yLower += yDiff;
            copy.yUpper += yDiff;

            // Translate the path item by half the width of the error bounds.
            // We can then see from the rounded-down integer whether our point lies in the upper or lower half of the bounds.
            copy.pathItem.translate(copy.xFactor * xDiff, copy.yFactor * yDiff, true, true, true, true);

            // Keep track of the total shifting we've done so we can work back to the original point later
            copy.dX += xDiff;
            copy.dY += yDiff;
        }

        app.redraw();

        for (var copy of copies) {

            var xNew = copy.xFactor * copy.observablePathItem[copy.colorProp].origin[0];
            var yNew = copy.yFactor * copy.observablePathItem[copy.colorProp].origin[1];

            if (xNew === xCentre) {
                // We know x lies in the upper half of the bound
                copy.xLower = xCentre;
            } else if (xNew === xCentre - 1) {
                // We know x lies in the lower half of the bound
                copy.xUpper = xCentre;
            } else {
                return;
            }

            if (yNew === yCentre) {
                // We know y lies in the upper half of the bound
                copy.yLower = yCentre;
            } else if (yNew === yCentre - 1) {
                // We know y lies in the lower half of the bound
                copy.yUpper = yCentre;
            } else {
                return;
            }
        }

        range = range * 0.5;
    }

    var origins: number[][] = [];

    for (var copy of copies) {
        origins.push([copy.xFactor * (copy.xLower - copy.dX), copy.yFactor * (copy.yLower - copy.dY)]);
    }

    tempLayer.remove();
    app.redraw();

    return origins;
}