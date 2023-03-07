// save the script with the name of the grid_name in the FOLDER of your institution
//
//
var assetMosaics = 'projects/mapbiomas-chile/assets/MOSAICS/mosaics-2';

//
var assetRegions = 'projects/mapbiomas-chile/assets/ANCILLARY_DATA/classification-regions';

// Classes that will be exported
var assetSamples = 'projects/mapbiomas-chile/assets/COLLECTION1/SAMPLES/BASE';

// Define a region id (1,2,3,4)
var regionId = 1;

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
    2016, 2017, 2018, 2019, 2020,
    2021
];

// Version that will be saved
var versionOutput = 4;

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

var palettes = require('users/mapbiomas/modules:Palettes.js');

var mosaics = ee.ImageCollection(assetMosaics);
var regions = ee.FeatureCollection(assetRegions);

var selectedRegion = regions.filter(ee.Filter.eq('region_id', regionId));

var mapbiomasPalette = palettes.get('classification6');

/**
 * List of feature collection you must should for sample collection
 */
var region = typeof (userRegion) !== 'undefined' ? userRegion : selectedRegion;

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
    .filter(ee.Filter.bounds(region));

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

var terrain = ee.Image("JAXA/ALOS/AW3D30_V1_1").select("AVE");
var slope = ee.Terrain.slope(terrain);

// Add mosaic for each year
years.forEach(
    function (year) {
        var mosaicYear = mosaics
            .filter(ee.Filter.eq('year', year))
            .filter(ee.Filter.bounds(region))
            .mosaic()
            .addBands(slope);

        Map.addLayer(mosaicYear, visMos, year.toString() + ' region ' + regionId.toString(), false);

        // Collect the spectral information to get the trained samples
        var trainedSamples = mosaicYear.reduceRegions({
            'collection': samplesPoints,
            'reducer': ee.Reducer.first(),
            'scale': 30,
        });

        trainedSamples = trainedSamples.filter(ee.Filter.notNull(['green_median_texture']));

        // Export points to asset
        var pointsName = 'samples-points-' + regionId.toString() + '-' + year.toString() + '-' + versionOutput;

        Export.table.toAsset({
            "collection": trainedSamples,
            "description": pointsName,
            "assetId": assetSamples + '/' + pointsName
        });

    }
);

Map.addLayer(selectedRegion, {}, 'region ' + regionId.toString(), true);

Map.addLayer(samplesPointsVis.style({ 'styleProperty': 'style' }), {}, 'samples - points');

// Export polygons to asset
var polygonsName = 'samples-polygons-' + regionId.toString() + '-' + versionOutput;

Export.table.toAsset({
    "collection": samplesPolygons,
    "description": polygonsName,
    "assetId": assetSamples + '/' + polygonsName
});