//
var asset = 'projects/nexgenmap/MapBiomas2/LANDSAT/CHILE/mosaics';

var collection = ee.ImageCollection(asset);

var years = [
    1982, 1983, 1984, 1985, 1986, 1987, 1988, 1989,
    1990, 1991, 1992, 1993, 1994, 1995, 1996, 1997,
    1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005,
    2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013,
    2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021
].reverse();

var vis = {
    'bands': ['swir1_median', 'nir_median', 'red_median'],
    'gain': [0.08, 0.06, 0.2],
    'gamma': 0.75
};

var width = Math.round(1920 / 15).toString();
var height = Math.round(1080 / 3).toString();

var maps = years.map(
    function (year) {

        var subcollection = collection.filter(ee.Filter.eq('year', year));

        var mosaic = subcollection.mosaic();

        var map = ui.Map({
            'style': {
                "border": '1px solid gray',
                "width": width + 'px',
                "height": height + 'px',
            }
        });

        map.setControlVisibility({ 'all': false });

        map.add(ui.Label(String(year), {
            'position': 'bottom-left',
            'fontWeight': 'bold'
        }));

        map.addLayer(mosaic, vis, String(year));

        return map;
    }
);

var linker = ui.Map.Linker(maps);

// Add the maps and title to the ui.root.
ui.root.widgets().reset(maps);

ui.root.setLayout(ui.Panel.Layout.Flow('horizontal', true));

maps[0].setCenter(-71.33, -39.27, 3);
//