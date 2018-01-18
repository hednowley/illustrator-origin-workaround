interface GradientInfo {
	colorPropertyName: string; // Name of colour property
	pathItem: PathItem;
}

const gradients: GradientInfo[] = [];

const processLayer = (layer: Layer) => {

	const pageItemCount = layer.pageItems.length;
	for (let i = 0; i < pageItemCount; i++) {
		processPageItem(layer.pageItems[i]);
	}

	const layerCount = layer.layers.length;
	for (let i = 0; i < layerCount; i++) {
		processLayer(layer.layers[i]);
	}
};

const processPageItem = (item: PageItem) => {

	const type = item.typename;
	switch (type) {
		case "CompoundPathItem":
			const compoundItem = <CompoundPathItem>item;
			const pathItemsCount = compoundItem.pathItems.length;
			for (let i = 0; i < pathItemsCount; i++) {
				processPageItem(compoundItem.pathItems[i]);
			}
			break;

		case "PathItem":
			const pathItem = <PathItem>item;
			processColourItem(pathItem.strokeColor, "strokeColor", pathItem);
			processColourItem(pathItem.fillColor, "fillColor", pathItem);
			break;
	}
};

const processColourItem = (colour: Color, property: string, pathItem: PathItem) => {
	if (colour instanceof GradientColor) {
		gradients.push({
			colorPropertyName: property,
			pathItem: pathItem
		});
	}
};

const activeDocument = app.activeDocument;
const layerCount = activeDocument.layers.length;
for (let i = 0; i < layerCount; i++) {
	processLayer(activeDocument.layers[i]);
}

const origins = getRadialGradientOrigins(gradients, 10);

for (let i = 0; i < gradients.length; i++) {

	const oldOrigin = gradients[i].pathItem[gradients[i].colorPropertyName].origin;
	const newOrigin = origins[i];

	alert("Origin error: (" + (newOrigin[0] - oldOrigin[0]) + ", " + (newOrigin[1] - oldOrigin[1]) + ")");
}