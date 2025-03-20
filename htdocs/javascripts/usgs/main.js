/**
 * Namespace: Main
 *
 * Main is a JavaScript library to provide a set of functions to manage
 *  the web requests.
 *
 * version 1.03
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

processConfigFile(myGeologicFramework)
myLogger.info(aboutFiles);

// Prepare when the DOM is ready 
//
$(document).ready(function() {
    // Loading message
    //
    message = "Preparing the three-dimensional hydrogeologic framework model of Columbia Plateau Regional Aquifer System";
    openModal(message);
    //closeModal();

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

    // Request for framework information
    //
    var request_type = "GET";
    var script_http  = study_boundary;
    var data_http    = "";
    var dataType     = "json";

    // Web request
    //
    webRequests.push($.ajax( {
        method:   request_type,
        url:      script_http,
        data:     data_http,
        dataType: dataType,
        success: function (myData) {
            message = "Processed study boundary information";
            openModal(message);
            fadeModal(2000);
            StudyBoundary = myData;
        },
        error: function (error) {
            message = `Failed to load study boundary information ${error}`;
            openModal(message);
            fadeModal(2000);
            return false;
        }
    }));

    // Run ajax requests
    //
    $.when.apply($, webRequests).then(function() {

        fadeModal(2000);

        buildMap();
    });
});

// Process project configuration information
//
function processConfigFile(myInfo) 
  {        
   myLogger.info("Processing project configuration information");
   myLogger.info(myInfo);

   aboutFiles         = myInfo.aboutFiles;
   rasters            = myInfo.rasters;
   latlong_projection = myInfo.latlong_projection;
   raster_projection  = myInfo.raster_projection;
   explanation        = myInfo.explanation;
   color_file         = myInfo.color_file;
   study_boundary     = myInfo.study_boundary;
   //myLogger.info(aboutFiles);

   return;

  }
