#!/usr/bin/env python3
###############################################################################
# $Id$
#
# Project:  Rasterio Python framework_xsec
# Purpose:  This script produces cross sectional view of subsurface layer for
#           a set of values along a transect establish by two or more location
#           points. The subsurface layers are represented by one or more
#           rasters that represent the land surface elevation and the underlying
#           the geologic units or other subsurface features.
#
# Author:   Leonard Orzol <llorzol@usgs.gov>
#
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

import os, sys, string, re
import math

import numpy as np
import rasterio

import json

import csv

# Set up logging
#
import logging

# -- Set logging file
#
# Create screen handler
#
screen_logger = logging.getLogger()
formatter     = logging.Formatter(fmt='%(message)s')
console       = logging.StreamHandler()
console.setFormatter(formatter)
screen_logger.addHandler(console)
screen_logger.setLevel(logging.ERROR)
screen_logger.setLevel(logging.INFO)
screen_logger.propagate = False

# Import modules for CGI handling
#
from urllib.parse import parse_qs

# ------------------------------------------------------------
# -- Set
# ------------------------------------------------------------

program      = "USGS Raster Cross Section Script"
version      = "3.13"
version_date = "March 18, 2025"
usage_message = """
Usage: framework_xsec.py
                [--help]
                [--usage]
                [--points                  Provide two or more sets of x and y coordinates]
                [--rasters                 Provide a set of rasters from land surface to bedrock (descending order)]
"""

# =============================================================================
def errorMessage(error_message):

    print("Content-type: application/json\n")
    print('{')
    print(' "status"        : "failed",')
    print(' "message": "%s" ' % error_message)
    print('}')
    
    sys.exit()

# =============================================================================

# ----------------------------------------------------------------------
# -- Main program
# ----------------------------------------------------------------------

Arguments = {}
rastersL  = []
raster_legend = {}
 
# Current directory
#
currentDir = os.path.dirname(__file__)

# Parse the Query String
#
params = {}
 
HardWired = None
#HardWired = 1

if HardWired is not None:
    os.environ['QUERY_STRING'] = 'points=1632703.5944117,550449.4082453552 2173336.1637787456,281588.25451114046&rasters=tiffs/obtop.tif,tiffs/smtop.tif,tiffs/wntop.tif,tiffs/grtop.tif,tiffs/pmtop.tif&color=framework_color_map.txt'
    os.environ['QUERY_STRING'] = 'points=2049733.082778196,461274.2283728898 2116538.356518111,440719.8276194666&rasters=tiffs/obtop.tif,tiffs/smtop.tif,tiffs/wntop.tif,tiffs/grtop.tif,tiffs/pmtop.tif&color=framework_color_map.txt'
    os.environ['QUERY_STRING'] = 'points=1460426.6901486127,353832.73086095566 2792963.1439483366,283522.8834921515&rasters=tiffs/obtop.tif,tiffs/smtop.tif,tiffs/wntop.tif,tiffs/grtop.tif,tiffs/pmtop.tif'
    
# Check URL
#
QUERY_STRING = ''

if 'QUERY_STRING' in os.environ:
    QUERY_STRING = str(os.environ['QUERY_STRING'])
    
screen_logger.info('\nQUERY_STRING: %s' % QUERY_STRING)
  
