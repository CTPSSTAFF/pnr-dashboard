// Park-and-Ride Data Browser
//


// URLs for MassGIS basemap layer services
var mgis_serviceUrls = { 
    'topo_features'     :  "https://tiles.arcgis.com/tiles/hGdibHYSPO59RG1h/arcgis/rest/services/MassGIS_Topographic_Features_for_Basemap/MapServer",
    'basemap_features'  :  "https://tiles.arcgis.com/tiles/hGdibHYSPO59RG1h/arcgis/rest/services/MassGIS_Basemap_Detailed_Features/MapServer",
    'structures'        :  "https://tiles.arcgis.com/tiles/hGdibHYSPO59RG1h/arcgis/rest/services/MassGIS_Structures/MapServer",
    'parcels'           :  "https://tiles.arcgis.com/tiles/hGdibHYSPO59RG1h/arcgis/rest/services/MassGIS_Level3_Parcels/MapServer"
};

// OpenLayers layers for MassGIS basemap layers used in our map
var mgis_basemap_layers = { 'layer1' : null,
                            'layer2' : null,
                            'layer3' : null,
                            'layer4' : null 
};

// OpenLayers layer for OpenStreetMap basesmap layer
var osm_basemap_layer = new ol.layer.Tile({ source: new ol.source.OSM() });

// Varioius things for WMS and WFS layers
// First, folderol to allow the app to run on appsrvr3 as well as "in the wild"
szServerRoot = location.protocol + '//' + location.hostname;
if (location.hostname.includes('appsrvr3')) {   
    szServerRoot += ':8080/geoserver/';    
} else {
    szServerRoot += '/maploc/';    
}
szWMSserverRoot = szServerRoot + '/wms'; 
szWFSserverRoot = szServerRoot + '/wfs'; 


// OpenLayers 'map' object:
var ol_map = null;


// On-change event handler for radio buttons to chose basemap
function toggle_basemap(e) {
    switch($(this).val()) {
        case 'osm_basemap' :
            mgis_basemap_layers['layer1'].setVisible(false);
            mgis_basemap_layers['layer2'].setVisible(false);
            mgis_basemap_layers['layer3'].setVisible(false);
            mgis_basemap_layers['layer4'].setVisible(false);
            osm_basemap_layer.setVisible(true);   
            break;
        case 'massgis_basemap' :
            osm_basemap_layer.setVisible(false); 
            mgis_basemap_layers['layer1'].setVisible(true);
            mgis_basemap_layers['layer2'].setVisible(true);
            mgis_basemap_layers['layer3'].setVisible(true);
            mgis_basemap_layers['layer4'].setVisible(false);
            break;
        default:
            break;
    }   
} // toggle_basemap()

// On-change event handler for combo box of MBTA stations
function details_for_station(e) {
    var value = $("#mbta_stations").val();
    var text = $("#mbta_stations option:selected").text();
    
    // Submit WFS request to get data for station, and pan/zoom map to it.
    // Note that these are *point* features.
	var cqlFilter = "(station='" + text + "')";
	var szUrl = szWFSserverRoot + '?';
		szUrl += '&service=wfs';
		szUrl += '&version=1.0.0';
		szUrl += '&request=getfeature';
		szUrl += '&typename=ctps_pg:mgis_mbta_node';
		szUrl += '&srsname=EPSG:3857';              // NOTE: We reproject the native geometry of the feature to the SRS of the map.
		szUrl += '&outputformat=json';
		szUrl += '&cql_filter=' + cqlFilter;
        
	$.ajax({ url		: szUrl,
			 type		: 'GET',
			 dataType	: 'json',
			 success	: 	function (data, textStatus, jqXHR) {	
                                var reader, aFeatures = [], props = {}, point, coordds, view, size;
								reader = new ol.format.GeoJSON();
								aFeatures = reader.readFeatures(jqXHR.responseText);
								if (aFeatures.length === 0) {
									alert('WFS request to get data for station ' + text + ' returned no features.');
									return;
								} else if (aFeatures.length > 1) {
                                    alert('WFS request to get data for station ' + text + ' returned ' + aFeatures.length + ' features.');
                                    return;
                                }
                                props = aFeatures[0].getProperties();
                                // We center the map on the feature.
                                // Since it is a point feature, we arbitrarily choose a zoom level of 16. 
                                point = aFeatures[0].getGeometry();
                                coords = point.getCoordinates();                               
                                view = ol_map.getView();                               
                                size = ol_map.getSize();
                                view.centerOn(coords, size, [ size[0]/2, size[1]/2 ]);
                                view.setZoom(16);
                                // For the time being just dump some attribute info into the "output_div."
                                // This is, obviously, not what we'll be doing in the finished product.
                                // First, lear output_div before putting the newly fethed data into it.
                                $('#output_div').html(''); 
                                var tmp;
                                tmp = '<h3>Data for ' + props['station'] + 'Station</h3>';
                                tmp += '<p>Line: ' + props['line'] + '<\p>';
                                tmp += '<p>Route: ' + props['route'] + '<\p>';
                                tmp += '<p>';
                                tmp += props['terminus'] === 'T' ? 'This is a terminal station' : 'This is not a terminal station.';
                                tmp += '<\p>'
                                $('#output_div').html(tmp);   
                            }, // success handler
            error       :   function (qXHR, textStatus, errorThrown ) {
								alert('WFS request to get data for ' + text + 'failed.\n' +
										'Status: ' + textStatus + '\n' +
										'Error:  ' + errorThrown);
							} // error handler 
    });
    
} // details_for_station()


