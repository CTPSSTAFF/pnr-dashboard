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
var mgis_basemap_layers = { 'topo_features'     : null,     // bottom layer
                            'structures'        : null,     
                            'basemap_features'  : null,     // on top of 'structures' so labels aren't obscured
                            'parcels'           : null      // unused; not populated
};

// OpenLayers layer for OpenStreetMap basesmap layer
var osm_basemap_layer = null; 

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
        case 'massgis_basemap' :
            osm_basemap_layer.setVisible(false); 
            mgis_basemap_layers['topo_features'].setVisible(true);
            mgis_basemap_layers['structures'].setVisible(true);
            mgis_basemap_layers['basemap_features'].setVisible(true);
            break;        
        case 'osm_basemap' :
            mgis_basemap_layers['topo_features'].setVisible(false);
            mgis_basemap_layers['structures'].setVisible(false);
            mgis_basemap_layers['basemap_features'].setVisible(false);
            osm_basemap_layer.setVisible(true);   
            break;
        default:
            break;
    }   
} // toggle_basemap()

//various functions to be used in the ajax calls

//fix -1/0/null 

//concatenate mode columns

//if only lot info, don't put out N/A put out a string


// On-change event handler for combo box of MBTA stations
function details_for_station(e) {
    var value = +$("#mbta_stations").val();
    var text = $("#mbta_stations option:selected").text();
    
    // Submit WFS request to get data for station, and pan/zoom map to it.
    // Note that these are *point* features.
	var cqlFilter = "(st_num='" + value + "')";
	var szUrl = szWFSserverRoot + '?';
		szUrl += '&service=wfs';
		szUrl += '&version=1.0.0';
		szUrl += '&request=getfeature';
		szUrl += '&typename=ctps_pg:ctps_pnr_station_points';
		szUrl += '&srsname=EPSG:3857';  // NOTE: We reproject the native geometry of the feature to the SRS of the map.
		szUrl += '&outputformat=json';
		szUrl += '&cql_filter=' + cqlFilter;
	
	//These are polygon features - lots associated with the station.
	var lotUrl = szWFSserverRoot + '?';
		lotUrl += '&service=wfs';
		lotUrl += '&version=1.0.0';
		lotUrl += '&request=getfeature';
		lotUrl += '&typename=ctps_pg:ctps_pnr_lots_polygons';
		lotUrl += '&srsname=EPSG:3857';  // NOTE: We reproject the native geometry of the feature to the SRS of the map.
		lotUrl += '&outputformat=json';
		lotUrl += '&cql_filter=' + cqlFilter;
    
	//ajax request for points
	$.ajax({ url		: szUrl,
			 type		: 'GET',
			 dataType	: 'json',
			 success	: 	function (data, textStatus, jqXHR) {	
                                var reader, aFeatures = [], props = {}, point, coords, view, size;
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
                                // Since it is a point feature there is no "bounding box" to which to zoom,
                                // so we arbitrarily choose a zoom level of 16. 
                                point = aFeatures[0].getGeometry();
                                coords = point.getCoordinates();                               
                                view = ol_map.getView();                               
                                size = ol_map.getSize();
                                view.centerOn(coords, size, [ size[0]/2, size[1]/2 ]);
                                view.setZoom(16);
                                // For the time being just dump some attribute info into the "output_div."
                                // This is, obviously, not what we'll be doing in the finished product.
                                // First, clear output_div before putting the newly fethed data into it.
                                $('#output_div').html(''); 
                                var tmp;
                                tmp = '<h4>Data for ' + props['stan_addr'] + ' Station</h4>';
                                tmp += '<p>Line: ' + props['lines'] + '<\p>';
								tmp += '<p>ST NUM: ' + props['st_num'] + '<\p>';
								tmp += '<p>ST CODE: ' + props['st_code'] + '<\p>';
								tmp += '<p>Station Mode: ' + props[''] + '<\p>'; // this is split into several columns
								tmp += '<p>Number of Spaces: ' + props['numberspaces'] + '<\p>';
								tmp += '<p>Number of Bikes Present: ' + props['numberbikes'] + '<\p>';
								tmp += '<p>Bicycle Rack Types Present: ' + props['rack_type'] + '<\p>';
								tmp += '<p>How Many Other Locations?: ' + props['otherlocations_howmany'] + '<\p>';
								tmp += '<p>Bike Trail Nearby?: ' + props['biketrail_yn'] + '<\p>';
								tmp += '<p>Bike Lanes Leading to Station?: ' + props['bikelanes_yn'] + '<\p>';
								tmp += '<p>Sidewalks Leading to Station?: ' + props['sidewalks_yn'] + '<\p>';
								tmp += '<p>Sidewalk Condition: ' + props['sidewalks_cond'] + '<\p>';
								tmp += '<p>Crosswalks Leading to Station?: ' + props['crosswalks_yn'] + '<\p>';
								tmp += '<p>Crosswalk Condition: ' + props['crosswalks_cond'] + '<\p>';
								tmp += '<p>Signal Near Station?: ' + props['sigints_yn'] + '<\p>';
								tmp += '<p>Pedestrian Signal Near Station?: ' + props['sigints_pedind_yn'] + '<\p>';
								//replace values of -1 with Yes and make undefined/null nicer
								tmp_r = tmp.replace(/ -1/g, " Yes")
								tmp_rr = tmp_r.replace(/undefined|null/g, " No Data Collected")
								
                                $('#output_div').html(tmp_rr);   
                                // And open the "Station and Lot Information" accordion panel (panel #1)
                                $('#accordion').accordion("option", "active", 1)
                            }, // success handler
            error       :   function (qXHR, textStatus, errorThrown ) {
								alert('WFS request to get data for ' + text + 'failed.\n' +
										'Status: ' + textStatus + '\n' +
										'Error:  ' + errorThrown);
							} // error handler 
    });   
	//ajax request for lots
	$.ajax({ url		: lotUrl,
			 type		: 'GET',
			 dataType	: 'json',
			 success	: 	function (data, textStatus, jqXHR) {	
                                var reader, aFeatures = [], props = {}, point, coords, view, size;
								reader = new ol.format.GeoJSON();
								aFeatures = reader.readFeatures(jqXHR.responseText);
								if (aFeatures.length === 0) {
									alert('WFS request to get data for station ' + text + ' returned no features.');
									$('#output_div_lots').html('');
									return;
								} else if (aFeatures.length > 1) {
                                    alert('WFS request to get data for station lots ' + text + ' returned ' + aFeatures.length + ' features.');
                                    //return;
                                }
								
								// For the time being just dump some attribute info into the "output_div."
								// This is, obviously, not what we'll be doing in the finished product.
								// First, clear output_div before putting the newly fetched data into it.
								$('#output_div_lots').html(''); 
								
								var tmp_1 = '';//putting outside the loop to be filled multiplicitously
								for (i=0; i < aFeatures.length; i++){
									props = aFeatures[i].getProperties();
			
									tmp_1 += '<h4>Data for ' + props['station_name'] + ' Lot</h4>';
									//tmp_1 += '<p>Station Name: ' + props['station_name'] + '<\p>';
									tmp_1 += '<p>Lot ID: ' + props['lot_id'] + '<\p>';
									tmp_1 += '<p>Line ID: ' + props['line_id'] + '<\p>';
									tmp_1 += '<p>Mode: ' + props['mode'] + '<\p>'; // this is split into several columns
									tmp_1 += '<p>Parking Space Non-HP: ' + props['parking_space_non_hp_1'] + '<\p>';
									tmp_1 += '<p>Used Spaces Non-HP: ' + props['used_spaces_non_hp_1'] + '<\p>';
									tmp_1 += '<p>HP Parking Spaces: ' + props['hp_parking_spaces_1'] + '<\p>';
									tmp_1 += '<p>Used HP Parking Spaces: ' + props['used_hp_parking_spaces_1'] + '<\p>';
									tmp_1 += '<p>Total Spaces: ' + props['total_spaces_1'] + '<\p>';
									tmp_1 += '<p>Total Used Spaces: ' + props['total_used_spaces_1'] + '<\p>';
									tmp_1 += '<p>Total Utilization - All Parking: ' + props['total_utilization_all_parking_1'] + '<\p>';
									tmp_1 += '<p>Public Parking No HP Spaces: ' + props['publicparkingnohp_spaces_1'] + '<\p>';
									tmp_1 += '<p>Public Parking No HP Vehicles: ' + props['publicparkingnohp_vehicles_1'] + '<\p>';
									tmp_1 += '<p>Public Parking No HP Utilization: ' + props['publicparkingnohp_utilization_1'] + '<\p>';
									tmp_1 += '<p>Cars Not in Marked Spaces: ' + props['cars_not_in_marked_spaces_1'] + '<\p>';
									tmp_1 += '<p>Lot Ownership: ' + props['lot_ownership_1'] + '<\p>';
									tmp_1 += '<p>Parking Fee: $' + props['parking_fee_1'] + '<\p>';
									
								}//end of for loop looping through json response
								
								
                                $('#output_div_lots').html(tmp_1);   
                                // And open the "Station and Lot Information" accordion panel (panel #1)
                                $('#accordion').accordion("option", "active", 1)
                            }, // success handler
            error       :   function (qXHR, textStatus, errorThrown ) {
								alert('WFS request to get data for ' + text + 'failed.\n' +
										'Status: ' + textStatus + '\n' +
										'Error:  ' + errorThrown);
							} // error handler 
    });   
} // details_for_station()


