/**
 * Namespace: Framework_Map
 *
 * Framework_Map is a JavaScript library to provide a set of functions to build
 *  a Framework Web Site.
 *
 * $Id: /var/www/html/columbia/javascripts/usgs/framework_map.js, v 2.17 2026/04/19 16:22:32 llorzol Exp $
 * $Revision: 2.17 $
 * $Date: 2026/04/19 16:22:32 $
 * $Author: llorzol $
*/

/*
###############################################################################
# Copyright (c) Oregon Water Science Center
# 
# Permission is hereby granted, free of charge, to any person obtaining a
# copy of this software and associated documentation files (the "Software"),
# to deal in the Software without restriction, including without limitation
# the rights to use, copy, modify, merge, publish, distribute, sublicense,
# and/or sell copies of the Software, and to permit persons to whom the
# Software is furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included
# in all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
# OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
# THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
# FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
# DEALINGS IN THE SOFTWARE.
###############################################################################
*/

var markerLayer;
var profileLayer;
var boundaryLayer;
var StudyBoundary
var longlats           = [];

var myZoomFlag         = false;
var maxZoomLevel       = 16;

var sliderValue        = 50;
        
var removecButtonUrl   = 'css/usgs/images/removeLocation.png';
var xsecButtonUrl      = 'css/usgs/images/xsec.png';

var studyAreaCoordinates = [];

