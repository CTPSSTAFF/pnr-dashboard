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

// Define OpenLayers vector layer - will overlay the base layer
var oHighlightLayer = new ol.layer.Vector({source: new ol.source.Vector({ wrapX: false }) });
// Define style for vector layer, and set the vector layer's style to it
var myVectorStyle = new ol.style.Style({ fill	: new ol.style.Fill({ color: 'rgba(193,66,66,0.4)' }), 
                                         stroke : new ol.style.Stroke({ color: 'rgba(0,0,255,1.0)', width: 3.0})
                                       });
oHighlightLayer.setStyle(myVectorStyle);

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
function neg_zero_null(val) {
	var ret = null;
	if (val == "-1") {
		ret = "Yes";
	} else if (val == "0") {
		ret = "No";
	} else {
		ret = "Unknown";
	}
	return ret;
}//end neg_zero_null

//concatenate mode columns
function mode_concat(f1, f2, f3, f4) {
	var mode = '';
	var modes_arr = [f1, f2, f3, f4];
	var filt_modes_arr = modes_arr.filter(function (el) {
		return el != null;
	});
	
	for (i = 0; i < filt_modes_arr.length; i++) {
		//console.log(modes_arr)
		//console.log(filt_modes_arr.length)
		console.log(filt_modes_arr[i])
		if (filt_modes_arr[i] != null) {
			if (filt_modes_arr[i] == "RT") {
				if (filt_modes_arr.length > 1){
					mode += "Rapid Transit, ";
				} else {
					mode += "Rapid Transit";
				}
			} else if (filt_modes_arr[i] == "CR") {
				console.log("CR")
				mode += "Commuter Rail";
			} else if (filt_modes_arr[i] == "BRT") {
				console.log("BRT")
				if (filt_modes_arr[i-1] == "CR"){
					mode += ", Bus Rapid Transit";
				} else {
					mode += "Bus Rapid Transit ";
				}
			} else if (filt_modes_arr[i] == "F") {
				console.log("F")
				mode += "Ferry";
			} else if (filt_modes_arr[i] == "BUS") {
				console.log("Bus")
				mode += "Bus";
			}
			//mode += modes_arr[i];
			//mode += " ";
		}
		console.log(mode)
	}
	return mode;
}//end mode_concat


//if null for a station field - used if not all fields are null
function no_data_str(data) {
	var out_str;
	if (data == null || data == '') {
		out_str = 'Unknown';
	} else {
		out_str = data
	}
	return out_str
}

function myformatter(x) {
	x = x*100;
	x = x.toFixed(0);
	x = x+'%';
	return x
}

function myDollar(x) {
	if (x==0) {
		x = 'Permit Only'
	} else {
		x = x.toFixed(1);
		x = '$'+x;
	}
	return x
	
}