// Function: initialize()
//     0. Initialize the jQueryUI accordion control
//     1. Initialize OpenLayers map, gets MassGIS basemap service properties by executing AJAX request
//     2. Populate combo box of MBTA rapid transit stations, execute WFS request via AJAX to get relevant data
//     3. Arm event handlers for UI controls
//
function initialize() {  
    // 0. Initialize the jQueryUI accordion control
    $('#accordion').accordion({ active: 0, collapsible : true, multiple : true });

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

        // Layer 1 - topographic features
        var layerSource;
        layerSource = new ol.source.XYZ({ attributions: [attribution], projection: projection,
                                          tileSize: tileSize, tileGrid: tileGrid,
                                          tileUrlFunction: tileUrlFunction, urls: urls });
                          
        mgis_basemap_layers['topo_features'] = new ol.layer.Tile();
        mgis_basemap_layers['topo_features'].setSource(layerSource);
        mgis_basemap_layers['topo_features'].setVisible(true);
        
        // We make the rash assumption that since this set of tiled basemap layers were designed to overlay one another,
        // their projection, extent, and resolutions are the same.
        
         // Layer 2 - structures
        urls = [mgis_serviceUrls['structures'] += suffix];  
        layerSource = new ol.source.XYZ({ attributions: [attribution], projection: projection,
                                          tileSize: tileSize, tileGrid: tileGrid,
                                          tileUrlFunction: tileUrlFunction, urls: urls });;
        mgis_basemap_layers['structures'] = new ol.layer.Tile();
        mgis_basemap_layers['structures'].setSource(layerSource); 
        mgis_basemap_layers['structures'].setVisible(true);          
        
        
        // Layer 3 - "detailed" features - these include labels
        urls = [mgis_serviceUrls['basemap_features'] += suffix];  
        layerSource = new ol.source.XYZ({ attributions: [attribution], projection: projection,
                                          tileSize: tileSize, tileGrid: tileGrid,
                                          tileUrlFunction: tileUrlFunction, urls: urls });                                  
        mgis_basemap_layers['basemap_features'] = new ol.layer.Tile();
        mgis_basemap_layers['basemap_features'].setSource(layerSource);
        mgis_basemap_layers['basemap_features'].setVisible(true);
              
                       
        // Layer 4 - parcels - WE (CURRENTLY) DO NOT USE THIS LAYER
        // Code retained for references purposes only
/*
        urls = [mgis_serviceUrls['parcels'] += suffix];
        layerSource = new ol.source.XYZ({ attributions: [attribution], projection: projection,
                                          tileSize: tileSize, tileGrid: tileGrid,
                                          tileUrlFunction: tileUrlFunction, urls: urls });;
        mgis_basemap_layers['parcels'] = new ol.layer.Tile();
        mgis_basemap_layers['parcels'].setSource(layerSource);  
        mgis_basemap_layers['parcels'].setVisible(true);
*/

        // Create OpenStreetMap base layer
        osm_basemap_layer = new ol.layer.Tile({ source: new ol.source.OSM() });
        osm_basemap_layer.setVisible(false);

        // Create OpenLayers map
        ol_map = new ol.Map({ layers: [  osm_basemap_layer,
                                         mgis_basemap_layers['topo_features'],
                                         mgis_basemap_layers['structures'],
                                         mgis_basemap_layers['basemap_features']
                                      ],
                               target: 'map',
                               view:   new ol.View({ center: ol.proj.fromLonLat([-71.0589, 42.3601]), zoom: 11 })
                            });              
    }});
    
    // 2. Populate combo box of MBTA stations (rapid transit, commuter rail, and a few others),
    //    submit WFS request via AJAX to get relevant data
	var szUrl = szWFSserverRoot + '?';
		szUrl += '&service=wfs';
		szUrl += '&version=1.0.0';
		szUrl += '&request=getfeature';
		szUrl += '&typename=ctps_pg:ctps_pnr_station_points';
        szUrl += '&propertyname=st_num,stan_addr';  // The only attribute we need to populate the combo box is the station name
		szUrl += '&outputformat=json';
	
	$.ajax({ url		: szUrl,
			 type		: 'GET',
			 dataType	: 'json',
			 success	: 	function (data, textStatus, jqXHR) {	
								var reader = {}, aFeatures = [], i, props, aStationNames = [], tmp, feature_id, stn_name;
                                reader = new ol.format.GeoJSON();
								aFeatures = reader.readFeatures(jqXHR.responseText);
								if (aFeatures.length === 0) {
									alert('WFS request to get list of MBTA stations returned no features.');
									return;
								}  
                                // Get an alphabetically sorted array of station names
                                for (i = 0; i < aFeatures.length; i++) {
                                    tmp = { 'id' : 0, 'station' : '' };
                                    props = aFeatures[i].getProperties();
                                    feature_id = props['st_num'];
                                    stn_name = props['stan_addr'];
                                    tmp.id = feature_id;
                                    tmp.station = stn_name;
                                    aStationNames.push(tmp);
                                }
                                aStationNames.sort(function(a,b) { 
                                    if(a.station < b.station) { return -1; }
                                    if(a.station > b.station) { return 1; }
                                    return 0;
                                });
                                for (i = 0; i < aStationNames.length; i++) {
                                    $('#mbta_stations').append($('<option>', { value: aStationNames[i].id,     
                                                                               text : aStationNames[i].station  }));  
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
