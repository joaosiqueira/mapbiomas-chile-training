//
// define a region name
var regionId = 4;

// assets version
var version = {
    'samples': '1',           // input samples
    'aditional_samples': '1', // output samples
    'classification': '1',    // output classification
};

// [0] none
// [0.5] 50% of points
// [0.75] 75% of points
// [1] all points
var classWeights = [
    [59, 0], // 1.1 Bosque Nativo Primario
    [60, 0], // 1.2 Bosque Nativo Secundario/Renovales
    [61, 0], // 2.1 Matorrales
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
// min and max number of samples allowed
var nSamplesAllowed = {
    'min': 200,
    'max': 2000,
};

// random forest parameters
var rfParams = {
    'numberOfTrees': 40, //100
    'variablesPerSplit': 4,
    'minLeafPopulation': 25,
    'seed': 1
}
//
var assetMosaics = 'projects/mapbiomas-chile/assets/MOSAICS/mosaics-2';

//
var assetRegions = 'projects/mapbiomas-chile/assets/ANCILLARY_DATA/classification-regions';

// Classes that will be exported
var assetSamples = 'projects/mapbiomas-chile/assets/COLLECTION1/SAMPLES';

//
var assetClass = 'projects/mapbiomas-chile/assets/COLLECTION1/classification-beta';

//
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

var palettes = require('users/mapbiomas/modules:Palettes.js');

var mapbiomasPalette = palettes.get('classification7');

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
var mosaics = ee.ImageCollection(assetMosaics);
var regions = ee.FeatureCollection(assetRegions);

var selectedRegion = regions.filter(ee.Filter.eq('region_id', regionId));

var region = typeof (userRegion) !== 'undefined' ? userRegion : selectedRegion;

//
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

        var mosaicYear = mosaics
            .filter(ee.Filter.eq('year', year))
            .filter(ee.Filter.bounds(region))
            .mosaic()
            .addBands(slope);

        mosaicYear = mosaicYear.select(featureSpace);

        var trainedSamples = ee.FeatureCollection(
            assetSamples + '/samples-points-region-' + regionId.toString() + '-' + year.toString() + '-' + version.samples);

        // shuffle the points
        var shuffledSamples = shuffle(trainedSamples, 2);

        var weightedSamples = classWeights.map(
            function (classWeight) {
                var classId = classWeight[0];
                var weight = classWeight[1];

                var nSamples = Math.max(Math.round(nSamplesAllowed.max * weight), nSamplesAllowed.min);

                return shuffledSamples.filter(ee.Filter.eq('class', classId))
                    .limit(nSamples);
            }
        );

        var weightedSamples = ee.FeatureCollection(weightedSamples).flatten();

        print(weightedSamples.aggregate_histogram('class'));

        // Collect the spectral information to get the trained samples
        var additionalTrainedSamples = mosaicYear.reduceRegions({
            'collection': aditionalTrainingPoints,
            'reducer': ee.Reducer.first(),
            'scale': 30,
        });

        additionalTrainedSamples = additionalTrainedSamples.filter(ee.Filter.notNull(['green_median_texture']));

        // merge stable and additional training samples
        var allTrainedSamples = weightedSamples.merge(additionalTrainedSamples);

        var numberOfClassRemaining = ee.Number(weightedSamples.aggregate_count_distinct('class'));

        var classifier = ee.Classifier.smileRandomForest(rfParams)
            .train(allTrainedSamples, 'class', featureSpace);

        var classified = ee.Algorithms.If(
            allTrainedSamples.size().gt(0),
            ee.Algorithms.If(
                numberOfClassRemaining.gt(1),
                mosaicYear.classify(classifier),
                ee.Image(0)
            ),
            ee.Image(0)
        );

        classified = ee.Image(classified).rename('classification_' + year.toString());

        classifiedList.push(classified);

        Map.addLayer(mosaicYear, visMos, year + ' ' + regionId.toString(), false);
        Map.addLayer(classified, visClass, year + ' ' + regionId.toString() + ' ' + 'class', false);

        // visualize points using mapbiomas color palette
        var samplesPointsVis = weightedSamples.map(
            function (feature) {
                return feature.set('style', {
                    'color': ee.List(mapbiomasPalette).get(feature.get('class')),
                    'width': 1,
                });
            }
        );

        Map.addLayer(samplesPointsVis.style({ 'styleProperty': 'style' }), {}, 'weighted samples - ' + year.toString(), false);

        // Export points to asset
        var pointsName = 'samples-points-' + regionId.toString() + '-' + year.toString() + '-aditional-' + version.aditional_samples;

        Export.table.toAsset({
            "collection": allTrainedSamples,
            "description": pointsName,
            "assetId": assetSamples + '/' + pointsName
        });
    }
);

var classifiedStack = ee.Image(classifiedList);

classifiedStack = classifiedStack
    .set('collection_id', 1.0)
    .set('version', version.classification)
    .set('territory', 'CHILE');

Export.image.toAsset({
    "image": classifiedStack,
    "description": 'CHILE-' + regionId + '-' + version.classification,
    "assetId": assetClass + '/CHILE-' + regionId + '-' + version.classification,
    "scale": 30,
    "pyramidingPolicy": {
        '.default': 'mode'
    },
    "maxPixels": 1e13,
    "region": region
}); 