if len(QUERY_STRING) > 0:
    
    queryString = os.environ['QUERY_STRING']

    queryStringD = parse_qs(queryString, encoding='utf-8')
    screen_logger.info('\nqueryStringD %s' % str(queryStringD))

    # List of arguments
    #
    myParmsL = [
        'points',
        'rasters'
       ]
    parmL    = list(myParmsL)
    missingL = []
    
    # Check arguments
    #
    querySet = set(queryStringD.keys())
    argsSet  = set(myParmsL)
    missingL = list(argsSet.difference(querySet))
    screen_logger.info('Arguments missing %s' % str(missingL))

    # Check other arguments
    #
    if len(missingL) > 0:
        errorL = []
        if 'raster' in missingL:
            errorL.append('%s' % 'Provide a set of rasters from land surface to bedrock (descending order)')
        elif 'points' in missingL:
            errorL.append('%s' % 'Provide two or more sets of x and y coordinates')

        errorMessage('%s' % ', '.join(errorL))
    
    # Check rasters
    #
    rastersL = re.split(r"[-;,\s]\s*", queryStringD['rasters'][0])
    tempL    = list(rastersL)
    screen_logger.info('\nRasters: %s' % ' '.join(rastersL))

    if len(rastersL) < 1:
        errorMessage('%s' % 'Provide a set of rasters from land surface to bedrock (descending order)')

    while len(tempL) > 0:
        rasterFile  = str(tempL.pop(0))
        #rasterFile = os.path.join(currentDir, rasterFile)

        if not os.path.isfile(rasterFile):
            errorMessage('Error: Raster file %s does not exist' % rasterFile)

    # End points of Cross Section
    #             Real numbers
    #             regex "^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$"
    #
    pointsL = []
    tempL   = queryStringD['points'][0].split(' ')
    screen_logger.info('\nPoints %s' % str(tempL))
    while len(tempL) > 0:

        (x_coordinate, y_coordinate) = tempL[0].split(',')
        del tempL[0]
        screen_logger.info('\t\tCross section coordinates (%s, %s)' % (str(x_coordinate), str(y_coordinate)))

        myMatch = bool(re.search(r"^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$", x_coordinate))

        # Argument failed regex
        #
        if not myMatch:
            errorMessage('Provide a numeric value for x coordinate')

        myMatch = bool(re.search(r"^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$", y_coordinate))

        # Argument failed regex
        #
        if not myMatch:
            errorMessage('Provide a numeric value for y coordinate')

        pointsL.append([float(x_coordinate), float(y_coordinate)])
        
    screen_logger.info('\tCross section coordinates %s' % str(pointsL))

# Set rasters
#
rasterList = []
if len(rastersL) > 0:

    rasterD    = {}
    rasters    = []
    units      = []
    tempL      = list(rastersL)
    nrows      = None
    ncols      = None
    nlays      = len(rastersL)
    row        = None
    col        = None
    x_cell_size = None
    y_cell_size = None
    cell       = None
    cell_count = 0
    bounds     = None

    elevation_min =  9999999999999999.99
    elevation_max = -9999999999999999.99

    while len(tempL) > 0:

        rasterFile  = str(tempL.pop(0))
        NoData      = None
        rasterValue = None
        maximum     = None
        minimum     = None
        nodata      = None
            
        if not os.path.isfile(rasterFile):
            errorMessage('Error: Raster file %s does not exist' % rasterFile)

        # Remove suffix .tif
        #
        (root, tif_suffix)   = os.path.splitext(rasterFile)
        if tif_suffix is not None:
            (dir, raster) = os.path.split(root)

        # Build list of rasters
        #
        rasters.append(raster)

        # Read raster bands directly to Numpy arrays.
        #
        try:
            with rasterio.open(rasterFile) as rc:
                
                # General information for rasters
                #
                if bounds is None:
                    screen_logger.info('\n\nGeneral information for rasters')
                    kwds = rc.profile
                    #screen_logger.info(kwds)
                    bounds = rc.bounds
                    screen_logger.info('\t%s' % str(bounds))
                    x_left, y_lower, x_right, y_upper = bounds
                    ncols = rc.width
                    #screen_logger.info('Number of columns %s' % str(ncols))
                    nrows = rc.height
                    #screen_logger.info('Number of rows %s' % str(nrows))
                    shape = rc.shape
                    screen_logger.info('\tRaster shape (columns %s (x coordinate) rows %s (y coordinate) ' % (str(ncols), str(nrows)))

                    # Determine CRS parameters
                    #
                    rasterCrs = rc.crs
                    screen_logger.info('\tCoordinate system %s' % str(rasterCrs))

                    # Proj4 parameters
                    #
                    dst_crs = rc.crs.to_proj4()
                    screen_logger.info('\tRaster proj4 parameters %s' % str(dst_crs))

                    # Determine origin coordinates
                    #
                    origin_x, origin_y = rc.transform * (0, 0)
                    screen_logger.info('\tOrigin %s %s' % (str(origin_x), str(origin_y)))
                    
                    # Determine Affine parameters
                    #
                    rasterAffine = rc.transform
                    #screen_logger.info('\tAffine %s' % str(rasterAffine))
                    
                    # Determine cell sizes
                    #
                    x_cell_size = rasterAffine[0]
                    screen_logger.info('\tCell size (x-direction column) %s' % str(x_cell_size))
                    y_cell_size = rasterAffine[4]
                    screen_logger.info('\tCell size (y-direction row) %s' % str(y_cell_size))

                    # Determine row and column from coordinates
                    #
                    transformer = rasterio.transform.AffineTransformer(rasterAffine)
                    (row, col) = transformer.rowcol(float(x_coordinate), float(y_coordinate))
                    cell_count += 1
                    screen_logger.info('\tRaster row %s col %s' % (str(row), str(col)))

                    # Check cross section coordinates
                    #
                    point_number   = 0
                    total_distance = 0

                    screen_logger.info('\tChecking cross section coordinates')
                    for location in pointsL:
                        point_number += 1
                        x_coordinate  = location[0]
                        y_coordinate  = location[1]
                        screen_logger.info('\t\tCross section coordinates (%s, %s)' % (str(x_coordinate), str(y_coordinate)))

                        x2            = x_coordinate
                        y2            = y_coordinate

                        if x_coordinate < x_left or  x_coordinate > x_right:
                            errorMessage("Error: x coordinate (%s) of location %d is outside of raster (range %s to %s)" % (x_coordinate, point_number, x_left, x_right))

                        if y_coordinate < y_lower or y_coordinate > y_upper:
                            errorMessage("Error: y coordinate (%s) of location %d is outside of raster (range %s to %s)" % (y_coordinate, point_number, y_lower, y_upper))

                        if point_number > 1:
                            x_distance      = (x2 - x1) * (x2 - x1)
                            y_distance      = (y2 - y1) * (y2 - y1)
                            xy_distance     = math.sqrt(x_distance + y_distance)
                            total_distance += xy_distance

                        x1            = x_coordinate
                        y1            = y_coordinate
                                    
                    screen_logger.info('\tCross section total distance %s' % str(total_distance))
        
                # Store data
                #
                rasterData = rc.read(1, masked=True)
                
                # Store nodata
                #
                noData = rc.nodata
                screen_logger.info('\tnoData %s' % str(noData))

                screen_logger.info('\nProcessing raster %s' % raster)

        except:
            errorMessage('Error: Opening and reading raster %s' % rasterFile)

        # Store raster information
        #
        rasterD[raster] = {
            'name'    : raster,
            'file'    : rasterFile,
            'nodata'  : noData,
            'data'    : rasterData
         }

