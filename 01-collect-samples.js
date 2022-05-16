// save the script with the name of the grid_name in the FOLDER of your institution
//
//
var assetMosaics = 'projects/nexgenmap/MapBiomas2/LANDSAT/CHILE/mosaics';
//
var gridsAsset = 'projects/mapbiomas-workspace/AUXILIAR/CHILE/grids';

// Classes that will be exported
var assetSamples = 'projects/mapbiomas-workspace/CHILE/SAMPLES';

// Define a region name
var gridName = "SJ-19-V-A";

var nTrainingPoints = 2000   // Number of points to training
var nValidationPoints = 500   // Number of points to validate

// Landsat images that will be added to Layers
var years = [
    1985, 1986, 1987, 1988, 1990,
    1991, 1992, 1993, 1994, 1995,
    1996, 1997, 1998, 1999, 2000,
    2001, 2002, 2003, 2004, 2005,
    2006, 2007, 2008, 2009, 2010,
    2011, 2012, 2013, 2014, 2015,
    2016, 2017, 2018, 2019, 2020
];

// Version that will be saved

var versionOutput = 1;

var palettes = require('users/mapbiomas/modules:Palettes.js');

var mosaics = ee.ImageCollection(assetMosaics);
var grids = ee.FeatureCollection(gridsAsset);

var selectedGrid = grids.filter(ee.Filter.eq('grid_name', gridName));

var mapbiomasPalette = palettes.get('classification6');

var visClass = {
    'min': 0,
    'max': 49,
    'palette': mapbiomasPalette
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

// Add mosaic for each year
years.forEach(
    function (year) {
        var mosaicYear = mosaics
            .filter(ee.Filter.eq('year', year))
            .filter(ee.Filter.bounds(selectedGrid.geometry()))
            .mosaic();

        Map.addLayer(mosaicYear, visMos, year + ' ' + gridName, false);
    }
);

Map.addLayer(grids, {}, 'grids', false);
Map.addLayer(selectedGrid, {}, gridName, true);

// Samples
// c03 - florest
// c13 - natural non forest
// c21 - other agriculture
// c25 - other non vegetated
// c33 - water
var samplesList = [
    typeof (c03) !== 'undefined' ? c03 : ee.FeatureCollection([]),
    typeof (c13) !== 'undefined' ? c13 : ee.FeatureCollection([]),
    typeof (c21) !== 'undefined' ? c21 : ee.FeatureCollection([]),
    typeof (c25) !== 'undefined' ? c25 : ee.FeatureCollection([]),
    typeof (c33) !== 'undefined' ? c33 : ee.FeatureCollection([]),
];

print(samplesList);
//------------------------------------------------------------------
// User defined functions
//------------------------------------------------------------------

/**
 * Create a function to collect random point inside the polygons
 * @param {*} polygons 
 * @param {*} nPoints 
 * @returns 
 */
var generatePoints = function (polygons, nPoints) {

    // convert polygons to raster
    var polygonsRaster = ee.Image().paint({
        featureCollection: polygons,
        color: 'class'
    }).rename('class');

    // Generate N random points inside the polygons
    var points = polygonsRaster.stratifiedSample({
        'numPoints': nPoints,
        'classBand': 'class',
        'region': polygons,
        'scale': 30,
        'seed': 1,
        'dropNulls': true,
        'geometries': true
    });

    return points;
};
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
    .filter(ee.Filter.bounds(
        typeof (userRegion) !== 'undefined' ? myRegion : selectedGrid
    ));

// avoid geodesic operation error
samplesPolygons = samplesPolygons.map(
    function (polygon) {
        return polygon.buffer(1, 10);
    }
);

// generate training points
var trainingPoints = generatePoints(samplesPolygons, nTrainingPoints);

// generate validation points
var validationPoints = generatePoints(samplesPolygons, nValidationPoints);

print('trainingPoints', trainingPoints.aggregate_histogram('class'));
print('validationPoints', validationPoints.aggregate_histogram('class'));

// set sample type
trainingPoints = trainingPoints.map(
    function (sample) {
        return sample.set('sample_type', 'training');
    }
);

validationPoints = validationPoints.map(
    function (sample) {
        return sample.set('sample_type', 'validation');
    }
);

// merge training and validation points
var samplesPoints = trainingPoints.merge(validationPoints);

// visualize points using mapbiomas color palette
var samplesPointsVis = samplesPoints.map(
    function (feature) {
        return feature.set('style', {
            'color': ee.List(mapbiomasPalette).get(feature.get('class')),
            'width': 1,
        });
    }
);

Map.addLayer(samplesPointsVis.style({ 'styleProperty': 'style' }), {}, 'samples - points');

// Export polygons to asset
Export.table.toAsset({
    "collection": samplesPolygons,
    "description": gridName + '-samples-polygons-' + versionOutput,
    "assetId": assetSamples + '/' + gridName + '-samples-polygons-' + versionOutput
});

// Export points to asset
Export.table.toAsset({
    "collection": samplesPoints,
    "description": gridName + '-samples-points-' + versionOutput,
    "assetId": assetSamples + '/' + gridName + '-samples-points-' + versionOutput
});