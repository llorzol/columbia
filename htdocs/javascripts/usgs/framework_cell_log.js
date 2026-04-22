/**
 * Namespace: Framework_Cell_Log
 *
 * Framework_Cell_Log is a JavaScript library to build a single column of 
 *  framework information from the subsurface geologic layers.
 *
 * Special layout for MERAS project (addition line in explanation table for
 *  link to correlation web page CURRENTLY DISABLED).
 *
 * $Id: /var/www/html/columbia/javascripts/usgs/framework_cell_log.js, v 2.15 2026/04/22 09:38:41 llorzol Exp $
 * $Revision: 2.15 $
 * $Date: 2026/04/22 09:38:41 $
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

// Prepare global variables 
//
processConfigFile(myGeologicFramework)

// Process project configuration information
//
function processConfigFile(myInfo) {
    myLogger.info("Processing project configuration information");
    myLogger.debug(myInfo);
    for (let key in myInfo) {
        globalThis[key] = myInfo[key]
    }
    myLogger.info(wellLogFiles);

    return;

  }

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
    let urls = [];

    // Insert accordion text
    //
    jQuery.each(wellLogFiles, function(keyItem, keyFile) {

        // Request for accordion text information
        //
        //let Url = `${keyFile} + "?_="+(new Date()).valueOf()`
        let url = `${keyFile}`

        // Web request
        //
        urls.push(`${url}`);
    });

    // Call the async function
    //
    webRequests(urls, 'text', processAboutFiles)
});

// Process about files information
//
function processAboutFiles(myInfo) {
    myLogger.info("processAboutFiles");
    myLogger.info(myInfo);
    
    jQuery.each(wellLogFiles, function(keyItem, keyFile) {
        jQuery("#" + keyItem).html(myInfo.shift());
    });

    // Build cell log
    //
    createLog();

}
 
// Create Log
//
function createLog () {

    myLogger.info(`createLog ${rasters}`);

    // Parse url
    //-------------------------------------------------
    let url = new URL(window.location.href);
    let params = new URLSearchParams(window.location.search);
    let origin = url.origin;
    myLogger.info(`Current Url ${window.location.href}`);
    myLogger.info(`Current Params ${params}`);
    
    // Url contains all arguments
    //-------------------------------------------------
    if(params.has("longitude") &&
       params.has("latitude") &&
       params.has("x_coordinate") &&
       params.has("y_coordinate")) {

        // Set
        //
        longitude = params.get("longitude")
        latitude = params.get("latitude")

        // Build ajax requests
        //
        let urls = [];

        // Add rasters
        //
        params.set('rasters',`${rasters.join(" ")}`)

        // Create a URL object
        //
        let script_http = `${origin}/cgi-bin/frameworkService/framework_cell_log.py`;
        const searchParams = new URLSearchParams(params);
        const finalUrl = `${script_http}?${searchParams.toString()}`;
        myLogger.info(`Request for cell log information ${finalUrl}`)

        // Web request
        //
        urls.push(`${finalUrl}`);

        // Call the async function
        //
        webRequests(urls, 'json', BuildCellGeometry)
    }

  }
 
function BuildCellGeometry(myJson) {
    console.log("BuildCellGeometry");
    console.log(myJson);

    // No subsurface
    //
    let json_data = myJson[0]
    
    if(json_data.status != "success") {
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
    if(message) {
        openModal(message);
        fadeModal(3000);
        return;
    }

    // Close modal dialog
    //
    closeModal();

    // No cell records
    //
    if(json_data.cell_log.length <= 0) {
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

function locationMap(latitude, longitude) {
    myLogger.info('locationMap');
    myLogger.info(`latitude ${latitude} longitude ${longitude}`);

    let map = L.map('locationMap').setView([latitude, longitude], 12);
    map.scrollWheelZoom.disable();    
    
    myLogger.info(map.getBounds());
    
   L.tileLayer("https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 16,
    }).addTo(map);

    // Add cell location
    //
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
    dummyPane = map.createPane('surficalGeology');
    map.getPane('surficalGeology').style.pointerEvents = 'none';
    map.getPane('surficalGeology').style.zIndex = 610;

    var surficalGeology = L.tileLayer(surficalGeologyUrl, {
        pane: 'surficalGeology',
        tms: true,
        attribution: 'USGS',
        opacity: 0.25,
        alt: 'surfical geology'
    }).addTo(map);

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
    legend_html.push(' <tr scope="row">');
    legend_html.push('  <th scope="col">Top<sup>1</sup></th>');
    legend_html.push('  <th scope="col">Bottom<sup>1</sup></th>');
    legend_html.push('  <th scope="col">Elevation</th>');
    legend_html.push('  <th scope="col">Thickness</th>');
    legend_html.push('  <th scope="col">Geologic Unit</th>');
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
      legend_html.push(` <tr scope="row" id="${id}" bgcolor="${color}">`);

      legend_html.push(' <td scope="col">');
      legend_html.push(`  <div class="text-end"> ${Math.abs(top_depth).toFixed(0)} </div>`);
      legend_html.push(' </td>');

      if(bot_depth) {
        legend_html.push(' <td scope="col">');
        legend_html.push(`  <div class="text-end"> ${Math.abs(bot_depth).toFixed(0)} </div>`);
        legend_html.push(' </td>');
      }
      else {
        legend_html.push(' <td scope="col">');
        legend_html.push('  <div class="text-center">not determined</div>');
        legend_html.push(' </td>');
      }

      legend_html.push(' <td scope="col">');
        legend_html.push(`  <div class="text-end">${top_elev.toFixed(0)}</div>`);
      legend_html.push(' </td>');

      if(thickness) {
        legend_html.push(' <td scope="col">');
          legend_html.push(`  <div class="text-end">${Math.abs(thickness).toFixed(0)}</div>`);
        legend_html.push(' </td>');
      }
      else
      {
        legend_html.push(' <td scope="col">');
        legend_html.push('  <div class="text-center">not determined</div>');
        legend_html.push(' </td>');
      }

      legend_html.push(' <td scope="col" style="background-color:#FFFFFF">');
        legend_html.push(`  <div id="label_${label}" class="legendLabel">${description}</div>`);
      legend_html.push(' </td>');

      legend_html.push(' </tr>');
    }

    legend_html.push(' <tr scope="row"><td class="text-start" colspan="5"><sup>1</sup>' + "Values are depth below land surface, in feet" + '</td></tr>');
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