# Compute cross section segments
#
rocks             = {}
elevation_max     = -9999999999999999.99
elevation_min     =  9999999999999999.99
segment_no        = 0
cell_count        = 0
transect_distance = 0.0
total_distance    = 0.0
rowscols          = []

screen_logger.info('\n\nBuilding cross section segments')
for location in pointsL:
    x_coordinate  = location[0]
    y_coordinate  = location[1]

    x2            = x_coordinate
    y2            = y_coordinate
   
    # Compute row
    #
    end_row       = int( ( y_upper - y_coordinate ) / abs( y_cell_size ) )
       
    end_row_nu    = ( y_upper - y_coordinate ) / abs( y_cell_size )
    
    # Compute column
    #
    end_col       = int( abs( x_left - x_coordinate ) / x_cell_size )
       
    end_col_nu    = abs( x_left - x_coordinate ) / x_cell_size

    rowscols.append((end_row, end_col))

    if segment_no > 0:
        x_distance      = (x2 - x1) * (x2 - x1)
        y_distance      = (y2 - y1) * (y2 - y1)
        xy_distance     = math.sqrt(x_distance + y_distance)
        total_distance += xy_distance
        
        delta_row_nu    = float( end_row - start_row ) * x_cell_size
        delta_col_nu    = float( end_col - start_col ) * x_cell_size
        
        # Sloping transect line
        #
        if delta_col_nu != 0.0:
            slope     = delta_row_nu / delta_col_nu
            b         = start_row_nu - slope * start_col_nu
                        
            delta_col =  1
            if end_col_nu < start_col_nu:
                delta_col = -1;
        
            delta_row =  1
            if end_row_nu < start_row_nu:
                delta_row = -1;
        
        # No sloping transect line
        #
        else:
            slope     = 0.0
            b         = start_row_nu
            delta_col =  0
            delta_row =  1
            if end_row_nu < start_row_nu:
                delta_row = -1;
        
        # Logging
        #
        screen_logger.info('\tDelta col %d Delta row    %d' % (delta_col,delta_row))
        screen_logger.info('\tStart row %d Start row nu %d' % (start_row,start_row_nu))
        screen_logger.info('\tEnd row   %d End row nu   %d' % (end_row,end_row_nu))
        screen_logger.info('\tStart col %d Start col nu %d' % (start_col,start_col_nu))
        screen_logger.info('\tEnd col   %d End col nu   %d' % (end_col,end_col_nu))
        screen_logger.info('\tCell x size %f y size %f' % (x_cell_size,y_cell_size))

        # Build sampling points along row direction
        #
        screen_logger.info('\nSampling points along row direction')
        row = start_row + delta_row
        while (row != end_row):

            if slope != 0.0:
                col_nu = ( row - b ) / slope
            else:
                col_nu = start_col
                
            col                   = int(col_nu)
                           
            delta_row_nu          = ( start_row_nu - row ) * x_cell_size
            segment_row           = math.pow(delta_row_nu, 2.0)
            delta_col_nu          = ( start_col_nu - col_nu ) * x_cell_size
            segment_col           = math.pow(delta_col_nu, 2.0)
            distance              = math.sqrt(segment_row + segment_col)
            sample_distance       = transect_distance + distance
            dist                  = int(sample_distance)

            #screen_logger.info('\tRow %s Column %s Distance %s' % (str(row), str(col), str(distance)))
            
            #print "Row",row,"Col",col,"Distance",dist,"delta row",delta_row_nu,"delta col",delta_col_nu,"tran",transect_distance
        
            # Loop through rasters top to bottom
            #
            myTops = {}
            for raster in rasters:
        
                # Read raster bands directly to Numpy arrays.
                #
                rasterData = rasterD[raster]['data']

                rasterValue = rasterData[abs(row)][abs(col)]
                if str(rasterValue) != '--' and not math.isnan(rasterValue):
                    if rasterValue < elevation_min:
                        elevation_min = rasterValue
                    if rasterValue > elevation_max:
                        elevation_max = rasterValue
                else:
                    rasterValue = None

                myTops[raster] = rasterValue
                #screen_logger.info('\tRaster %s cell value %s' % (raster, str(rasterValue)))

            # Loop to set bottoms
            #
            tempL = list(rasters)
            while len(tempL):

                raster = tempL.pop(0)

                # Set rocks
                #
                if not raster in rocks:
                    rocks[raster] = {}
                if not dist in rocks[raster]:
                    rocks[raster][dist] = {}
         
                rocks[raster][dist]["top"] = None
                rocks[raster][dist]["bot"] = None
        
                # Raster information
                #
                top = myTops[raster]

                if top is not None:
                    rocks[raster][dist]["top"] = float(top)
                            
                    # Test for bottom
                    #
                    while len(tempL) > 0:
                        
                        botRaster = tempL.pop(0)

                        bot = myTops[botRaster]

                        if bot is not None:
                            rocks[raster][dist]["bot"] = float(bot)

                            tempL.insert(0, botRaster)

                            break

            row += delta_row
        
        # Build sampling points along column direction
        #
        screen_logger.info('\nSampling points along column direction')
        col = start_col + delta_col
        while (col != end_col):
        
            row_nu                = slope * col + b
            row                   = int(row_nu)
                           
            delta_row_nu          = ( start_row_nu - row ) * x_cell_size
            segment_row           = math.pow(delta_row_nu, 2.0)
            delta_col_nu          = ( start_col_nu - col ) * x_cell_size
            segment_col           = math.pow(delta_col_nu, 2.0)
            distance              = math.sqrt(segment_row + segment_col)
            sample_distance       = transect_distance + distance
            dist                  = int(sample_distance)
                
            # Loop through rasters
            #
            myTops = {}
            for raster in rasters:

                # Read raster bands directly to Numpy arrays.
                #
                rasterData = rasterD[raster]['data']

                rasterValue = rasterData[abs(row)][abs(col)]
                if str(rasterValue) != '--' and not math.isnan(rasterValue):
                    if rasterValue < elevation_min:
                        elevation_min = rasterValue
                    if rasterValue > elevation_max:
                        elevation_max = rasterValue
                else:
                    rasterValue = None
                            
                myTops[raster] = rasterValue
                #screen_logger.info('\tRaster %s cell value %s' % (raster, str(rasterValue)))

            # Loop to set bottoms
            #
            tempL = list(rasters)
            while len(tempL):

                raster = tempL.pop(0)

                # Set rocks
                #
                if not raster in rocks:
                    rocks[raster] = {}
                if not dist in rocks[raster]:
                    rocks[raster][dist] = {}
         
                rocks[raster][dist]["top"] = None
                rocks[raster][dist]["bot"] = None
        
                # Raster information
                #
                top = myTops[raster]

                if top is not None:
                    rocks[raster][dist]["top"] = float(top)
                            
                    # Test for bottom
                    #
                    while len(tempL) > 0:
                        
                        botRaster = tempL.pop(0)

                        bot = myTops[botRaster]

                        if bot is not None:
                            rocks[raster][dist]["bot"] = float(bot)

                            tempL.insert(0, botRaster)

                            break
                        
            col += delta_col

    x1                 = x_coordinate
    y1                 = y_coordinate
    start_row          = end_row
    start_row_nu       = end_row_nu
    start_col          = end_col
    start_col_nu       = end_col_nu
    segment_no        += 1
    transect_distance  = total_distance

