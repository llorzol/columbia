/**
 * Namespace: Framework_Xsec
 *
 * Framework_Xsec is a JavaScript library to build a profile of columns of 
 *  framework information from the subsurface geologic layers.
 *
 * $Id: /var/www/html/columbia/javascripts/usgs/framework_xsec.js, v 2.07 2026/04/22 09:39:43 llorzol Exp $
 * $Revision: 2.07 $
 * $Date: 2026/04/22 09:39:43 $
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
    myLogger.info(xsecFiles);

    return;

  }

// Prepare when the DOM is ready 
//
$(document).ready(function() {
    // Loading message
    //
    message = "Preparing cross-section information";
    openModal(message);

    // Build ajax requests
    //
    let urls = [];

    // Insert accordion text
    //
    jQuery.each(xsecFiles, function(keyItem, keyFile) {

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
    
    jQuery.each(xsecFiles, function(keyItem, keyFile) {
        jQuery("#" + keyItem).html(myInfo.shift());
    });

    // Build cell log
    //
    createXsec();

}

// Create Cross-section View
//
function createXsec () {

    myLogger.info(`createXsec ${rasters}`);

    // Parse url
    //-------------------------------------------------
    let url = new URL(window.location.href);
    let params = new URLSearchParams(window.location.search);
    let origin = url.origin;
    myLogger.info(`Current Url ${window.location.href}`);
    myLogger.info(`Current Params ${params}`);
    
    // Url contains all arguments
    //-------------------------------------------------
    if(url.searchParams.has("longlats") &&
       url.searchParams.has("points")) {

        // Set selected option
        //-------------------------------------------------
        var longlats = params.get("longlats")
        var points   = params.get("points")

        // Build ajax requests
        //
        let urls = [];

        // Add rasters
        //
        params.set('rasters',`${rasters.join(" ")}`)

        // Create a URL object
        //
        let script_http = `${origin}/cgi-bin/frameworkService/framework_xsec.py`;
        const searchParams = new URLSearchParams(params);
        const finalUrl = `${script_http}?${searchParams.toString()}`;
        myLogger.info(`Request for cell log information ${finalUrl}`)

        // Web request
        //
        urls.push(`${finalUrl}`);

        // Call the async function
        //
        webRequests(urls, 'json', BuildCellXsec)
    }

  }

function BuildCellXsec(myJson) {
    console.log("BuildCellXsec");
    console.log(myJson);

    // No subsurface
    //
    let json_data = myJson[0]
    
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
    let message = json_data.warning;
    if(message) {
        myLogger.error(message);
        openModal(message);
        fadeModal(3000);
        return;
    }

    // Close modal dialog
    //
    closeModal();

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