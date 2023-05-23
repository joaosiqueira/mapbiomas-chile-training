//
//
var assetMosaics = 'projects/mapbiomas-chile/assets/MOSAICS/mosaics-2';

//
var assetRegions = 'projects/mapbiomas-chile/assets/ANCILLARY_DATA/classification-regions';

//
var assetStableSamples = 'projects/mapbiomas-chile/assets/COLLECTION1/SAMPLES/STABLE';

// 
var assetSamples = 'projects/mapbiomas-chile/assets/COLLECTION1/SAMPLES/ADITIONAL';

//
var assetClass = 'projects/mapbiomas-chile/assets/COLLECTION1/classification-beta';

// define a region id
var regionId = 2;

var version = {
    'classification': '1',
    'stable_map': '1',
    'stable_samples': '3',
    'output': '1',
};

var assetStable = 'projects/mapbiomas-chile/assets/COLLECTION1/classification-stable/'
    + 'CHILE-STABLE-REGION-'
    + regionId.toString()
    + '-'
    + version.stable_map;;

var nTrainingPoints = 2000;   // Number of points to training
var nValidationPoints = 500;   // Number of points to validate

// number of complementary points
var complementary = [
    [59, 100], // 1.1 Bosque Nativo Primario
    [60, 100], // 1.2 Bosque Nativo Secundario/Renovales
    [61, 100], // 2.1 Matorrales
    [12, 0], // 2.2 Pastizales
    [11, 0], // 2.3 Humedales
    [13, 0], // 2.4 Otras Formaciones vegetales
    [15, 0], // 3.1 Pasturas
    [18, 0], // 3.2 Agricultura
    [21, 0], // 3.4 Mosaico de Agricultura y Pastura
    [9, 0],  // 3.5 Bosque Plantado/Silvicultura
    [23, 0], // 4.1 Arenas, Playas y Dunas
    [29, 0], // 4.2 Suelos Rocosos
    [24, 0], // 4.3 Infraestructura Urbana
    [62, 0], // 4.4 Salares
    [25, 0], // 4.5 Otras Areas sin Vegetacion
    [33, 0], // 5.1 Rios, Lagos y Oceanos
    [34, 0], // 5.2 Nieve y Hielo
];

// Landsat images that will be added to Layers
var years = [
    1985, 1986, 1987, 1988, 1990,
    1991, 1992, 1993, 1994, 1995,
    1996, 1997, 1998, 1999, 2000,
    2001, 2002, 2003, 2004, 2005,
    2006, 2007, 2008, 2009, 2010,
    2011, 2012, 2013, 2014, 2015,
    2016, 2017, 2018, 2019, 2020,
    2021
];

// random forest parameters
var rfParams = {
    'numberOfTrees': 40, //100
    'variablesPerSplit': 4,
    'minLeafPopulation': 25,
    'seed': 1
};

//
var featureSpace = [
    'slope',
    'green_median_texture',
    'gcvi_median_wet',
    'gcvi_median',
    'gcvi_median_dry',
    "blue_median",
    "evi2_median",
    "green_median",
    "red_median",
    "nir_median",
    "swir1_median",
    "swir2_median",
    "gv_median",
    "gvs_median",
    "npv_median",
    "soil_median",
    "shade_median",
    "ndfi_median",
    "ndfi_median_wet",
    "ndvi_median",
    "ndvi_median_dry",
    "ndvi_median_wet",
    "ndwi_median",
    "ndwi_median_wet",
    "savi_median",
    "sefi_median",
    "ndfi_stdDev",
    "sefi_stdDev",
    "soil_stdDev",
    "npv_stdDev",
    "ndwi_amp"
];
//
var palettes = require('users/mapbiomas/modules:Palettes.js');

var mosaics = ee.ImageCollection(assetMosaics);
var regions = ee.FeatureCollection(assetRegions);

var selectedRegion = regions.filter(ee.Filter.eq('region_id', regionId));

var region = typeof (userRegion) !== 'undefined' ? userRegion : selectedRegion;

var mapbiomasPalette = palettes.get('classification7');

//
var visClass = {
    'min': 0,
    'max': 62,
    'palette': mapbiomasPalette,
    'format': 'png'
};

var visMos = {
    'bands': [
        'swir1_median',
        'nir_median',
        'red_median'
    ],
    'gain': [0.08, 0.06, 0.2],
    'gamma': 0.85
};

//------------------------------------------------------------------
// User defined functions
//------------------------------------------------------------------
/**
 * Create a function to collect random point inside the polygons
 * @param {*} polygons 
 * @param {*} nPoints 
 * @returns 
 */
var generateAditionalPoints = function (polygons, classValues, classPoints) {

    // convert polygons to raster
    var polygonsRaster = ee.Image().paint({
        featureCollection: polygons,
        color: 'class'
    }).rename('class');

    // Generate N random points inside the polygons
    var points = polygonsRaster.stratifiedSample({
        'numPoints': 1,
        'classBand': 'class',
        'classValues': classValues,
        'classPoints': classPoints,
        'region': polygons,
        'scale': 30,
        'seed': 1,
        'dropNulls': true,
        'geometries': true,
    });

    return points;
};