// Prepare when the DOM is ready 
//
function buildMap () {
    // Loading message
    //
    message = "Processing framework information ";
    openModal(message);

    fadeModal(2000);
    closeModal();

    myLogger.info("Building map");

    jQuery("#lat").attr("placeholder", "Latitude").val("");
    jQuery("#long").attr("placeholder", "Longitude").val("");

    // Create the map object
    //
    map = new L.map('map', { scrollWheelZoom: false, zoomControl: false});

    // Create map pane for cell log markers and cross-section lines
    //
    dummyPane = map.createPane('markerAndSections');
    map.getPane('markerAndSections').style.zIndex = 620;
    
    // Add markerLayer and cross-section line
    //
    markerLayer  = new L.LayerGroup();
    profileLayer = new L.LayerGroup();

    // Create map pane for study boundary
    //
    dummyPane = map.createPane('studyBoundary');
    map.getPane('studyBoundary').style.pointerEvents = 'none';
    map.getPane('studyBoundary').style.zIndex = 600;

    boundaryLayer = L.geoJson(StudyBoundary, {
        pane: 'studyBoundary',
        style: { color: "#f00", weight: 2, opacity: 0.7, fillOpacity: 0.0 }
    });

    // Set the bounds
    //
    map.fitBounds(boundaryLayer.getBounds());
    myLogger.info(boundaryLayer.getBounds());

    boundaryLayer.addTo(map).bringToFront();

    // Surfical Geology overlay
    //
    dummyPane = map.createPane('surficalGeology');
    map.getPane('surficalGeology').style.pointerEvents = 'none';
    map.getPane('surficalGeology').style.zIndex = 610;
    
    //let surficalGeologyUrl = 'gis/maptiles/{z}/{x}/{y}.png'
    var surficalGeology = L.tileLayer(surficalGeologyUrl, {
        pane: 'surficalGeology',
        tms: true,
        attribution: 'USGS',
        opacity: `${sliderValue / 100}`,
        alt: 'surfical geology'
    }).addTo(map);

    // Set initial opacity to 0.5 (Optional)
    //
    var opacityValue = sliderValue / 100;
    surficalGeology.setOpacity(opacityValue);

    // Slider for surfical geology
    //
    var controlGeologyOpacity = new L.Control.OpacitySlider(surficalGeology,
                                                            {
                                                                sliderImageUrl: "css/usgs/images/opacity-slider.png",
                                                                backgroundColor: "rgba(229, 227, 223, 0.9)",
                                                                opacity: sliderValue,
                                                                position: 'topright'
                                                            });
    controlGeologyOpacity.addTo(map);
    $('.opacity-control').prop('title','Move to change opacity of the surface geology on map');
    $('.opacity-control').prepend('<span>Surface Geology</span>');
    $('.opacity-control').on('click', function(evt) {
        console.log('controlGeologyOpacity')
        console.log(controlGeologyOpacity.opacity)
        opacity = controlGeologyOpacity.opacity
        surficalGeology.setOpacity(opacity);
    });
    
    // Add base map
    //
    map.addLayer(USGSTopoBasemap);

    // Add the control for background base maps
    //
    let baseMaps = {};
    let overlayMaps = {};
    for(let i = 0; i < basemapNameArray.length; i++) {
        baseMaps[basemapNameArray[i][1]] = basemapObj[basemapNameArray[i][0]]
    }
    let layerControl = L.control.layers(baseMaps, overlayMaps).addTo(map);

    // Add mini map
    //
    let miniMaps = {};
    for(let i = 0; i < MinimapNameArray.length; i++) {
        miniMaps[MinimapNameArray[i][1]] = minimapObj[MinimapNameArray[i][0]]
    }
    let miniMap = new L.Control.MiniMap(USGSTopoMinimap, { toggleDisplay: true }).addTo(map)

    // Add home button
    //
    var zoom_bar = new L.Control.ZoomBar({position: 'topleft'}).addTo(map);

    // Add zoom to your location
    //
    var myLocate = L.control.locate({
        drawCircle: false,
        drawMarker: false,
        returnToPrevBounds: true,
        clickBehavior: { outOfView: 'stop' },
        onLocationOutsideMapBounds: function(context) { // called when outside map boundaries
            message = context.options.strings.outsideMapBoundsMsg;
            openModal(message);
            console.log(message);
        },
        strings: {
            title: "Move and zoom to your location",
            outsideMapBoundsMsg: "You seem located outside the boundaries of the map"
        }
    }).addTo(map);

    // Remove locations tool
    //
    var removeLocationTool = L.easyButton({
        id: 'removeLocationTool',
        states: [{
            icon: 'fa',
            title: 'Click to remove existing locations on map',
            onClick: function(control) {
                resetCrossSection(markerLayer, profileLayer);
            }
        }]
    }).addTo(map);
    $('#removeLocationTool').addClass('removeLocationTool');

    // Cross section tool
    //
    var xsecTool = L.easyButton({
        id: 'xsecTool',
        states: [{
            icon: 'fa',
            title: 'Click to make cross section between locations on map',
            onClick: function(control) {
                buildXsec(markerLayer, profileLayer);
            }
        }]
    }).addTo(map);
    $('#xsecTool').css({
        "width": "30px",
        "height": "30px",
        "object-fit": "scale-down",
        "background-image": "url(css/usgs/images/xsec.png)",
        "background-size": "contain"
    });

    // Map bounds for geocoding tool
    //
    const bounds = map.getBounds();

    // Create the geocoding control and add it to the map
    //
    var searchControl = new GeoSearch.GeoSearchControl({
        provider: new GeoSearch.OpenStreetMapProvider(),
        showMarker: false,
        autoClose: true,
        searchLabel: "Enter address or latitude/longitude"
    })
    map.addControl(searchControl);
    $(".leaflet-control-geosearch form input").css('min-width', '400px');
    $(".leaflet-control-geosearch form button").remove();
    $(".leaflet-control-geosearch a").html('');
    //$(".leaflet-control-geosearch a").html('<i class="bi bi-search searchPng"></i>')
    $(".leaflet-control-geosearch a").html('<img src="leaflet-geosearch/search.svg" class="searchPng">')
    //$(".leaflet-control-geosearch a").html('<i class="fa-solid fa-magnifying-glass"></i>')
    $(".leaflet-control-geosearch a").css('font-size', '2.5rem');

    map.on('geosearch/showlocation', function(data) {
        console.log("geocoding results ",data);

        if('location' in data)
        {
            var myAddress = { latlng: { lng: data.location.x,  lat: data.location.y } };
        }
    });
    
    // Zoom message
    //
    $("#map").on("mouseover", function () {
        if(!myZoomFlag) {
            myZoomFlag = true
            message = "Use Shift-Left Mouse Drag: Select a region by pressing the Shift key and dragging the left mouse button"
            openModal(message);
            fadeModal(1000);
        }
    });

    // Show initial map zoom level
    //
    //jQuery(".mapZoom" ).html( "<b>Zoom Level: </b>" + map.getZoom());

    // Refresh on extent change
    //
    map.on('zoomend dragend', function(evt) {
        var mapZoomLevel =  map.getZoom();
        if(mapZoomLevel > maxZoomLevel) {
            surficalGeology.setOpacity(0.0);
        }
        else
        {
            surficalGeology.setOpacity(controlGeologyOpacity.opacity);
        }
        myLogger.info(`Zoom level ${map.getZoom()}`)
        //jQuery( ".mapZoom" ).html( "<b>Zoom Level: </b>" + map.getZoom());
        //jQuery( ".latlng" ).html(evt.latlng.lng.toFixed(3) + ", " + evt.latlng.lat.toFixed(3));
    });

    // Show mouse coordinates
    //
    map.on('mousemove', function(evt) {
	jQuery( ".latlng" ).html(evt.latlng.lng.toFixed(3) + ", " + evt.latlng.lat.toFixed(3));
    });

    // Show zoom to area tool
    //
    jQuery('.leaflet-control-zoom-to-area').on('click', function(evt) {
        console.log('zoom-to-area')
        console.log(evt)
    });

    // Enable cell log on click
    //
    map.on('click', function(evt) {
        jQuery('.leaflet-control-zoom-to-area').on('zoomend dragend', function(evt) {
            console.log('zoom-to-area')
            console.log(evt)
        });
        myLogger.info("Clicked");
        myLogger.info(`Zoom level ${map.getZoom()}`)
        onMapClick(markerLayer, evt);
    });
}

