/**
 * Namespace: D3_Cell_Xsec
 *
 * D3_Cell_Xsec is a JavaScript library to provide a set of functions to build
 *  cross-sectional view in svg format.
 *
 * version 2.14
 * March 24, 2025
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

var y_zoom_min  = y_box_max + 50;
var y_zoom_max  = y_zoom_min + 100;

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
    myLogger.info(rasters);
    myLogger.info(explanation);

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
    for (let i = 0; i < rasterL.length; i++) {
        let myUnit   = rasterL[i];
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
    y_min = min_elevation;
    y_max = max_elevation;
    
    myLogger.info(`Y-axis information max ${y_max} min ${y_min} y_interval ${y_interval}`);
    myLogger.info(`X-axis information max ${max_distance} min ${min_distance}`);

    // Set last raster bottom to y_min
    //
    let lastRaster = rasterL[rasterL.length - 1]
    for (let i = 0; i < myData[lastRaster].length; i++) {
        myData[lastRaster][i].bot = y_min;
    }
    
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
    
    // Legend
    //
    xsecLegend(svg)

    // Label axes
    //
    xAxis(
        svg,
        'overviewPlot',
        x_box_min,
        x_box_max,
        y_zoom_min,
        y_zoom_max,
        min_distance,
        max_distance,
        'bottom',
        'Distance, in meters'
    );

    // Left y axis (elevation)
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

    // Right y axis (depth)
    //
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
    let myColors = jQuery.map(rasterL, function(element,index) {return explanation[element].color});
    myLogger.info(myColors);
    let colorScale = d3.scaleOrdinal()
        .domain(rasterL)
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
    let zoomPlot = d3.select(`#zoomPlot`)
        .append("g")
        .attr("transform", `translate(${x_box_min}, ${y_box_min})`)
        .attr("clip-path", "url(#clip)")

    // Draw areas
    //
    drawAreas(zoomPlot, data, 'zoomAreas', xScale, yScale, colorScale)
    
    // Tracker line
    //
    let trackerLine = zoomPlot.append("line")
        .attr("id", "cursor-tracker")
        .attr("stroke-width", 2)
        .attr("stroke", "red")
    
    zoomPlot
        .on('mouseenter', function(event) {
            const [x, y] = d3.pointer(event, this);
            myLogger.debug(`Tracking line ${x} ${y}`);
            d3.select("#cursor-tracker")
                .attr("x1", x)
                .attr("y1", 0)
                .attr("x2", x)
                .attr("y2", height)
                .attr("stroke-width", 2)
                .attr("stroke", "red")
            d3.selectAll(".rasterText").text('--')
            tracker(data, xScale.invert(x));
        })
        .on('mousemove', function(event) {
            const [x, y] = d3.pointer(event, this);
            myLogger.debug(`Tracking line ${x} ${y}`);
            d3.select("#cursor-tracker")
                .attr("x1", x)
                .attr("y1", 0)
                .attr("x2", x)
                .attr("y2", height)
                .attr("stroke-width", 2)
                .attr("stroke", "red")
            tracker(data, xScale.invert(x));
        })
         .on('mouseleave', function(event) {
            d3.select("#cursor-tracker").attr('stroke-width',0)
            d3.selectAll(".rasterText").text('--')
        })
    
    // Add overview hydrograph
    //
    let overgraph = d3.select("#overviewPlot")
        .append("g")
        .attr("transform", `translate(${x_box_min}, ${y_zoom_min})`)
    
    // Create the y scale
    //
    let overHeight    = Math.abs(y_zoom_max - y_zoom_min);
    let overviewScale = d3.scaleLinear().domain([y_max, y_min]).rangeRound([0, overHeight]);

    // Draw areasa
    //
    drawAreas(overgraph, data, 'overAreas', xScale, overviewScale, colorScale)
    
    // Add brushing
    //
    overgraph.call(d3.brushX()
                   .extent( [ [0,0], [width,overHeight] ] )
                   .on("end", ({selection}) => {

                       // Color selected set
                       //
                       if (selection) {
                           let [x0, x1] = selection;

                           xScale.domain([ xScale.invert(x0), xScale.invert(x1) ])
                           d3.selectAll('#zoomPlot').selectAll(".bottomAxis").transition().duration(1000).call(d3.axisBottom(xScale).tickSizeOuter(0))

                           // Create area
                           //
                           let areaGen = d3.area()
                               .x(d => xScale(d.x))
                               .y0(d => yScale(d.bot))
                               .y1(d => yScale(d.top))
                               .defined(d => d.bot !== null); // Handle null values

                           // Loop through rasters
                           //
                           for (let i = 0; i < rasterL.length; i++) {
                               let myUnit   = rasterL[i];
                               let myData = data[myUnit];

                               // Draw area
                               //
                               zoomPlot.selectAll(`#${myUnit}`)
                                   .transition()
                                   .duration(1000)
                                   .attr("fill", function(d) { return colorScale(myUnit) })
                                   .attr("d", areaGen)
                           }
                       }
                   })
                  );
    overgraph.call(d3.drag()
                   .on("end", ({selection}) => {
                       myLogger.info('overgraph dragging');
                   })
                  );

    // Add a clipPath: everything out of this area won't be drawn.
    //
    var clip = svgContainer.append("defs").append("svg:clipPath")
        .attr("id", "clip")
        .append("svg:rect")
        .attr("width", width )
        .attr("height", height )
        .attr("x", 0)
        .attr("y", 0);
    
    // Null brushing
    //
    overgraph.on("dblclick", function() {
        myLogger.info('overgraph dblclick');
        Reset()
    });

    // Reset hydrograph
    //
    function Reset() {

        let selDomain = xScale.domain();

        // Zoom if domain has changed
        //
        if(selDomain.toString() !== [x_min, x_max].toString()) {
            xScale.domain([x_min, x_max]).nice().range([0, width])
            d3.selectAll("#zoomPlot").selectAll(".bottomAxis").transition().duration(1000).call(d3.axisBottom(xScale).tickSizeOuter(0));

            // Create area
            //
            let areaGen = d3.area()
                .x(d => xScale(d.x))
                .y0(d => yScale(d.bot))
                .y1(d => yScale(d.top))
                .defined(d => d.bot !== null); // Handle null values

            // Loop through rasters
            //
            for (let i = 0; i < rasterL.length; i++) {
                let myUnit   = rasterL[i];
                let myData = data[myUnit];

                // Draw area
                //
                zoomPlot.selectAll(`#${myUnit}`)
                    .transition()
                    .duration(1000)
                    .attr("fill", function(d) { return colorScale(myUnit) })
                    .attr("d", areaGen)
            }
        }
    }
}

function drawAreas(svgElement, data, areaClass, xScale, yScale, colorScale) {
    myLogger.info("drawAreas");

    // Create area
    //
    let areaGen = d3.area()
        .x(d => xScale(d.x))
        .y0(d => yScale(d.bot))
        .y1(d => yScale(d.top))
        .defined(d => d.bot !== null); // Handle null values

    // Loop through rasters
    //
    for (let i = 0; i < rasterL.length; i++) {
        let myUnit   = rasterL[i];
        let myData = data[myUnit];

        // Draw area
        //
        svgElement.append("path")
            .datum(myData)
            .attr("id", myUnit)
            .attr("class", areaClass)
            .attr("fill", function(d) { return colorScale(myUnit) })
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("d", areaGen)
    }
}

function tracker(data, x0) {
    myLogger.info("tracker");

    let xValues = data[rasterL[0]].map(d => d.x); // [10, 50, 90]
    let bisect  = d3.bisector(d => d).right;
    let index   = bisect(xValues, x0);

    // Determine index of closer value
    //
    let d0 = xValues[index - 1]
    let d1 = xValues[index]
    index  = x0 - d0.x > d1.x - x0 ? index : index - 1;
    myLogger.info(`  Tracking ${index} ${x0} ${xValues[index]}`);
    
    // Loop through rasters
    //
    for (let i = 0; i < rasterL.length; i++) {
        let myUnit  = rasterL[i];
        let myData  = data[myUnit];
        let myValue = myData[index].top;

        // Clear
        //
        let topText = '--';
        d3.select(`text#${myUnit}`).text(topText)
        
        if(myValue) { d3.select(`text#${myUnit}`).text(`${myValue.toFixed(0)}`) }
        myLogger.info(`     Unit ${myUnit} Top ${topText} ${JSON.stringify(myData[index])}`);
    }
}

function xsecLegend(svgContainer) {
    myLogger.info("xsecLegend");

    let y_top = y_box_min

    // Set legend
    //
    let descriptions = svgContainer.append("g")
        .attr("id", "xsec_descriptions")
        .attr("class", "legend_descriptions")

    // Set legend title
    //
    descriptions.append("rect")
        .attr('id', 'legendEntries')
        .attr('x', x_legend)
        .attr('y', y_top)
        .attr('width', 1)
        .attr('height', 1)
        .attr('fill', 'none')
        .attr('stroke', 'black')
        .attr('stroke-width', 0);
    descriptions.append("text")
        .attr('x', x_legend)
        .attr('y', y_top + legend_box * 0.75)
        .attr("text-anchor", "start")
        .attr("alignment-baseline", "center")
        .attr("font-family", "sans-serif")
        .attr("font-weight", "700")
        .attr("fill", 'black')
        .text('Explanation');
    
    y_top += legend_box * 0.5;

    // Loop through rasters
    //
    for (let i = 0; i < rasterL.length; i++) {
        y_top += legend_box * 1.5
        
        let myUnit   = rasterL[i];
        let Record   = explanation[myUnit];

        let id          = myUnit;
        let description = Record.description
        let symbol      = Record.symbol;
        let color       = Record.color

        let legendWidth = Math.abs(x_legend + legend_box * 2.5 - svg_width);
        myLogger.info(`legendWidth ${legendWidth}`);
        let textWrap = `${id}`
        myLogger.info(textWrap);       

        let myText = descriptions.append("text")
            .attr('class', id)
            .attr('x', x_legend + legend_box * 2.5)
            .attr('y', y_top)
            .attr("dy", "1em")
            .attr("text-anchor", "start")
            .attr("alignment-baseline", "center")
            .attr("font-family", "sans-serif")
            .attr("font-weight", "300")
            .attr("fill", 'black')
            .text(description)
            .call(wrap, legendWidth)
            .on('mouseover', function(d, i) {
                let id = d3.select(this).attr('class');
                d3.selectAll("#" + id)
                    .transition()
                    .duration(100)
                    .attr('stroke-width', 4)
                    .attr('stroke', 'yellow')
            })
            .on('mouseout', function(d, i) {
                let id = d3.select(this).attr('class');
                d3.selectAll("#" + id)
                    .transition()
                    .duration(100)
                    .attr('stroke-width', 1)
                    .attr('stroke', 'black')
            })
        
        let myTextBox = getSvg(`.${id}`)
        let myTextHeight = myTextBox.height

        let myValue = descriptions.append("text")
            .attr('id', id)
            .attr('class', 'rasterText')
            .attr("transform", d => `translate(${x_legend}, ${y_top + legend_box * 0.75})`)
            .attr("text-anchor", "end")
            //.attr("alignment-baseline", "center")
            .attr("font-family", "sans-serif")
            .attr("font-weight", "300")
            .attr("font-size", "0.75rem")
            .attr("fill", 'black')
            .text('--')

        let myRect = descriptions.append("rect")
            .attr('id', 'xsecEntries')
            .attr('class', id)
            //.attr("transform", d => `translate(${x_legend + legend_box * 1.5}, ${y_top + myTextHeight * 0.5})`)
            .attr("transform", d => `translate(${x_legend + legend_box * 0.75}, ${y_top})`)
            .attr('width', legend_box)
            .attr('height', legend_box)
            .attr('fill', color)
            .attr('stroke', 'black')
            .attr('stroke-width', 1)
            .on('mouseover', function(d, i) {
                let id = d3.select(this).attr('class');
                d3.selectAll("#" + id)
                    .transition()
                    .duration(100)
                    .attr('stroke-width', 4)
                    .attr('stroke', 'yellow')
            })
            .on('mouseout', function(d, i) {
                let id = d3.select(this).attr('class');
                d3.selectAll("#" + id)
                    .transition()
                    .duration(100)
                    .attr('stroke-width', 1)
                    .attr('stroke', 'black')
            })

        //y_top += legend_box * 0.5 + myTextHeight
        y_top += legend_box
    }
  }