// 'success' handler for WFS request for LOTS data
function success_handler_for_lots_data(data, textStatus, jqXHR) {	
	var text = $("#mbta_stations option:selected").text();
    var reader, aFeatures = [], props = {}, point, coords, view, size;
    reader = new ol.format.GeoJSON();
    aFeatures = reader.readFeatures(jqXHR.responseText);
    if (aFeatures.length === 0) {
        alert('WFS request to get data for lots at station ' + text + ' returned no features.');
        $('#output_div_lots').html('');
        return;
    }
    
    // Clear out any previous data that might be left in the "output_div_lots" div
    $('#output_div_lots').html(''); 
    
    var i;
	var data = []; //create an array to put objects in
	//get the source for the vector layer
	var vSource = oHighlightLayer.getSource();
	//Clear anything that might previously be in the vector layer
    vSource.clear();
    for (i=0; i < aFeatures.length; i++){
		vSource.addFeature(aFeatures[i]);
		
        props = aFeatures[i].getProperties();
		var obj = {station_name: props['station_name'], lot_id: props['lot_id'], line_id: props['line_id'], mode: props['mode'],
					pp_nohp_spaces: props['publicparkingnohp_spaces_1'],
					pp_nohp_veh: props['publicparkingnohp_vehicles_1'], pp_nohp_util: props['publicparkingnohp_utilization_1'],
					parking_space_non_hp: props['parking_space_non_hp_1'], used_non_hp_spaces: props['used_spaces_non_hp_1'],
					hp_parking_spaces: props['hp_parking_spaces_1'], used_hp_spaces: props['hp_parking_spaces_1'], total_spaces: props['total_spaces_1'],
					total_used_spaces: props['total_used_spaces_1'], utilization: props['total_utilization_all_parking_1'], 
					cars: props['cars_not_in_marked_spaces_1'], lot_own: props['lot_ownership_1'], park_fee: myDollar(props['parking_fee_1'])};
		data.push(obj);
		
		var myColDesc = [ { dataIndex: "station_name", header: "Station Name", style: "width:100px", cls : "colClass" },
						{ dataIndex: "lot_id", header: "Lot ID", cls : "colClass" },
						{ dataIndex: "line_id",  header: "Line ID", style: "width:100px", cls : "colClass"},
						{ dataIndex: "mode", header: "Mode", cls : "colClass" },
						{ dataIndex: "pp_nohp_spaces", header: "Public Parking No HP Spaces", cls : "colClass" },
						{ dataIndex: "pp_nohp_veh", header: "Public Parking No HP Vehicles", cls : "colClass" },
						{ dataIndex: "pp_nohp_util", header: "Public Parking No HP Utilization", cls : "colClass",renderer: myformatter  },
						{ dataIndex: "parking_space_non_hp", header: "Parking Space Non-HP", cls : "colClass" },
						{ dataIndex: "used_non_hp_spaces", header: "Used Spaces Non-HP", cls : "colClass" },
						{ dataIndex: "hp_parking_spaces", header: "HP Parking Spaces", cls : "colClass" },
						{ dataIndex: "used_hp_spaces", header: "Used HP Parking Spaces", cls : "colClass" },
						{ dataIndex: "total_spaces", header: "Total Spaces", cls : "colClass" },
						{ dataIndex: "total_used_spaces", header: "Total Used Spaces", cls : "colClass" },
						{ dataIndex: "utilization", header: "Total Utilization - All Parking", cls : "colClass", renderer: myformatter },
						{ dataIndex: "cars", header: "Cars Not In Marked Spaces", cls : "colClass" },
						{ dataIndex: "lot_own", header: "Lot Ownership", cls : "colClass" },
						{ dataIndex: "park_fee", header: "Parking Fee", cls : "colClass" },
                    ];
                      
		var myOptions = { divId:   "output_div_lots",
                      tableId: "table_1",
                      caption: "Lot Information for " +props['station_name']+ ':',
                      summary: "This table is really cool.",
                      colDesc: myColDesc,
					  capcls: "capClass"
                    };

    } //end of for loop looping through json response
    //set the source of the vector layer to the data accumulated in the loop
	oHighlightLayer.setSource(vSource);
	
    // For the time being just dump some attribute info into the "output_div."
    // This is, obviously, not what we'll be doing in the finished product.
    // First, clear output_div before putting the newly fetched data into it.
	$('#output_div_lots').accessibleGrid(myColDesc, myOptions, data);

    console.log("Generation of accessible table has completed."); 
    
    // Note that the LOTS data is put into accordion panel #2
    // Here, we open accordion panel #2 ... but we need to think if this is really what we want to do...
    $('#accordion').accordion("option", "active", 2)
} // success_handler_for_lots_data()


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
		szUrl += '&typename=ctps_pg:ctps_pnr_stations_points';
		szUrl += '&srsname=EPSG:3857';  // NOTE: We reproject the native geometry of the feature to the SRS of the map.
		szUrl += '&outputformat=json';
		szUrl += '&cql_filter=' + cqlFilter;
	
	//ajax request for STATION points
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
                            
                                // First, clear output_div before putting the newly fetched data into it.
                                
                                // This is too large a sledgehammer for now! -- BK 5/1/2020
                                // $('#output_div').html(''); 
                                // So, use this:
                                $('.station_data').html('');
                                $('#output_div_lots').html(''); 
                                
                              
								$('#station_name').html(props['stan_addr']);
								$('#lines').html(props['lines']);
								$('#st_num').html(props['st_num']);
								$('#st_code').html(props['st_code']);
								$('#mode').html(mode_concat(props['mode_rt'],props['mode_cr'],props['mode_brt'],props['mode_other']));
                              
								if (props['healthy'] != 0) {
									$('.hide').show();
                                    $('#number_of_bike_spaces').html(no_data_str(props['numberspaces']));
									$('#number_of_bikes').html(no_data_str(props['numberbikes']));
									$('#bike_racks').html(no_data_str(props['rack_type']));
									$('#other_locations').html(no_data_str(props['otherlocations_howmany']));
									$('#bike_trail').html(neg_zero_null(props['biketrail_yn']));
									$('#bike_lanes').html(neg_zero_null(props['bikelanes_yn']));
									$('#sidewalks').html(neg_zero_null(props['sidewalks_yn']));
									$('#sidewalk_cond').html(props['sidewalks_cond']);
									$('#crosswalks').html(neg_zero_null(props['crosswalks_yn']));
									$('#crosswalk_cond').html(no_data_str(props['crosswalks_cond']));
									$('#signal').html(neg_zero_null(props['sigints_yn']));
									$('#ped_signal').html(neg_zero_null(props['sigints_pedind_yn']));
									//$('#').html();
									
									
								} else {
									$('#no_data').html('No Bicycle Parking Data Collected at This Station')
									$('.hide').hide();
								}
				
                                // And open the "Station and Lot Information" accordion panel (panel #1)
                                $('#accordion').accordion("option", "active", 1)
                                
                                // Having retrieved and rendered the data for the STATION,
                                // we now retrieve and render the data for any LOTS associated with it.
                                var lotUrl = szWFSserverRoot + '?';
                                lotUrl += '&service=wfs';
                                lotUrl += '&version=1.0.0';
                                lotUrl += '&request=getfeature';
                                lotUrl += '&typename=ctps_pg:ctps_pnr_lots_polygons';
                                lotUrl += '&srsname=EPSG:3857';  // Reproject native SRS of data to SRS of map
                                lotUrl += '&outputformat=json';
                                lotUrl += '&cql_filter=' + cqlFilter;
								
                               
                                if (props['lots'] != 0) {
									// ajax request for LOTS data
									$.ajax({ url		: lotUrl,
											 type		: 'GET',
											 dataType	: 'json',
														  // 'success' handler for WFS request for LOTS data
														  // is defined out-of-line, above
											 success	: success_handler_for_lots_data,
														  // 'error' handler for WFS request for LOTS data
														  // is defined here, in-line right here
											 error      : function (qXHR, textStatus, errorThrown ) {
															alert('WFS request to get LOTS data for ' + text + 'failed.\n' +
																  'Status: ' + textStatus + '\n' +
																  'Error:  ' + errorThrown);
														  }
									}); // End of 'inner' WFS request - for LOTS data
								};
								
                            }, // end of 'success' handler for 'outer' WFS request - for STATION data 
            error       :   function (qXHR, textStatus, errorThrown ) {
								alert('WFS request to get STATION data for ' + text + 'failed.\n' +
										'Status: ' + textStatus + '\n' +
										'Error:  ' + errorThrown);
							} // error handler for WFS request for STATION data
    });  // End of 'outer' WFS request - for STATION data
} // details_for_station()








