/**
 * Namespace: D3_Cell_Log
 *
 * D3_Cell_Log is a JavaScript library to provide a set of functions to build
 *  cell log column in svg format.
 *
 * version 2.09
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

var svg_width   = '300';
var svg_height  = '700';
var viewBox     = `0 0 ${svg_width} ${svg_height}`;

var y_min, y_max, y_interval, y_range;
var y_box_min   = 25;
var y_box_max   = svg_height - 60;
var y_axis      = y_box_max - y_box_min;

var x_min, x_max, x_interval, x_range;
var x_axis      = 70;
var x_box_min   = ( svg_width - x_axis ) * 0.5;
var x_box_max   = svg_width - x_box_min;

// Plot Cell Log column
//
function plotCellLog(data) {
    console.log("plotCellLog");
    console.log(data);

    // Fade modal dialog
    //
    fadeModal(1000);

    // Add tooltip
    //
    let tooltip = addToolTip();

    // Prepare site title
    //
    let siteTitle = [];

    // SVG canvas
    //
    jQuery("#cell_log").append('<svg id="svgCanvas" class="border border-black border-2 rounded-4 shadow-lg"></svg>')
    
    let svg = d3.select("#svgCanvas")
        .attr("title", `Cell Log for ${siteTitle.join(' -- ')}`)
        .attr("version", 1.1)
        .attr("xmlns", "http://www.w3.org/2000/svg")
        .attr("xmlns:xlink", "http://www.w3.org/1999/xlink")
        .attr('width', svg_width)
        .attr('height', svg_height)
        .attr('viewBox', viewBox)
        .attr('fill', 'white')

    // Draw layers
    //
    axisBox(
        svg,
        'cellLog',
        x_box_min,
        x_box_max,
        y_box_min,
        y_box_max,
        "none"
    );

    // No cell log information
    //
    if(!data) {
        noLog(svg, 'No cell log information');

        return false;
    }

    // Plot specs
    //
    let max_elevation = d3.max(data, d => d.top_elev);
    y_max = max_elevation;
    let min_elevation = d3.min(data, d => d.bot_elev);
    if(!min_elevation) { min_elevation = y_max - 100; }
    y_min = min_elevation;
    myLogger.info(`Y-axis information max ${y_max} min ${y_min}`);
   
    // Geologic framework definitions
    //
    //
    let myGeologyList = [...new Set(data.map(item => item.unit))];
    
    buildDefs(svg, data)

    // Geologic framework
    //
    addFramework(
        svg,
        y_max,
        y_min,
        x_box_min,
        x_box_max,
        y_box_min,
        y_box_max,
        data,
        tooltip
    )
    
    // Left y axis (elevation)
    //
    yAxis(
        svg,
        'cellLog',
        x_box_min,
        x_box_max,
        y_box_min,
        y_box_max,
        y_max,
        y_min,
        'left',
        'Elevation, in feet '
    );

    // Right y axis (depth)
    //
    minValue = 0.0;
    maxValue = y_max - y_min;
    yAxis(
        svg,
        'cellLog',
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
    x_box_min,
    x_box_max,
    y_box_min,
    y_box_max,
    data,
    tooltip
) {
    console.log("addFramework");
    console.log(data);
    myLogger.info(`Y-axis min ${y_min} max ${y_max}`);

    // Set
    //
    let width   = x_box_max - x_box_min;
    let y_range = y_max - y_min;
    let y_axis  = y_box_max - y_box_min;

    // Draw geologic framework where a bottom is valid
    //
    let myRecords = data.filter(d => d.bot_elev !== null)

    // Loop through lithology
    //
    for(let i = 0; i < myRecords.length; i++) {

        let myRecord  = myRecords[i]
        console.log(myRecord);

        let id          = myRecord.unit;
        let unit        = myRecord.unit;
        let top_elev    = myRecord.top_elev;
        let bot_elev    = myRecord.bot_elev;
        let top_depth   = myRecord.top_depth;
        let bot_depth   = myRecord.bot_depth;
        let symbol      = myRecord.symbol;
        let color       = myRecord.color;
        let description = myRecord.description;

        myLogger.info(`  Lithology ${description} Top ${top_depth} ${top_elev} Bottom ${bot_elev} ${bot_depth} Symbol ${symbol} Color ${color}`);

        let y_top       = y_box_min + y_axis * (y_max - top_elev) / y_range;
        let y_bot       = y_box_min + y_axis * (y_max - bot_elev) / y_range;
        let thickness   = Math.abs(y_top - y_bot);
        myLogger.info(`  Lithology ${description} Y Top ${y_top} Y Bottom ${y_bot} Thickness ${thickness}`);

        // Add color
        //
        if(color && color.length > 0) {
            let lithology = svgContainer.append("g")
                .attr("class", "lithology")
            let myRect    = lithology.append("rect")
                .attr('x', x_box_min)
                .attr('y', y_top)
                .attr('width', width)
                .attr('height', thickness)
                .attr('fill', color)
        }

        // Add image pattern
        //
        let toolTip   = `${description}: Depth from ${top_depth.toFixed(0)} to ${bot_depth.toFixed(0)} feet`;
        let data      = [ {x:x_box_min, tooltip: toolTip}];

        let lithology = svgContainer.append("g")
            .attr("class", "lithology")
            .data(data)

        let myRect = lithology.append("rect")
            .attr('id', id)
            .attr('class', 'lithology')
            .attr('x', x_box_min)
            .attr('y', y_top)
            .attr('width', width)
            .attr('height', thickness)
            .attr('fill', `url(#${id})`)
            .attr('stroke', 'black')
            .attr('stroke-width', 1)
            .on("mousemove", function(event, d) {
                tooltip
                    .style("left", event.pageX + "px")
                    .style("top", event.pageY + "px")
                    .style("display", "inline-block")
                    .html(d.tooltip);
            })
            .on("mouseout", function(d){ tooltip.style("display", "none");});
    }
    
    // Draw geologic framework where a bottom is null
    //
    let myBottom = data.filter(d => d.bot_elev === null)

    if(myBottom.length > 0) {

        let myRecord = myBottom[0]
        myLogger.info('Bottom Record');
        myLogger.info(myRecord);

        let id          = myRecord.unit;
        let unit        = myRecord.unit;
        let top_elev    = myRecord.top_elev;
        let bot_elev    = y_min;
        let symbol      = myRecord.symbol;
        let color       = myRecord.color;
        let description = myRecord.description;

        myLogger.info(`  Lithology ${description} Top ${top_elev} Bottom ${bot_elev} Symbol ${symbol} Color ${color}`);

        let y_top       = y_box_min + y_axis * (y_max - top_elev) / y_range;
        let y_bot       = y_box_min + y_axis * (y_max - bot_elev) / y_range;
        let thickness   = Math.abs(y_top - y_bot);
        myLogger.info(`  Lithology ${description} Y Top ${y_top} Y Bottom ${y_bot} Thickness ${thickness}`);

        let toolTip     = `${description} from 0 to ?? depth`;
        let data        = [ {x:x_box_min, tooltip: toolTip}];

        let lithology = svgContainer.append("g")
            .attr("class", "lastLithology")
            .data(data)

        // Check for existing definitions section
        //
        let defs = d3.select("defs");

        let lastGradient = defs.append('linearGradient')
            .attr('id', 'lastGradient')
            .attr('x1', '0%')
            .attr('x2', '0%')
            .attr('y1', '0%')
            .attr('y2', '100%')
            .attr("gradientUnits", "userSpaceOnUse")
            .attr("spreadMethod", "pad");

        lastGradient.append('stop')
            .attr('class', 'start')
            .attr('offset', '0%')
            .attr('stop-color', color)
            .attr('stop-opacity', 1);

        lastGradient.append('stop')
            .attr('class', 'end')
            .attr('offset', '100%')
            .attr('stop-color', 'transparent')
            .attr('stop-opacity', 1);

        let myLast = lithology.append("rect")
            .attr('id', id)
            .attr('class', 'lithology')
            .attr('x', x_box_min)
            .attr('y', y_top)
            .attr('width', width)
            .attr('height', thickness)
            .attr('fill', 'url(#lastGradient)')
            .attr('fill-opacity', 1)
            .attr('stroke', 'white')
            .attr('stroke-width', 0)

        let myRect = lithology.append("rect")
            .attr('id', id)
            .attr('class', 'lithology')
            .attr('x', x_box_min)
            .attr('y', y_top)
            .attr('width', width)
            .attr('height', thickness)
            .attr('fill', `url(#${id})`)
            .attr('stroke', 'white')
            .attr('stroke-width', 0)
            .on("mousemove", function(event, d) {
                tooltip
                    .style("left", event.pageX + "px")
                    .style("top", event.pageY + "px")
                    .style("display", "inline-block")
                    .html(d.tooltip);
            })
            .on("mouseout", function(d){ tooltip.style("display", "none");});

        // Add unknown ?? text to bottom
        //
        let textInfo    = textSize('?-?-?-?-?-?');
        let text_height = textInfo.height;

        let myText = lithology.append("text")
            .attr('x', x_box_min + 0.5 * (x_box_max - x_box_min))
            .attr('y', y_bot + (y_box_max - y_bot) * 0.5 - text_height * 0.5)
            .style("text-anchor", "middle")
            .style("font-family", "sans-serif")
            .style("font-size", "1rem")
            .style("font-weight", "600")
            .style("opacity", 1)
            .style("fill", 'black')
            .text('?-?-?-?-?-?')
    }
}