function userCoords() 
  {
    // Check coordinates
    //
    var user_longitude = jQuery("#long").prop("value");
    var user_latitude  = jQuery("#lat").prop("value");
  
    // if(user_latitude.length != 6 || user_latitude.indexOf('.') >= 0 || jQuery.isNumeric(user_latitude) === false)
    if(jQuery.isNumeric(user_latitude) === false && jQuery.isNumeric(user_longitude) === false)
      {
       jQuery("#lat").attr("placeholder", "Latitude").val("");   
       jQuery("#long").attr("placeholder", "Longitude").val("");   
       var message = "Please enter a six-digit number for latitude and longitude DMS (341098 degrees minutes seconds no spaces)";
       openModal(message);
       fadeModal(3000);
       return;
      }
  
    if(jQuery.isNumeric(user_latitude) === false)
      {
       jQuery("#lat").attr("placeholder", "Latitude").val("");   
       var message = "Please enter a six-digit number for latitude DMS (341098 degrees minutes seconds no spaces)";
       openModal(message);
       fadeModal(3000);
       return;
      }
    if(user_latitude.substr(0,1) == '-')
      {
       user_latitude = user_latitude.substr(1);
      }
  
    // if(user_longitude.length < 6 || user_longitude.length > 7 || user_longitude.indexOf('.') >= 0 || jQuery.isNumeric(user_longitude) === false)
    if(jQuery.isNumeric(user_longitude) === false)
      {
       jQuery("#long").attr("placeholder", "Longitude").val("");   
       var message = "Please enter a six-digit number for longitude DMS (902210 degrees minutes seconds no spaces)";
       openModal(message);
       fadeModal(3000);
       return;
      }
    if(user_longitude.substr(0,1) == '-')
      {
       user_longitude = user_longitude.substr(1);
      }

    // Translate map click location to model grid coordinates
    //
    //console.log("Coords " + user_longitude + " " + user_latitude);
    // var coords = DMS2dec(user_longitude, user_latitude);

    if(user_latitude.indexOf('.') == 0 || user_longitude.indexOf('.') == 0)
        {
            var coords = DMS2dec(user_longitude, user_latitude);
        }
    else
        {
            var coords = [];
            coords[0] = user_latitude;
            coords[1] = user_longitude;
        }

    //console.log("Coords " + coords[1] + " " + coords[0]);
    var lat    = coords[0];
    var long   = coords[1];
    if (long > 0){
        long = long * -1;
    }

    var coordinates            = User2User(
                                           { "x": long, "y": lat },
                                           latlong_projection,
                                           raster_projection
                                          );


    // Point inside model grid
    //
      if(isPointInPoly(boundaryLayer, [long, lat]))
      {                                              
        // Place marker on map
        //
        marker = L.circle([lat, long], 
                          2, 
                          {
                           color: 'red',
                           fillColor: '#f03',
                           zIndexOffset: 999,
                           fillOpacity: 0.9
                          });
  
        // Add marker
        //
        markerLayer.addLayer(marker);
        map.addLayer(markerLayer);
 
        // Request cell log
        //
        var url = "well_log.html?";
        url    += "longitude=" + long;
        url    += "&latitude=" + lat;
        url    += "&x_coordinate=" + coordinates[0];
        url    += "&y_coordinate=" + coordinates[1];

        window.open(url);
      }
                                
    // Point outside raster grid
    //
    else
      { 
       var message = "Point is located outside the boundaries of the Model grid";
       openModal(message);
       fadeModal(3000);
       return;
      }
}

