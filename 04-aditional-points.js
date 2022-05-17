//
var year = 2017;

//
var assetMosaics = 'projects/nexgenmap/MapBiomas2/LANDSAT/CHILE/mosaics';

//
var assetGrids = 'projects/mapbiomas-workspace/AUXILIAR/CHILE/grids';

// Classes that will be exported
var assetSamples = 'projects/mapbiomas-workspace/CHILE/SAMPLES';

//
var assetClass = 'projects/mapbiomas-workspace/CHILE/classification-beta';
var assetStable = 'projects/mapbiomas-workspace/CHILE/classification-stable/CHILE-stable-1';

// define a region name
var gridName = "SJ-19-V-A";

var nTrainingPoints = 2000;   // Number of points to training
var nValidationPoints = 500;   // Number of points to validate

var version = {
    'classification': '1'
};

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

//
var palettes = require('users/mapbiomas/modules:Palettes.js');

var mosaics = ee.ImageCollection(assetMosaics);
var grids = ee.FeatureCollection(assetGrids);

var selectedGrid = grids.filter(ee.Filter.eq('grid_name', gridName));

var region = typeof (userRegion) !== 'undefined' ? userRegion : selectedGrid;

var mapbiomasPalette = palettes.get('classification6');

//
var visClass = {
    'min': 0,
    'max': 49,
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
//
var classification = ee.ImageCollection(assetClass)
    .filter(ee.Filter.eq('version', version.classification))
    .filter(ee.Filter.bounds(region))
    .mosaic();

print('number_of_classified grids: ', classification)

// stable
var stable = ee.Image(assetStable);

// Add mosaic for each year
years.forEach(
    function (year) {
        var mosaicYear = mosaics
            .filter(ee.Filter.eq('year', year))
            .filter(ee.Filter.bounds(region))
            .mosaic();

        Map.addLayer(mosaicYear, visMos, year + ' ' + gridName, false);
    }
);

var stableSamplesPoints = stratifiedPoints(stable, nTrainingPoints, region);

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
visClass.bands = ['classification_' + year];

Map.addLayer(classification, visClass, 'classification ' + year, true);
Map.addLayer(stable, visClass, 'stable', true);
Map.addLayer(grids, {}, 'grids', false);
Map.addLayer(selectedGrid, {}, gridName, true);

Map.addLayer(stableSamplesPointsVis.style({ 'styleProperty': 'style' }), {}, 'stable samples - points');
Map.addLayer(samplesPointsVis.style({ 'styleProperty': 'style' }), {}, 'aditional samples - points');
