/**
 * Namespace: Framework_Cell_Log
 *
 * Framework_Cell_Log is a JavaScript library to build a single column of 
 *  framework information from the subsurface geologic layers.
 *
 * Special layout for MERAS project (addition line in explanation table for
 *  link to correlation web page CURRENTLY DISABLED).
 *
 * version 2.13
 * March 21, 2025
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
// Prevent jumping to top of page when clicking a href
//
jQuery('.noJump a').click(function(event){
   event.preventDefault();
});

// loglevel
//
let myLogger = log.getLogger('myLogger');
//myLogger.setLevel('debug');
myLogger.setLevel('info');

var rasters      = myGeologicFramework.rasters;
var aboutFiles   = myGeologicFramework.wellLogFiles;
var color_file   = myGeologicFramework.color_file;
var explanation  = myGeologicFramework.explanation;
var rasterList   = myGeologicFramework.rasterL;

var longitude;
var latitude;
var x_coordinate;
var y_coordinate;

var map;
var configuration      = '{ "type": "map", "layers": { "group": { "name": "well log", "type": "marker", "details": "lat: -360, lng: -180", "latlng": [ -360, -180 ] } } }';

var map_options        = '{ "controls": { "zoom": false, "layers": { "autoZIndex": false, "sortLayers": false },';
map_options           += ' "attribution": { "prefix": "<a href= "https://github.com/gherardovarando/leaflet-map-builder"> leaflet-map-builder</a>" } },';
map_options           += ' "tooltip": { "marker": false, "polyline": false, "polygon": false, "circle": false, "rectangle": false }, ';
map_options           += ' "popup": { "marker": true, "polyline": false, "polygon": false, "circle": false, "rectangle": false     } }';

// Prepare when the DOM is ready 
//
$(document).ready(function() {
    // Loading message
    //
    message = "Preparing cell log information";
    openModal(message);

    // Build ajax requests
    //
    var webRequests  = [];

    // Insert accordion text
    //
    jQuery.each(aboutFiles, function(keyItem, keyFile) {

        // Request for accordion text information
        //
        var request_type = "GET";
        var script_http  = keyFile + "?_="+(new Date()).valueOf();
        var data_http    = "";
        var dataType     = "text";

        // Web request
        //
        webRequests.push($.ajax( {
            method:   request_type,
            url:      script_http,
            data:     data_http,
            dataType: dataType,
            success: function (myData) {
                message = "Processed framework information";
                openModal(message);
                fadeModal(2000);
                //myLogger.info(`Help text file ${keyFile} ${myData}`);

                jQuery("#" + keyItem).html(myData);
            },
            error: function (error) {
                message = `Failed to load framework information ${error}`;
                openModal(message);
                fadeModal(2000);
                return false;
            }
        }));
    });


    // Run ajax requests
    //
    $.when.apply($, webRequests).then(function() {

        fadeModal(2000);

        // Build cell log
        //
        createLog();
    });

  });
 
// Create Log
//
function createLog () {

    myLogger.info(`createLog ${rasters}`);

    // Parse url
    //-------------------------------------------------
    let url = new URL(window.location.href);
    myLogger.info(`Current Url ${window.location.href}`);
    myLogger.info(`Current Params ${url.searchParams}`);
    myLogger.info(`Current Params ${url.searchParams.has("longlats")}`);
    myLogger.info(`Current Params ${url.searchParams.has("points")}`);
    
    // Url contains all arguments
    //-------------------------------------------------
    if(url.searchParams.has("longitude") &&
       url.searchParams.has("latitude") &&
       url.searchParams.has("x_coordinate") &&
       url.searchParams.has("y_coordinate")) {

        // Set selected option
        //-------------------------------------------------
        longitude = url.searchParams.get("longitude")
        latitude  = url.searchParams.get("latitude")
        x_coordinate = url.searchParams.get("x_coordinate")
        y_coordinate = url.searchParams.get("y_coordinate")

        // Request for cell log information
        //
        var request_type = "GET";
        script_http      = "/cgi-bin/columbia/framework_well_log.pl";
        script_http      = "/cgi-bin/frameworkService/framework_cell_log.py";
        let data_http    = "";
        data_http   += `longitude=${longitude}`;
        data_http   += `&latitude=${latitude}`;
        data_http   += `&x_coordinate=${x_coordinate}`;
        data_http   += `&y_coordinate=${y_coordinate}`;
        data_http   += `&rasters=${rasters}`;

        let dataType    = "json";

        myLogger.info(`Request for cell log information ${script_http} ${data_http}`);

        webRequest(request_type, script_http, data_http, dataType, BuildCellGeometry);
    }

  }
 
function BuildCellGeometry(json_data)
  { 
   console.log("BuildCellGeometry");
   console.log(json_data);

   // No subsurface
   //
   if(json_data.status != "success") 
     {
      let message = json_data.message;
      if(json_data.error) {message = json_data.error;}
      if(json_data.warning) {message = json_data.warning;}

      openModal(message);
      fadeModal(3000);
      return;
     }

   // Check for returning warning or error
   //
   let message = json_data.warning;
   if(message) 
     {
      openModal(message);
      fadeModal(3000);
      return;
     }

   // Close modal dialog
   //
   closeModal();

   // No cell records
   //
   if(json_data.cell_log.length <= 0)
     {
      let warning  = "<p><b>No cell geometry for this row " + row + " and column " + col + "</b></p>";
      warning     += "<p><b>    All cells inactive</b></p>";
      openModal(message);
      return;
     }

    // Add definitions
      //
      let myData = json_data.cell_log;
      for(let i = 0; i < myData.length; i++) {
          let myRecord = myData[i]
          let unit = myRecord.unit
          if(explanation[unit]) {
              myRecord.id = unit
              myRecord.symbol = explanation[unit].symbol
              myRecord.color = explanation[unit].color
              myRecord.description = explanation[unit].description
          }
          //myLogger.info(`Lithology ${description} Top ${top_elev} Bottom ${bot_elev} Symbol ${symbol} Color ${color}`);
      }
      myLogger.info(myData);

   // Page title
   //
   // let title = "Subsurface Information at Longitude " + parseFloat(longitude).toFixed(6) + " Latitude " + parseFloat(latitude).toFixed(6);
   let title = "Subsurface Information at Longitude " + parseFloat(longitude) + " Latitude " + parseFloat(latitude);
   jQuery(document).prop("title", title);
   jQuery("#page_title").html(title);

    // Cell log
    //
    plotCellLog(myData);

    // Location map
    //
    locationMap(latitude, longitude);

    // Location map
    //
    buildExplanation(myData);
  }
  
function showTooltip(name, x, y, contents) 
  {
    //alert("Tooltip " + contents + " at (" + x + ", " + y + ")");
    jQuery('<div id="tooltip">' + contents + '</div>').css( {
              top: y + 5,
              left: x + 5
          }).appendTo("#" + name).fadeIn(200);
  }

function locationMap(latitude, longitude)
  {
   //console.log("locationMap " + longitude + " " + latitude);

   let map = L.map('locationMap').setView([latitude, longitude], 8);
   map.scrollWheelZoom.disable();    

   L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    {
      maxZoom: 17,
      minZoom: 9
    }).addTo(map);

   let color  = "#f06c00";
   let radius = 5;

   let circle = L.circleMarker([latitude, longitude], 
                               { 
                                radius: radius,
                                color: color,
                                fillColor: color,
                                fillOpacity: 0.15
   }).addTo(map);
      
  // Add surficalGeology to base map
  //
  //let imageUrl = 'grids/geotest_rgb.png';
  let imageUrl = 'gis/geomap.tif';
  let imageTxt = 'For Surface Geology see<a href="https://www.usgs.gov/publications/three-dimensional-model-geologic-framework-columbia-plateau-regional-aquifer-system">Burns and others (2010)</a>';

  let imageBounds  = [
      [48.4194482, -121.8449579],
      [44.2608524, -115.3669151]
  ];

   // Surfical Geology overlay
   //
   let surficalGeology = L.imageOverlay(imageUrl,
                                        imageBounds
                                       ).addTo(map).bringToFront();        

   // Set initial opacity to 0.25 (Optional)
   //
   let opacityValue = 0.3;
   surficalGeology.setOpacity(opacityValue);	  

  }

function buildExplanation(cells) {

    myLogger.info('buildExplanation');
    myLogger.info('Cell log');
    myLogger.info(cells);


    // Build explanation
    //
    let i = 0;
    let legend_html = [];
    legend_html.push('<table id="legend" class="cell_table border border-black border-2 rounded-4 shadow-lg">');
    legend_html.push(' <caption>' + "Explanation" + '</caption>');

    legend_html.push(' <thead class="fw-bold text-center">');
    legend_html.push(' <tr>');
    legend_html.push('  <th>Top<sup>1</sup></th>');
    legend_html.push('  <th>Bottom<sup>1</sup></th>');
    legend_html.push('  <th>Elevation</th>');
    legend_html.push('  <th>Thickness</th>');
    legend_html.push('  <th>Geologic Unit</th>');
    legend_html.push(' </tr>');
    legend_html.push(' </thead>');

    legend_html.push(' <tbody class="fw-medium">');

    // Set color specification array
    //
    let top = 0;
    for(i = 0; i < cells.length; i++) {

        let id          = cells[i].unit;
        let label       = id;
        let unit        = cells[i].unit;
        let top_elev    = cells[i].top_elev;
        let bot_elev    = cells[i].bot_elev;
        let symbol      = explanation[unit].symbol;
        let color       = explanation[unit].color;
        let description = explanation[unit].description;
        
        let top_depth   = cells[i].top_depth;
        let bot_depth   = cells[i].bot_depth;
        let thickness   = cells[i].thickness;

      console.log(`Unit ${unit} top ${top_depth} bottom ${bot_depth} color ${color} description ${description}`);

      // Build explanation
      //
      legend_html.push(` <tr id="${id}" bgcolor="${color}">`);

      legend_html.push(' <td>');
      legend_html.push(`  <div class="text-end"> ${Math.abs(top_depth).toFixed(0)} </div>`);
      legend_html.push(' </td>');

      if(bot_depth) {
        legend_html.push(' <td>');
        legend_html.push(`  <div class="text-end"> ${Math.abs(bot_depth).toFixed(0)} </div>`);
        legend_html.push(' </td>');
      }
      else {
        legend_html.push(' <td>');
        legend_html.push('  <div class="text-center">not determined</div>');
        legend_html.push(' </td>');
      }

      legend_html.push(' <td>');
        legend_html.push(`  <div class="text-end">${top_elev.toFixed(0)}</div>`);
      legend_html.push(' </td>');

      if(thickness) {
        legend_html.push(' <td>');
          legend_html.push(`  <div class="text-end">${Math.abs(thickness).toFixed(0)}</div>`);
        legend_html.push(' </td>');
      }
      else
      {
        legend_html.push(' <td>');
        legend_html.push('  <div class="text-center">not determined</div>');
        legend_html.push(' </td>');
      }

      legend_html.push(' <td style="background-color:#FFFFFF">');
        legend_html.push(`  <div id="label_${label}" class="legendLabel">${description}</div>`);
      legend_html.push(' </td>');

      legend_html.push(' </tr>');
    }

    legend_html.push(' <tr><td class="text-start" colspan="5"><sup>1</sup>' + "Values are depth below land surface, in feet" + '</td></tr>');
    //legend_html.push(' <tr><td id="cell_bottom" colspan="5"><a href="aq_names.html">Geologic correlation</a></td></tr>');
    legend_html.push(' </tbody>');
    legend_html.push('</table>');

    jQuery("#cell_table").html(legend_html.join("\n"));

    $("table tr").on("mouseenter",
                     function(){
                         let id = $(this).prop('id');
                         if(id) {
                             d3.selectAll("#" + id)
                                 .transition()
                                 .duration(100)
                                 .attr('stroke-width', 4)
                                 .attr('stroke', 'yellow')
                         } })
        .on("mouseleave",  function(){
            let id = $(this).prop('id');
            if(id) {
                d3.selectAll("#" + id)
                    .transition()
                    .duration(100)
                    .attr('stroke-width', 1)
                    .attr('stroke', 'black')
            } })
}
