//
//
var assetRegions = 'projects/mapbiomas-chile/assets/ANCILLARY_DATA/classification-regions';

//
var assetClass = 'projects/mapbiomas-chile/assets/COLLECTION1/classification-beta';

//
var assetStable = 'projects/mapbiomas-chile/assets/COLLECTION1/classification-stable';

// define a region id
var regionId = 2;

var version = {
    'classification': '2',
    'stable': '2'
};

//
var palettes = require('users/mapbiomas/modules:Palettes.js');

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
 * 
 * @param {*} image 
 * @returns 
 */
var calculateNumberOfClasses = function (image) {

    var nClasses = image.reduce(ee.Reducer.countDistinctNonNull());

    return nClasses.rename('number_of_classes');
};

//
//
var classification = ee.ImageCollection(assetClass)
    // .filter(ee.Filter.eq('version', version.classification))
    // .filter(ee.Filter.bounds(region))
    .mosaic()
    .selfMask();

print('classification: ', classification)

// number of classes
var nClasses = calculateNumberOfClasses(classification);

// stable
var stable = classification.select(20).multiply(nClasses.eq(1)).selfMask();

Map.addLayer(classification, {}, 'temporal series', true);
Map.addLayer(stable, visClass, 'stable', true);

stable = stable
    .rename('stable')
    .set('collection_id', 1.0)
    .set('version', version.classification)
    .set('territory', 'CHILE');

Export.image.toAsset({
    "image": stable,
    "description": 'CHILE-STABLE-' + version.stable,
    "assetId": assetStable + '/CHILE-STABLE-' + version.stable,
    "scale": 30,
    "pyramidingPolicy": {
        '.default': 'mode'
    },
    "maxPixels": 1e13,
    "region": region
}); 