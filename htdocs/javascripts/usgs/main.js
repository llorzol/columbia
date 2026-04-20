/**
 * Namespace: Main
 *
 * Main is a JavaScript library to provide a set of functions to manage
 *  the web requests.
 *
 * $Id: /var/www/html/columbia/javascripts/usgs/main.js, v 1.05 2026/04/19 16:23:14 llorzol Exp $
 * $Revision: 1.05 $
 * $Date: 2026/04/19 16:23:14 $
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
    let urls = [];

    // Insert accordion text
    //
    jQuery.each(aboutFiles, function(keyItem, keyFile) {

        // Request for accordion text information
        //
        //let Url = `${keyFile} + "?_="+(new Date()).valueOf()`
        let Url = `${keyFile}`

        // Web request
        //
        urls.push(`${Url}`);
    });

    // Call the async function
    //
    webRequests(urls, 'text', processAboutFiles)
});

// Process about files information
//
function processAboutFiles(myInfo) {
    myLogger.info("processAboutFiles");
    //myLogger.info(myInfo);
    
    jQuery.each(aboutFiles, function(keyItem, keyFile) {
        jQuery("#" + keyItem).html(myInfo.shift());
    });

    // Build ajax requests
    //
    let urls = [];

    // Web request
    //
    if(study_boundary) {
        urls.push(`${study_boundary}`);

        // Call the async function
        //
        webRequests(urls, 'json', processStudyBoundary)
    }
}

// Process study boundary information
//
function processStudyBoundary(myData) {
    myLogger.info("processStudyBoundary");

    StudyBoundary = myData[0]

    // Build map
    //
    buildMap ()
}

// Process project configuration information
//
function processConfigFile(myInfo) {
    myLogger.info("Processing project configuration information");
    myLogger.debug(myInfo);
    for (let key in myInfo) {
        globalThis[key] = myInfo[key]
    }

    return;

  }