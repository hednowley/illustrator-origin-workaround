type GradientInfo = {
    colorPropertyName: string; // Name of colour property
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
            colorPropertyName: property,
            pathItem: pathItem
        });
    }
}

const activeDocument = app.activeDocument;
const layerCount = activeDocument.layers.length;
for (let i = 0; i < layerCount; i++) {
    processLayer(activeDocument.layers[i]);
}

var origins = getRadialGradientOrigins(gradients, 10);

for (let i = 0; i < gradients.length; i++) {

    var oldOrigin = gradients[i].pathItem[gradients[i].colorPropertyName].origin;
    var newOrigin = origins[i];

    alert("Origin error: (" + (newOrigin[0] - oldOrigin[0])  + ", " + (newOrigin[1] - oldOrigin[1]) + ")");
}