function onMapClick(markerLayer, evt) 
  {
   if(evt)
     {
      // Translate map click location to model grid coordinates
      //
      var long                   = evt.latlng.lng;
      var lat                    = evt.latlng.lat;
  
      var coordinates            = User2User(
                                             { "x": long, "y": lat },
                                             latlong_projection,
                                             raster_projection
                                            );
  
      // Point inside raster grid
      //
      if(isPointInPoly(boundaryLayer, [long, lat]))
        {                                              
          // Place marker on map
          //
          marker = L.circle([lat, long], 
                            2, 
                            {
                             pane: 'markerAndSections',
                             color: 'red',
                             fillColor: '#f03',
                             zIndexOffset: 999,
                             fillOpacity: 0.9
                            });
    
          // Add marker
          //
          markerLayer.addLayer(marker);
          map.addLayer(markerLayer);
   
          // Request cell log
          //
          var url = "framework_cell_log.html?";
          url    += "longitude=" + long;
          url    += "&latitude=" + lat;
          url    += "&x_coordinate=" + coordinates[0];
          url    += "&y_coordinate=" + coordinates[1];
          //url    += "&color_file=" + color_file;
  
          //url    += "?" + (new Date()).getTime();
          //alert("URL " + url);
          window.open(url);
        }
                                  
      // Point outside model grid
      //
      else
        { 
         var message = "Point is located outside the boundaries of the Model grid";
         openModal(message);
         fadeModal(5000);
         return;
        }
    }
}

function updateLegend(v, currentMap, updateType) {

    //jQuery("#overlayMenu.sw").append('<li role="presentation" id="' + curSiteTypeInfo.overlayLayerName + '" class="' + curSiteTypeInfo.overlayLayerName  + '"><a role="menuitem" tabindex="-1"><div name="overlayLayers" ><img src="' + curSiteTypeInfo.singleMarkerURL + '"/><span>' + curSiteTypeInfo.legendLayerName + '</span></div></li>');}

}

function buildXsec(markerLayer, profileLayer)
  { 
   // Need two or more markers
   //
   if(markerLayer.getLayers().length < 2) 
     { 
      var message = "Need two or more locations in order to build a cross section";
      openModal(message);
      fadeModal(5000);
      return;
     }

   // Clear line segments
   //
   if(profileLayer.getLayers().length > 0)
      {
        map.removeLayer(profileLayer);
        profileLayer.clearLayers();
      }

   // Loop through markers
   //
   var i           = 0;
   var markers     = [];
   var points_txt  = [];
   var longlat_txt = [];

   markerLayer.eachLayer(function (layer)
                         {
                           var layer_id = layer._leaflet_id;
                           var color = "red";
                           i++;
                           if(i == 1 || i >=  markerLayer.getLayers().length )
                             {
                               color = "blue";
                             }

                           layer.setStyle({
                                           color: color,
                                           fillColor: color
                                          });
                           
                           //alert("markerLayer long " + layer.getLatLng().toString());
                           //alert("markerLayer long " + layer.getLatLng().lng);

                           var long = layer.getLatLng().lng;
                           var lat  = layer.getLatLng().lat;
                           markers.push([long, lat]);

                           var coordinates = User2User(
                                                       { "x": long, "y": lat },
                                                       latlong_projection,
                                                       raster_projection
                                                      );
                                    
                           points_txt.push( coordinates[0] + "," + coordinates[1] );
                           longlat_txt.push( long + "," + lat );
                         });

   // Add cross section line to map
   //
   var geojsonFeature = {
            "type": "Feature",
            "properties": {
                "ID": 1
            },
            "geometry": {
                "type": "LineString",
                "coordinates": markers
            }};

   var profile = L.geoJson(geojsonFeature, 
                           {
                               pane : 'markerAndSections',
                              style: {
                                      color: "red",
                                      weight: 4
                                     }
                            });

   profileLayer.addLayer(profile);
   map.addLayer(profileLayer);
 
   // Request cell log
   //
   var url = "framework_xsec.html?";
   url    += "longlats=" + longlat_txt.join(" ");
   url    += "&points=" + points_txt.join(" ");
   //url    += "&color_file=" + color_file;
   //url    += "?" + (new Date()).getTime();
   //alert("URL " + url);
   window.open(url);
  }

function resetCrossSection(markerLayer, profileLayer)
  { 
   // Clear markers and line segments
   //
   if(markerLayer.getLayers().length > 0)
      {
       map.removeLayer(markerLayer);
       markerLayer.clearLayers();

       if(profileLayer.getLayers().length > 0)
          {
            map.removeLayer(profileLayer);
            profileLayer.clearLayers();
          }

       var message = "Removing all locations, please begin again. ";
       openModal(message);
       fadeModal(2000);
       return;
      }
  }
 
// Determine if a point is within Model grid
//
function isPointInPoly(poly, pt) {
    
    if(leafletPip.pointInLayer(pt, poly).length > 0) return true;
    else return false;
}