/**
 * Create a function to collect random point inside the polygons
 * @param {*} polygons 
 * @param {*} nPoints 
 * @returns 
 */
var stratifiedPoints = function (image, nPoints, region) {

    image = image.rename('class');

    // Generate N random points inside the polygons
    var points = image.stratifiedSample({
        'numPoints': nPoints,
        'classBand': 'class',
        'region': region,
        'scale': 30,
        'seed': 1,
        'dropNulls': true,
        'geometries': true
    });

    return points;
};
/**
 * 
 * @param {*} collection 
 * @param {*} seed 
 */
var shuffle = function (collection, seed) {

    // Adds a column of deterministic pseudorandom numbers to a collection.
    // The range 0 (inclusive) to 1000000000 (exclusive).
    collection = collection.randomColumn('random', seed || 1)
        .sort('random', true)
        .map(
            function (feature) {
                var rescaled = ee.Number(feature.get('random'))
                    .multiply(1000000000)
                    .round();
                return feature.set('new_id', rescaled);
            }
        );

    // list of random ids
    var randomIdList = ee.List(
        collection.reduceColumns(ee.Reducer.toList(), ['new_id'])
            .get('list'));

    // list of sequential ids
    var sequentialIdList = ee.List.sequence(1, collection.size());

    // set new ids
    var shuffled = collection.remap(randomIdList, sequentialIdList, 'new_id');

    return shuffled;
};
//
// stable
var stable = ee.Image(assetStable);

// Add mosaic for each year
years.forEach(
    function (year) {
        var mosaicYear = mosaics
            .filter(ee.Filter.eq('year', year))
            .filter(ee.Filter.bounds(region))
            .mosaic();

        Map.addLayer(mosaicYear, visMos, year + ' ' + regionId, false);
    }
);

var samplesList = [
    typeof (c59) !== 'undefined' ? c59 : ee.FeatureCollection([]), // 1.1 Bosque Nativo Primario
    typeof (c60) !== 'undefined' ? c60 : ee.FeatureCollection([]), // 1.2 Bosque Nativo Secundario/Renovales
    typeof (c61) !== 'undefined' ? c61 : ee.FeatureCollection([]), // 2.1 Matorrales
    typeof (c12) !== 'undefined' ? c12 : ee.FeatureCollection([]), // 2.2 Pastizales
    typeof (c11) !== 'undefined' ? c11 : ee.FeatureCollection([]), // 2.3 Humedales
    typeof (c13) !== 'undefined' ? c13 : ee.FeatureCollection([]), // 2.4 Otras Formaciones vegetales
    typeof (c15) !== 'undefined' ? c15 : ee.FeatureCollection([]), // 3.1 Pasturas
    typeof (c18) !== 'undefined' ? c18 : ee.FeatureCollection([]), // 3.2 Agricultura
    typeof (c21) !== 'undefined' ? c21 : ee.FeatureCollection([]), // 3.4 Mosaico de Agricultura y Pastura
    typeof (c09) !== 'undefined' ? c09 : ee.FeatureCollection([]), // 3.5 Bosque Plantado/Silvicultura
    typeof (c23) !== 'undefined' ? c23 : ee.FeatureCollection([]), // 4.1 Arenas, Playas y Dunas
    typeof (c29) !== 'undefined' ? c29 : ee.FeatureCollection([]), // 4.2 Suelos Rocosos
    typeof (c24) !== 'undefined' ? c24 : ee.FeatureCollection([]), // 4.3 Infraestructura Urbana
    typeof (c62) !== 'undefined' ? c62 : ee.FeatureCollection([]), // 4.4 Salares
    typeof (c25) !== 'undefined' ? c25 : ee.FeatureCollection([]), // 4.5 Otras Areas sin Vegetacion
    typeof (c33) !== 'undefined' ? c33 : ee.FeatureCollection([]), // 5.1 Rios, Lagos y Oceanos
    typeof (c34) !== 'undefined' ? c34 : ee.FeatureCollection([]), // 5.2 Nieve y Hielo
];

print(samplesList);

//------------------------------------------------------------------
// User defined functions
//------------------------------------------------------------------
// merges all polygons
var samplesPolygons = ee.List(samplesList).iterate(
    function (sample, samplesPolygon) {
        return ee.FeatureCollection(samplesPolygon).merge(sample);
    },
    ee.FeatureCollection([])
);

// filter by user defined region "userRegion" if exists
samplesPolygons = ee.FeatureCollection(samplesPolygons)
    .filter(ee.Filter.bounds(region));

// avoid geodesic operation error
samplesPolygons = samplesPolygons.map(
    function (polygon) {
        return polygon.buffer(1, 10);
    }
);

var classValues = complementary.map(
    function (array) {
        return array[0];
    }
);