// Function: initialize()
//     1. Initialize OpenLayers map, gets MassGIS basemap service properties by executing AJAX request
//     2. Populate combo box of MBTA rapid transit stations, execute WFS request via AJAX to get relevant data
//     3. Arm event handlers for UI controls
//
function initialize() {  
    // 1. Initialize OpenLayers map, gets MassGIS basemap service properties by executing AJAX request
    $.ajax({ url: mgis_serviceUrls['topo_features'], jsonp: 'callback', dataType: 'jsonp', data: { f: 'json' }, 
             success: function(config) {     
        // Body of "success" handler starts here.
        // Get resolutions
        var tileInfo = config.tileInfo;
        var resolutions = [];
        for (var i = 0, ii = tileInfo.lods.length; i < ii; ++i) {
            resolutions.push(tileInfo.lods[i].resolution);
        }               
        // Get projection
        var epsg = 'EPSG:' + config.spatialReference.wkid;
        var units = config.units === 'esriMeters' ? 'm' : 'degrees';
        var projection = ol.proj.get(epsg) ? ol.proj.get(epsg) : new ol.proj.Projection({ code: epsg, units: units });                              
        // Get attribution
        var attribution = new ol.control.Attribution({ html: config.copyrightText });               
        // Get full extent
        var fullExtent = [config.fullExtent.xmin, config.fullExtent.ymin, config.fullExtent.xmax, config.fullExtent.ymax];
        
        var tileInfo = config.tileInfo;
        var tileSize = [tileInfo.width || tileInfo.cols, tileInfo.height || tileInfo.rows];
        var tileOrigin = [tileInfo.origin.x, tileInfo.origin.y];
        var urls;
        var suffix = '/tile/{z}/{y}/{x}';
        urls = [mgis_serviceUrls['topo_features'] += suffix];               
        var width = tileSize[0] * resolutions[0];
        var height = tileSize[1] * resolutions[0];     
        var tileUrlFunction, extent, tileGrid;               
        if (projection.getCode() === 'EPSG:4326') {
            tileUrlFunction = function tileUrlFunction(tileCoord) {
                var url = urls.length === 1 ? urls[0] : urls[Math.floor(Math.random() * (urls.length - 0 + 1)) + 0];
                return url.replace('{z}', (tileCoord[0] - 1).toString()).replace('{x}', tileCoord[1].toString()).replace('{y}', (-tileCoord[2] - 1).toString());
            };
        } else {
            extent = [tileOrigin[0], tileOrigin[1] - height, tileOrigin[0] + width, tileOrigin[1]];
            tileGrid = new ol.tilegrid.TileGrid({ origin: tileOrigin, extent: extent, resolutions: resolutions });
        }     

        var layerSource;
        layerSource = new ol.source.XYZ({ attributions: [attribution], projection: projection,
                                          tileSize: tileSize, tileGrid: tileGrid,
                                          tileUrlFunction: tileUrlFunction, urls: urls });
                          
        mgis_basemap_layers['layer1'] = new ol.layer.Tile();
        mgis_basemap_layers['layer1'].setSource(layerSource);
        mgis_basemap_layers['layer1'].setVisible(false);
        
        // We make the rash assumption that since this set of tiled basemap layers were designed to overlay one another,
        // their projection, extent, and resolutions are the same.
       
        // Layer 2 - basemap features
        urls = [mgis_serviceUrls['basemap_features'] += suffix];  
        layerSource = new ol.source.XYZ({ attributions: [attribution], projection: projection,
                                          tileSize: tileSize, tileGrid: tileGrid,
                                          tileUrlFunction: tileUrlFunction, urls: urls });                                  
        mgis_basemap_layers['layer2'] = new ol.layer.Tile();
        mgis_basemap_layers['layer2'].setSource(layerSource);
        mgis_basemap_layers['layer2'].setVisible(false);
        
         // Layer 3 - structures
        urls = [mgis_serviceUrls['structures'] += suffix];  
        layerSource = new ol.source.XYZ({ attributions: [attribution], projection: projection,
                                          tileSize: tileSize, tileGrid: tileGrid,
                                          tileUrlFunction: tileUrlFunction, urls: urls });;
        mgis_basemap_layers['layer3'] = new ol.layer.Tile();
        mgis_basemap_layers['layer3'].setSource(layerSource); 
        mgis_basemap_layers['layer3'].setVisible(false);       
                       
        // Layer 4 - parcels
        urls = [mgis_serviceUrls['parcels'] += suffix];
        layerSource = new ol.source.XYZ({ attributions: [attribution], projection: projection,
                                          tileSize: tileSize, tileGrid: tileGrid,
                                          tileUrlFunction: tileUrlFunction, urls: urls });;
        mgis_basemap_layers['layer4'] = new ol.layer.Tile();
        mgis_basemap_layers['layer4'].setSource(layerSource);  
        mgis_basemap_layers['layer4'].setVisible(false);

        // Create OpenLayers map
        ol_map = new ol.Map({ layers: [  osm_basemap_layer,
                                         mgis_basemap_layers['layer1'],
                                         mgis_basemap_layers['layer2'],
                                         mgis_basemap_layers['layer3'], 
                                         mgis_basemap_layers['layer4']
                                       ],
                               target: 'map',
                               view:   new ol.View({ center: ol.proj.fromLonLat([-71.0589, 42.3601]), zoom: 11 })
                            });              
    }});
    
    // 2. Populate combo box of MBTA rapid transit stations, submit WFS request via AJAX to get relevant data
	var szUrl = szWFSserverRoot + '?';
		szUrl += '&service=wfs';
		szUrl += '&version=1.0.0';
		szUrl += '&request=getfeature';
		szUrl += '&typename=ctps_pg:mgis_mbta_node';
		szUrl += '&outputformat=json';
	
	$.ajax({ url		: szUrl,
			 type		: 'GET',
			 dataType	: 'json',
			 success	: 	function (data, textStatus, jqXHR) {	
								var reader = {}, aFeatures = [], i, props, aStationNames = [];
                                reader = new ol.format.GeoJSON();
								aFeatures = reader.readFeatures(jqXHR.responseText);
								if (aFeatures.length === 0) {
									alert('WFS request to get list of MBTA stations returned no features.');
									return;
								}  
                                // Get an alphabetically sorted array of station names
                                for (i = 0; i < aFeatures.length; i++) {
                                    props = aFeatures[i].getProperties();
                                    aStationNames.push(props['station']);
                                }
                                aStationNames.sort();
                                // The data really should contain some kind of unique per-record ID.
                                // Not sure if the ESRI-assigned OBJECTID will really cut it.
                                // So, simply assinging a unique integer ID, starting with 1.
                                for (i = 0; i < aStationNames.length; i++) {
                                    $('#mbta_stations').append($('<option>', { value: i+1,     
                                                                               text : aStationNames[i]  }));  
                                }
                            }, // success handler
            error		: 	function (qXHR, textStatus, errorThrown ) {
								alert('WFS request to get list of MBTA stations failed.\n' +
										'Status: ' + textStatus + '\n' +
										'Error:  ' + errorThrown);
							} // error handler
    });
       
    // 3. Arm event handlers for UI controls
    // Arm event handler for basemap selection
    $(".basemap_radio").change(toggle_basemap);
    // Arm on-change event handler for combo box of MBTA stations
    $("#mbta_stations").change(details_for_station);
} // initialize()
