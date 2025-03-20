/**
 * Namespace: D3_Cell_Xsec
 *
 * D3_Cell_Xsec is a JavaScript library to provide a set of functions to build
 *  cross-sectional view in svg format.
 *
 * version 2.07
 * March 5, 2025
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

// Set globals
//
var svg;
var jsonData;
var lithologyData;

var svg_width   = '1200';
var svg_height  = '600';
var viewBox     = `0 0 ${svg_width} ${svg_height}`;

var y_min, y_max, y_interval, y_range;
var y_box_min   = 50;
var y_box_max   = svg_height - 300;
var y_axis      = y_box_max - y_box_min;

var x_min, x_max, x_interval, x_range;
var x_box_min   = 70;
var x_box_max   = svg_width - 300;
var x_axis      = x_box_max - x_box_min;

var x_legend    = x_box_max + 100
var y_legend    = y_box_min
var legend_box  = 20
var y_top       = y_box_min

var y_zoom_min  = y_box_max + 50;
var y_zoom_max  = y_zoom_min + 75;

// No information
//
function noLog(svgContainer)
  { 
   console.log("noLog");

   // No log label
   //
   label_txt       = "No Cell Cross Section Information";
   var  label      = "translate("
   label          += [( x_box_max + x_box_min ) * 0.5, + (y_box_max + y_box_min ) * 0.5].join(", ");
   label          += ") rotate(-90)";

   var myText      = svgContainer.append("text")
                                 .attr("transform", label)
                                 .attr('class', 'y_axis_label')
                                 .text(label_txt);
  }

// Plot Cell Log column
//
function plotCellXsec(myData) {
    myLogger.info("plotCellXsec");
    myLogger.info(myData);
    myLogger.info(myRasterList);
    myLogger.info(myRasterLookup);

    // Fade modal dialog
    //
    fadeModal(1000);

    // Add tooltip
    //
    var tooltip = addToolTip();

    // Prepare site title
    //
    let siteTitle = [];
    siteTitle.push(`From Xy To Xy`);

    // SVG canvas
    //
    jQuery("#crossSection").append('<svg id="svgCanvas"></svg>')

    var svg = d3.select("#svgCanvas")
        .attr("title", `Cross Section for ${siteTitle.join(' -- ')}`)
        .attr("version", 1.1)
        .attr("xmlns", "http://www.w3.org/2000/svg")
        .attr("xmlns:xlink", "http://www.w3.org/1999/xlink")
        .attr('width', svg_width)
        .attr('height', svg_height)
        .attr('viewBox', viewBox)
        .attr('fill', 'white')

    // Draw zoom plot box 
    //
    axisBox(
        svg,
        'zoomPlot',
        x_box_min,
        x_box_max,
        y_box_min,
        y_box_max,
        "none"
    );

    // Draw brush plot box
    //
    axisBox(
        svg,
        'overviewPlot',
        x_box_min,
        x_box_max,
        y_zoom_min,
        y_zoom_max,
        "none"
    );

    // No cell log information
    //
    if(!myData) {
        noLog(svg);

        return false;
    }

    // Plot specs
    //
    var min_elevation              = null;
    var max_elevation              = null;
    var min_distance               = 0.0;
    var max_distance               = null;

    // Loop through cell records
    //
    for (let i = 0; i < myRasterList.length; i++) {
        let myUnit   = myRasterList[i];
        let maxValue = d3.max(myData[myUnit], d => +d.top);
        let minValue = d3.min(myData[myUnit], d => +d.bot);

        if(!min_elevation) { min_elevation = minValue }
        else { if(minValue < min_elevation) { min_elevation = minValue } }

        if(!max_elevation) { max_elevation = maxValue }
        else { if(maxValue > max_elevation) { max_elevation = maxValue } }

        if(!max_distance) {
            max_distance = d3.max(myData[myUnit], d => +d.x);
        }

    }

    // Plot specs
    //
    //[y_min, y_max, y_interval] = get_max_min(min_elevation, max_elevation);
    y_min = min_elevation;
    y_max = max_elevation;
    
    myLogger.info(`Y-axis information max ${y_max} min ${y_min} y_interval ${y_interval}`);
    myLogger.info(`X-axis information max ${max_distance} min ${min_distance}`);
    
    // Geologic framework
    //
    addFramework(
        svg,
        y_max,
        y_min,
        min_distance,
        max_distance,
        x_box_min,
        x_box_max,
        y_box_min,
        y_box_max,
        myData,
        tooltip
    )

    // Label axes
    //
    yAxis(
        svg,
        'zoomPlot',
        x_box_min,
        x_box_max,
        y_box_min,
        y_box_max,
        y_max,
        y_min,
        'left',
        'Elevation, in feet ' + verticalDatum
    );

    minValue = 0.0;
    maxValue = y_max - y_min;
    yAxis(
        svg,
        'zoomPlot',
        x_box_min,
        x_box_max,
        y_box_min,
        y_box_max,
        minValue,
        maxValue,
        'right',
        "Depth Below Land Surface, in feet"
    );
  }

function addFramework(
    svgContainer,
    y_max,
    y_min,
    x_min,
    x_max,
    x_box_min,
    x_box_max,
    y_box_min,
    y_box_max,
    data,
    tooltip) {

    myLogger.info("addFramework");
    myLogger.info(data);

    // Set area colors
    //
    //let myColors = [...new Set(myRasterLookup.map(item => item.color))];
    let myColors = jQuery.map(myRasterLookup, function(element,index) {return element.color});
    myLogger.info(myColors);
    let color = d3.scaleOrdinal()
        .domain(myRasterList)
        .range(myColors);
    
    // Set
    //
    let x_range = x_max - x_min;
    let x_axis  = x_box_max - x_box_min;
    let y_range = y_max - y_min;
    let y_axis  = y_box_max - y_box_min;
   
    // Create the x scale
    //
    let width  = Math.abs(x_box_max - x_box_min);
    let xScale = d3.scaleLinear().domain([x_min, x_max]).nice().range([0, width])

    // Create the y scale
    //
    let height = Math.abs(y_box_max - y_box_min);
    let yScale = d3.scaleLinear().domain([y_max, y_min]).rangeRound([0, height]);
    myLogger.info(`Y-axis information max ${y_max} min ${y_min} height ${height}`);
    
    // Add zoom plot
    //
    let areaPlot = d3.select(`#zoomPlot`)
        .append("g")
        .attr("transform", `translate(${x_box_min}, ${y_box_min})`)
        .attr("clip-path", "url(#clip)")

    // Area generator
    //
    let area = d3.area()
        .curve(d3.curveLinear)
        .x(d => xScale(d.x))
        .y0(d => yScale(d.bot)) // Baseline at the bottom of the SVG
        .y1(d => yScale(d.top)); // Top line based on data

    // Loop through
    //
    for (let i = 0; i < myRasterList.length; i++) {
        let myUnit   = myRasterList[i];
        myLogger.info(`myUnit ${myUnit}`);

        let myData = data[myUnit];

        // Draw the line
        //
        areaPlot.append("path")
            .datum(myData)
            .attr("class", 'zoomLine')
            .attr("fill", function(d) { return color(myUnit) })
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("d", d3.area()
                  .x(function(d) { return xScale(d.x) })
                  .y0(function(d) { if(d.bot) {return yScale(d.bot); } else { return yScale(y_min); } })
                  //.y0(yScale(y_max))
                  .y1(function(d) { return yScale(d.top) })
                 )
    }
    
    // Add overview hydrograph
    //
    let overgraph = d3.select("#overviewPlot")
        .append("g")
        .attr("transform", `translate(${x_box_min}, ${y_zoom_min})`)
    
    // Create the y scale
    //
    let overHeight    = Math.abs(y_zoom_max - y_zoom_min);
    let overviewScale = d3.scaleLinear().domain([y_max, y_min]).rangeRound([0, overHeight]);

    // Loop through
    //
    for (let i = 0; i < myRasterList.length; i++) {
        let myUnit   = myRasterList[i];
        myLogger.info(`myUnit ${myUnit}`);

        let myData = data[myUnit];

        // Draw the line
        //
        overgraph.append("path")
            .datum(myData)
            .attr("class", 'zoomLine')
            .attr("fill", function(d) { return color(myUnit) })
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("d", d3.area()
                  .x(function(d) { return xScale(d.x) })
                  .y0(function(d) { if(d.bot) {return overviewScale(d.bot); } else { return overviewScale(y_min); } })
                  //.y0(yScale(y_max))
                  .y1(function(d) { return overviewScale(d.top) })
                 )
    }
}

function drawAreas(svgElement, data, xScale, yScale, colorScale) {
    myLogger.info("drawAreas");
    
    // Select svg element
    //
    let selectedSvg = d3.select(`#${svgElement}`)

    // Loop through
    //
    for (let i = 0; i < myRasterList.length; i++) {
        let myUnit   = myRasterList[i];
        myLogger.info(`myUnit ${myUnit}`);

        let myData = data[myUnit];

        // Draw the line
        //
        selectedSvg.append("path")
            .datum(myData)
            .attr("class", 'zoomLine')
            .attr("fill", function(d) { return colorScale(myUnit) })
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("d", d3.area()
                  .x(function(d) { return xScale(d.x) })
                  .y0(function(d) { if(d.bot) {return yScale(d.bot); } else { return yScale(y_min); } })
                  //.y0(yScale(y_max))
                  .y1(function(d) { return yScale(d.top) })
                 )
    }
}

function addLegend(svgContainer, lithologyData, lithologyDefs)
  { 
   myLogger.info("addLegend");

   var tempData     = lithologyDefs.slice();
   myLogger.info(tempData);
  
   var x_legend     = x_box_max + 100
   var y_legend     = y_box_min
   var legend_box   = 20
   var y_top        = y_box_min

   var protocol     = window.location.protocol; // Returns protocol only
   var host         = window.location.host;     // Returns host only
   var pathname     = window.location.pathname; // Returns path only
   var url          = window.location.href;     // Returns full URL
   var origin       = window.location.origin;   // Returns base URL
   var webPage      = (pathname.split('/'))[1];

   myLogger.info("protocol " + protocol);
   myLogger.info("host " + host);
   myLogger.info("pathname " + pathname);
   myLogger.info("url " + url);
   myLogger.info("origin " + origin);
   myLogger.info("webPage " + webPage);

   var defs         = svgContainer.append("defs")

   // Loop through lithology
   //
   var Legend       = [];
   var LegendList   = [];
    
   while ( tempData.length > 0 ) {

        var lithRecord  = tempData.shift();

        var lithology   = lithRecord.lithology;
        var symbol      = lithRecord.symbol;
        var lithCode    = lithRecord.lithology.replace(/\s+&\s+/g, '');

        // Build legend
        //
        if(LegendList.indexOf(lithology) < 0)
          {
           var id          = symbol
           var svg_file    = symbol + ".svg"
           //var link_http   = [protocol + '/', host, webPage, "lithology_patterns", svg_file].join("/");
           var link_http   = ["lithology_patterns", svg_file].join("/");
   
           var pattern     = defs.append("pattern")
                                 .attr('id', id)
                                 .attr('patternUnits', 'userSpaceOnUse')
                                 .attr('width', 100)
                                 .attr('height', 100)
   
           var myimage     = pattern.append('image')
                                 .attr('xlink:href', link_http)
                                 .attr('width', 100)
                                 .attr('height', 100)
                                 .attr('x', 0)
                                 .attr('y', 0)

           LegendList.push(lithology);
           Legend.push({ 
                        'lithCode': lithCode,
                        'symbol': symbol,
                        'description': lithology,
                        'image': id
                       })

           //lithologyDefs[lithology].pattern = id;
          }
   }

   // Loop through lithology
   //
   var tempData     = Legend;
  
   var x_legend     = x_box_max + 100
   var y_legend     = y_box_min
   var legend_box   = 20
   var y_top        = y_box_min

   var descriptions = svgContainer.append("g")
                                  .attr("class", "legend_descriptions")
    
    while ( tempData.length > 0 ) {

        var Record      = tempData.shift();

        var lithCode    = Record.lithCode;
        var symbol      = Record.symbol;
        var description = Record.description
        var id          = Record.image
        var url         = 'url(#' + id + ')'

        var myRect      = descriptions.append("rect")
                                      .attr('x', x_legend)
                                      .attr('y', y_top)
                                      .attr('width', legend_box)
                                      .attr('height', legend_box)
                                      .attr('fill', url)
                                      .attr('stroke', 'black')
                                      .attr('stroke-width', 1)

        var myText      = descriptions.append("text")
                                      .text(description)
                                      .attr('class', lithCode)
                                      .attr('x', x_legend + legend_box * 1.25)
                                      .attr('y', y_top + legend_box * 0.5)
                                      .on('mouseover', function(d, i) {
                                         var lithClass = d3.select(this).attr('class');
                                         d3.selectAll("#" + lithClass)
                                           .transition()
                                           .duration(100)
                                           .attr('strokeWidth', 10)
                                           .attr('stroke', 'yellow')
                                      })
                                      .on('mouseout', function(d, i) {
                                         var lithClass = d3.select(this).attr('class');
                                         d3.selectAll("#" + lithClass)
                                           .transition()
                                           .duration(100)
                                           .attr('strokeWidth', 1)
                                           .attr('stroke', 'black')
                                      })

        y_top          += legend_box * 1.5
   }
  
   myLogger.info("done addLegend");
  }

