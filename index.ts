/// <reference types="types-for-adobe/illustrator/2015.3"/>

type myObject = {
    type: string;
    angle: number;
    length: number;
    origin: number[];
    hiliteAngle: number;
    hiliteLength: number;
    matrix: {
        A: number;
        B: number;
        C: number;
        D: number;
        TX: number;
        TY: number;
    };
    gradient: {
        type: string;
        color: any;
        midPoint: number[];
        rampPoint: number[];
    }
}

type GradientInfo = {
    parentPathItem: PathItem;
    colorProp: string; // Name of colour property
    pathItem: PathItem;
}

const gradients: GradientInfo[] = [];

var processLayer = (layer: Layer) => {

    var pageItemCount = layer.pageItems.length;
    for (let i = 0; i < pageItemCount; i++) {
        processPageItem(layer.pageItems[i]);
    }

    var layerCount = layer.layers.length;
    for (let i = 0; i < layerCount; i++) {
        processLayer(layer.layers[i]);
    }
}

var processPageItem = (item: PageItem) => {

    var type = item.typename;
    switch (type) {
        case 'CompoundPathItem':
            let compoundItem = <CompoundPathItem>item;
            var pathItemsCount = compoundItem.pathItems.length;
            for (let i = 0; i < pathItemsCount; i++) {
                processPageItem(compoundItem.pathItems[i])
            }
            break;

        case 'PathItem':
            let pathItem = <PathItem>item;
            processColourItem(pathItem.strokeColor, "strokeColor", pathItem);
            processColourItem(pathItem.fillColor, "fillColor", pathItem);
            break;
    }
}

var processColourItem = (colour: Color, property: string, pathItem: PathItem) => {
    if (colour instanceof GradientColor) {
        gradients.push({
            colorProp: property,
            pathItem: pathItem,
            parentPathItem: null
        });
    }
}

const activeDocument = app.activeDocument;
const layerCount = activeDocument.layers.length;
for (let i = 0; i < layerCount; i++) {
    processLayer(activeDocument.layers[i]);
}

for (var g of gradients) {
    processRadialGradient(g, 6);
}

// Use a binary search to find radial gradient origins to a specified precision.
// Should be run once per document for performance and to avoid strange path translation issues. 
function processRadialGradient(gradientInfo: GradientInfo, decimalAccuracy: number) {
    var gradientWrapper = gradientInfo;

    var tempLayer = activeDocument.layers.add();

    var pathItem = gradientWrapper.pathItem;
    var pathItemCopy = pathItem.duplicate(tempLayer, null) as PathItem|CompoundPathItem;
    pathItemCopy.hidden = true;

    var workingPathItem: PathItem;

    // If this is a compound path item, then we use it for transformations but read gradient origins from one of its children
    if (pathItemCopy.typename == "CompoundPathItem") {
        var c = <CompoundPathItem>pathItemCopy
        workingPathItem = (<CompoundPathItem>pathItemCopy).pathItems[0]
    } else {
        workingPathItem = <PathItem>pathItemCopy;
    }

    var x: number = workingPathItem[gradientWrapper.colorProp].origin[0];
    var xFactor: number;
    if (x < 0) {
        x = -x;
        xFactor = -1;
    } else {
        xFactor = 1;
    }

    var y: number = workingPathItem[gradientWrapper.colorProp].origin[1];
    var yFactor: number;
    if (y < 0) {
        y = -y;
        yFactor = -1;
    } else {
        yFactor = 1;
    }

    var copy = {
        pathItem: pathItemCopy,
        workingPathItem: workingPathItem,
        colorProp: gradientWrapper.colorProp,
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
    };

    var xCentre = 1;
    var yCentre = 1;

    var range = 1;
    var min = Math.pow(0.1, decimalAccuracy)
    while (range > min) {

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

        app.redraw();

        var xNew = copy.xFactor * copy.workingPathItem[copy.colorProp].origin[0];
        var yNew = copy.yFactor * copy.workingPathItem[copy.colorProp].origin[1];

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

        range = range * 0.5;
    }

    var newOrigin = [copy.xFactor * (copy.xLower - copy.dX), copy.yFactor * (copy.yLower - copy.dY)];
    alert("Found origin: (" + newOrigin[0] + ", " + newOrigin[1] + ")");

    tempLayer.remove();
    app.redraw();
}