var classPoints = complementary.map(
    function (array) {
        return array[1];
    }
);

// generate training points
var aditionalTrainingPoints = generateAditionalPoints(samplesPolygons, classValues, classPoints);

// generate validation points
var aditionalValidationPoints = generateAditionalPoints(samplesPolygons, classValues, classPoints);

print('trainingPoints', aditionalTrainingPoints.aggregate_histogram('class'));
print('validationPoints', aditionalValidationPoints.aggregate_histogram('class'));

// set sample type
aditionalTrainingPoints = aditionalTrainingPoints.map(
    function (sample) {
        return sample.set('sample_type', 'training');
    }
);

aditionalValidationPoints = aditionalValidationPoints.map(
    function (sample) {
        return sample.set('sample_type', 'validation');
    }
);

// merge training and validation points
var aditionalSamplesPoints = aditionalTrainingPoints.merge(aditionalValidationPoints);

// visualize points using mapbiomas color palette
var samplesPointsVis = aditionalSamplesPoints.map(
    function (feature) {
        return feature.set('style', {
            'color': ee.List(mapbiomasPalette).get(feature.get('class')),
            'width': 1,
        });
    }
);

//
var terrain = ee.Image("JAXA/ALOS/AW3D30_V1_1").select("AVE");
var slope = ee.Terrain.slope(terrain);

var classifiedList = [];

years.forEach(
    function (year) {

        // read stable samples generated by step 4
        var stableSamples = assetStableSamples + '/samples-stable-' + year.toString() + '-' + regionId.toString() + '-' + version.stable_samples;

        var stableSamplesPoints = ee.FeatureCollection(stableSamples);

        print('stablePoints', stableSamplesPoints.aggregate_histogram('class'));

        // visualize points using mapbiomas color palette
        var stableSamplesPointsVis = stableSamplesPoints.map(
            function (feature) {
                return feature.set('style', {
                    'color': ee.List(mapbiomasPalette).get(feature.get('class')),
                    'width': 1,
                });
            }
        );

        var mosaicYear = mosaics
            .filter(ee.Filter.eq('year', year))
            .filter(ee.Filter.bounds(region))
            .mosaic()
            .addBands(slope);

        mosaicYear = mosaicYear.select(featureSpace);

        // Collect the spectral information to get the trained samples
        var additionalTrainedSamples = mosaicYear.reduceRegions({
            'collection': aditionalTrainingPoints,
            'reducer': ee.Reducer.first(),
            'scale': 30,
        });

        additionalTrainedSamples = additionalTrainedSamples.filter(ee.Filter.notNull(['green_median_texture']));

        var samplesFinal = stableSamplesPoints.merge(additionalTrainedSamples);

        var classifier = ee.Classifier.smileRandomForest(rfParams)
            .train(samplesFinal, 'class', featureSpace);

        var classified = ee.Algorithms.If(
            samplesFinal.size().gt(0),
            mosaicYear.classify(classifier),
            ee.Image(0)
        );

        classified = ee.Image(classified).rename('classification_' + year.toString());

        classifiedList.push(classified);

        Map.addLayer(classified, visClass, year.toString() + ' ' + regionId.toString() + ' class', false);
        Map.addLayer(stableSamplesPointsVis.style({ 'styleProperty': 'style' }), {}, year.toString() + ' ' + regionId.toString() + ' stable sample points');

        // Export points to asset
        var pointsName = 'samples-stable-additional-' + year.toString() + '-' + regionId.toString() + '-' + version.output;

        Export.table.toAsset({
            "collection": samplesFinal,
            "description": 'additional ' + pointsName,
            "assetId": assetAdditionalSamples + '/POINTS/' + pointsName
        });
    }
);

//
// Map.addLayer(classification.select('classification_' + year), visClass, 'classification ' + year, true);
Map.addLayer(stable, visClass, 'stable', true);
Map.addLayer(selectedRegion, {}, 'region ' + regionId.toString(), true);

Map.addLayer(samplesPointsVis.style({ 'styleProperty': 'style' }), {}, 'aditional samples - points');

// Export polygons to asset
var polygonsName = 'samples-stable-additional-polygons-' + regionId.toString() + '-' + version.output;

Export.table.toAsset({
    "collection": samplesPolygons,
    "description": polygonsName,
    "assetId": assetSamples + '/POLYGONS/' + polygonsName
});

var classifiedStack = ee.Image(classifiedList);

classifiedStack = classifiedStack
    .set('collection_id', 1.0)
    .set('region_id', regionId)
    .set('version', version.classification)
    .set('territory', 'CHILE');

Export.image.toAsset({
    "image": classifiedStack,
    "description": 'CHILE-REGION-' + regionId + '-' + version.output,
    "assetId": assetClass + '/CHILE-REGION-' + regionId + '-' + version.output,
    "scale": 30,
    "pyramidingPolicy": {
        '.default': 'mode'
    },
    "maxPixels": 1e13,
    "region": region
}); 