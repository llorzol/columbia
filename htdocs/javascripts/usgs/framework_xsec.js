/**
 * Namespace: Framework_Xsec
 *
 * Framework_Xsec is a JavaScript library to build a profile of columns of 
 *  framework information from the subsurface geologic layers.
 *
 * version 2.05
 * March 16, 2025
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
var rasterL      = myGeologicFramework.rasterL;
var aboutFiles   = myGeologicFramework.wellLogFiles;
var color_file   = myGeologicFramework.color_file;
var explanation  = myGeologicFramework.explanation;
var rasterList   = myGeologicFramework.rasterL;
var verticalDatum = myGeologicFramework.verticalDatum;
var horizontalDatum = myGeologicFramework.horizontalDatum;

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
        createXsec();
    });

});
 
// Create Cross-section View
//
function createXsec () {

    myLogger.info(`createXsec ${rasters}`);

    // Parse url
    //-------------------------------------------------
    let url = new URL(window.location.href);
    myLogger.info(`Current Url ${window.location.href}`);
    myLogger.info(`Current Params ${url.searchParams}`);
    myLogger.info(`Current Params ${url.searchParams.has("longlats")}`);
    myLogger.info(`Current Params ${url.searchParams.has("points")}`);
    
    // Url contains all arguments
    //-------------------------------------------------
    if(url.searchParams.has("longlats") &&
       url.searchParams.has("points")) {

        // Set selected option
        //-------------------------------------------------
        var longlats = url.searchParams.get("longlats")
        var points   = url.searchParams.get("points")

        // Request for cross-section information
        //
        var request_type = "GET";
        var script_http  = [script_http, "framework_xsec.pl?"].join("/");
        var script_http  = '/cgi-bin/frameworkService/framework_xsec.py';
        var data_http    = "";
        data_http   += `longlats=${longlats}`;
        data_http   += `&points=${points}`;
        data_http   += `&rasters=${rasters.join(" ")}`;

        var dataType    = "json";

        webRequest(request_type, script_http, data_http, dataType, BuildCellXsec);
    }

  }

function BuildCellXsec(json_data) {
    // No subsurface
    //
    if(json_data.status != "success") {
        let message = json_data.warning;
        if(!json_data.error) {message = json_data.error;}
        if(!json_data.warning) {message = json_data.warning;}

        myLogger.error(message);
        openModal(message);
        fadeModal(3000);
        return;
    }

    // Check for returning warning or error
    //
    if(json_data.warning) {
        let message = json_data.warning;

        myLogger.error(message);
        openModal(message);
        fadeModal(3000);
        return;
    }

    // General information
    //
    rows              = json_data.nrows;
    columns           = json_data.ncols;
    layers            = json_data.nlays;
    cell_width        = json_data.cell_width;
    x_axis_min        = json_data.x_axis_min;
    x_axis_max        = json_data.x_axis_max;
    y_axis_min        = json_data.elevation_min;
    y_axis_max        = json_data.elevation_max;
    //cell_count        = json_data.cell_count;
    //start_row         = json_data.start_row;
    //start_col         = json_data.start_col;
    //end_row           = json_data.end_row;
    //end_col           = json_data.end_col;

    // Data
    //
    myData = json_data.rocks;

    // Title
    //
    let url = new URL(window.location.href);
    let longlats = url.searchParams.get("longlats")
    let points   = url.searchParams.get("points")
    longitude    = longlats.split(" ")[0].split(",")[0];
    latitude     = longlats.split(" ")[0].split(",")[1];

    let title     = "Geologic Framework Information starting at Longitude, Latitude";
    title        += " (" + parseFloat(longitude).toFixed(4) + ", " + parseFloat(latitude).toFixed(4) + ")";
    longitude    = longlats.split(" ")[1].split(",")[0];
    latitude     = longlats.split(" ")[1].split(",")[1];

    title        += " to (" + parseFloat(longitude).toFixed(4) + ", " + parseFloat(latitude).toFixed(4) + ")";
    jQuery(document).prop("title", title);
    jQuery("#page_title").html(title);

    plotCellXsec(myData)
}