// Function: initialize()
//     0. Initialize the jQueryUI accordion control
//     1. Initialize OpenLayers map, gets MassGIS basemap service properties by executing AJAX request
//     2. Populate combo box of MBTA rapid transit stations, execute WFS request via AJAX to get relevant data
//     3. Arm event handlers for UI controls
//
function initialize() {  
    // 0. Initialize the jQueryUI accordion control
    $('#accordion').accordion({ active: 0, collapsible : true, multiple : true, heightStyle : "content" });

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
                                         mgis_basemap_layers['basemap_features'],
										 oHighlightLayer
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
		szUrl += '&typename=ctps_pg:ctps_pnr_stations_points';
        szUrl += '&propertyname=st_num,stan_addr,town,town_id';  // The only attribute we need to populate the stations combo box is the station name
		szUrl += '&outputformat=json';
	
	$.ajax({ url		: szUrl,
			 type		: 'GET',
			 dataType	: 'json',
			 success	: 	function (data, textStatus, jqXHR) {	
								var reader = {}, aFeatures = [], i, props, aStationNames = [], tmp, feature_id, stn_name, tmpb, propb, town_id, town, townNames = [];
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
								// Get an alphabetically sorted array of area names
                                for (i = 0; i < aFeatures.length; i++) {
                                    tmpb = { 'town_id' : 0, 'town' : '' };
                                    propb = aFeatures[i].getProperties();
                                    town_id = propb['town_id'];
                                    town = propb['town'];
                                    tmpb.town_id = town_id;
                                    tmpb.town = town;
                                    townNames.push(tmpb);
                                }
                                townNames.sort(function(a,b) { 
                                    if(a.town < b.town) { return -1; }
                                    if(a.town > b.town) { return 1; }
                                    return 0;
                                });
                                for (i = 0; i < townNames.length; i++) {
                                    $('#area').append($('<option>', { value: townNames[i].town_id,     
                                                                      text : townNames[i].town  }));  
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