# Plot rasters
#
try:
    # Begin JSON format
    #
    jsonL = []
    jsonL.append('{')
    jsonL.append('  "status"        : "%s",' % "success")
     
    linesL = []
    i      = 0
    for location in pointsL:
        x_coordinate  = location[0]
        y_coordinate  = location[1]
        row           = rowscols[i][0]
        col           = rowscols[i][1]

        i            += 1
        ptList = []
        ptList.append("            \"point_%d\" : {" % i)
        ptList.append("                       \"easting\"       : %15.2f," % x_coordinate)
        ptList.append("                       \"northing\"      : %15.2f," % y_coordinate)
        ptList.append("                       \"row\"           : %15d,"   % row)
        ptList.append("                       \"column\"        : %15d"   % col)
        ptList.append("                      }")

        linesL.append('%s' % '\n'.join(ptList))
    
    jsonL.append('  "points" : ')
    jsonL.append('           {')        
    jsonL.append('%s' % ',\n'.join(linesL))
    jsonL.append('           },')
    
    # Draw rasters
    #
    myRocks = []
    x_max   = -9999999999999999.99
    x_min   =  0.0
    for raster in rasters:

        # Loop through distance
        #
        last_distance = 0.0
        myRecords     = []

        for distance in sorted(rocks[raster].keys()):

            # Set top and bottom
            #
            top    = rocks[raster][distance]['top']
            bot    = rocks[raster][distance]['bot']
            
            if top is not None:
                top_txt = "%.2f" % top
            else:
                top_txt = "null"
                
            if bot is not None:
                bot_txt = "%.2f" % bot
            else:
                bot_txt = "null"

            myRecords.append('{ "x": %10.3f, "top": %s, "bot": %s }' % (last_distance,top_txt,bot_txt))
                                 
            myRecords.append('{ "x": %10.3f, "top": %s, "bot": %s }' % (distance,top_txt,bot_txt))

            last_distance = distance
        
            if distance > x_max:
                x_max = distance

        # Set unit
        #
        myRocks.append( '"%s" : [%s]' % (raster, ','.join(myRecords)))
    
    jsonL.append('  "rocks" : {')
    jsonL.append('             %s' % ',\n'.join(myRocks))
    jsonL.append('},')
  
    jsonL.append('  "nrows"         : %15d,' % nrows)
    jsonL.append('  "ncols"         : %15d,' % ncols)
    jsonL.append('  "nlays"         : %15d,' % len(rasters))
    jsonL.append('  "cell_width"    : %15.2f,' % x_cell_size)
    jsonL.append('  "cell_count":    %15d,'   % cell_count)
    jsonL.append('  "x_axis_min":    %15.2f,' % x_min)
    jsonL.append('  "x_axis_max":    %15.2f,' % x_max)
    jsonL.append('  "elevation_min": %15.2f,' % elevation_min)
    jsonL.append('  "elevation_max": %15.2f'  % elevation_max)
    jsonL.append('}')
        
    print('Content-type: application/json\n')
    print('\n'.join(jsonL))

except IOError:
    errorMessage("Error: Cannot create cross section")
