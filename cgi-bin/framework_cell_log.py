#!/usr/bin/env python3
###############################################################################
# $Id$
#
# Project:  Rasterio Python framework_location
# Purpose:  This script produces geologic information of subsurface layers for
#           a single location point. The subsurface layers are represented by
#           one or more rasters that represent the land surface elevation 
#           and the underlying the geologic units or other subsurface features.
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

import numpy as np
import rasterio
import rasterio.warp

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

program      = "USGS Raster Location Script"
version      = "3.11"
version_date = "February 26, 2025"
usage_message = """
Usage: framework_location.py
                [--help]
                [--usage]
                [--longitude               Provide a numeric longitude value]
                [--latitude                Provide a numeric latitude value]
                [--x                       Provide a numeric x coordinate in the raster coordinate projection]
                [--y                       Provide a numeric y coordinate in the raster coordinate projection]
                [--raster                  Provide a set of rasters from land surface to bedrock (descending order)]
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
    os.environ['QUERY_STRING'] = 'longitude=-120.81387691535224&latitude=46.423308095146126&x_coordinate=1561263.8314058625&y_coordinate=397630.901255142&color=framework_color_map.txt&rasters=tiffs/obtop.tif tiffs/smtop.tif tiffs/wntop.tif tiffs/grtop.tif tiffs/pmtop.tif'
    os.environ['QUERY_STRING'] = 'longitude=-120.81387691535224&latitude=46.423308095146126&x_coordinate=1561263.8314058625&y_coordinate=397630.901255142&color=framework_color_map.txt&rasters=tiffs/obtop.tif,tiffs/smtop.tif,tiffs/wntop.tif,tiffs/grtop.tif,tiffs/pmtop.tif'
    #os.environ['QUERY_STRING'] = 'longitude=-119.48181152343751&latitude=46.09609080214316&x_coordinate=1898715.1435567&y_coordinate=279817.25493153144&color=framework_color_map.txt&rasters=tiffs/obtop.tif,tiffs/smtop.tif,tiffs/wntop.tif,tiffs/grtop.tif,tiffs/pmtop.tif'
    #os.environ['QUERY_STRING'] = 'longitude=-119.52575683593751&latitude=45.321254361171476&x_coordinate=1891057.3624456269&y_coordinate=-2857.0708499001557&color=framework_color_map.txt&rasters=tiffs/obtop.tif,tiffs/smtop.tif,tiffs/wntop.tif,tiffs/grtop.tif,tiffs/pmtop.tif'
    os.environ['QUERY_STRING'] = 'longitude=-119.07531738281251&latitude=46.7248003746672&x_coordinate=1997685.8509084934&y_coordinate=510646.72156364744&color=framework_color_map.txt&rasters=tiffs/obtop.tif,tiffs/smtop.tif,tiffs/wntop.tif,tiffs/grtop.tif,tiffs/pmtop.tif'
    os.environ['QUERY_STRING'] = 'longitude=-118.32824707031251&latitude=46.06166996192512&x_coordinate=2191647.6286216783&y_coordinate=273187.42898256733&color=framework_color_map.txt&rasters=tiffs/obtop.tif,tiffs/smtop.tif,tiffs/wntop.tif,tiffs/grtop.tif,tiffs/pmtop.tif'
    os.environ['QUERY_STRING'] = 'longitude=-117.58721927180888&latitude=46.20239286768872&x_coordinate=2377764.965356479&y_coordinate=330530.0168397045&color=framework_color_map.txt&rasters=tiffs/obtop.tif,tiffs/smtop.tif,tiffs/wntop.tif,tiffs/grtop.tif,tiffs/pmtop.tif'

# Check URL
#
QUERY_STRING = ''

if 'QUERY_STRING' in os.environ:
    QUERY_STRING = str(os.environ['QUERY_STRING'])
    
screen_logger.debug('\nQUERY_STRING: %s' % QUERY_STRING)
  
if len(QUERY_STRING) > 0:
    
    queryString = os.environ['QUERY_STRING']

    queryStringD = parse_qs(queryString, encoding='utf-8')
    screen_logger.debug('\nqueryStringD %s' % str(queryStringD))

    # List of arguments
    #
    myParmsL = [
        'longitude',
        'latitude',
        'x_coordinate',
        'y_coordinate',
        'rasters'
       ]
    parmL    = list(myParmsL)
    missingL = []
    
    # Check arguments
    #
    querySet = set(queryStringD.keys())
    argsSet  = set(myParmsL)
    missingL = list(argsSet.difference(querySet))
    screen_logger.debug('Arguments missing %s' % str(missingL))

    # Check other arguments
    #
    if len(missingL) > 0:
        errorL = []
        if 'raster' in missingL:
            errorL.append('%s' % 'Provide a set of rasters from land surface to bedrock (descending order)')
        elif 'longitude' in missingL:
            errorL.append('%s' % 'Provide a numeric longitude value')
        elif 'latitude' in missingL:
            errorL.append('%s' % 'Provide a numeric latitude value')
        elif 'x_coordinate' in missingL:
            errorL.append('%s' % 'Provide a numeric x_coordinate value')
        elif 'y_coordinate' in missingL:
            errorL.append('%s' % 'Provide a numeric y_coordinate value')
        elif 'color' in missingL:
            errorL.append('%s' % 'Provide a color specification file name containing a list of description and colors for each raster')

        errorMessage('%s' % ', '.join(errorL))
    
    # Check rasters
    #
    rastersL = re.split(r"[-;,\s]\s*", queryStringD['rasters'][0])
    tempL    = list(rastersL)
    screen_logger.debug('\nRasters: %s' % ' '.join(rastersL))

    if len(rastersL) < 1:
        errorMessage('%s' % 'Provide a set of rasters from land surface to bedrock (descending order)')

    while len(tempL) > 0:
        rasterFile  = str(tempL.pop(0))
        #rasterFile = os.path.join(currentDir, rasterFile)

        if not os.path.isfile(rasterFile):
            errorMessage('Error: Raster file %s does not exist' % rasterFile)

    # Real numbers
    #             regex "^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$"
    #
    for myParm in ['longitude', 'latitude', 'x_coordinate', 'y_coordinate']:

        myArg = queryStringD[myParm][0]

        myMatch = bool(re.search(r"^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$", myArg))

        # Argument failed regex
        #
        if not myMatch:
            errorMessage('Provide a numeric value for %s' % myParm)

        if myParm == 'longitude':
            longitude = float(myArg)
        elif myParm == 'latitude':
            latitude = float(myArg)
        elif myParm == 'x_coordinate':
            x_coordinate = float(myArg)
        elif myParm == 'y_coordinate':
            y_coordinate = float(myArg)
            
        screen_logger.info('\n%s: %s' % (myParm, str(myArg)))

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
    cell_size  = None
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

                    # Determine x,y coordinates from longitude/latitude
                    #
                    src_crs = {'init': 'EPSG:4326'}
                    #src_crs = CRS.from_proj4("+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs")
                    screen_logger.info('\tWGS84 proj4 parameters %s' % str(src_crs))
                    src_coords = [[longitude, latitude]]
                    screen_logger.info('\tWGS84 coordinates %s' % str(src_coords))
                    dst_coords = [[ 0, 0]]
                    #new_coords = reproject_coords(src_coords, dst_coords, src_crs=src_crs, dst_crs=dst_crs, resampling=Resampling.nearest)
                    #screen_logger.info('\tProjected coordinates %s' % str(new_coords))
                    
                    # Determine Affine parameters
                    #
                    rasterAffine = rc.transform
                    #screen_logger.info('\tAffine %s' % str(rasterAffine))

                    # Determine origin coordinates
                    #
                    origin_x, origin_y = rc.transform * (0, 0)
                    screen_logger.info('\tOrigin %s %s' % (str(origin_x), str(origin_y)))

                    # Determine row and column from coordinates
                    #
                    transformer = rasterio.transform.AffineTransformer(rasterAffine)
                    (row, col) = transformer.rowcol(float(x_coordinate), float(y_coordinate))
                    cell_count += 1
                    screen_logger.info('\tRaster row %s col %s' % (str(row), str(col)))
                    (row, col) = transformer.rowcol(float(x_coordinate), float(y_coordinate))
                    cell_count += 1
                    screen_logger.info('\tRaster row %s col %s' % (str(row), str(col)))

                    # Bounding box of cell
                    #
                    geoInfo   = rc.transform
                    cell_x_size = geoInfo[0]
                    screen_logger.info('\tColumn cell size %s (x direction)' % str(cell_x_size))
                    cell_y_size = geoInfo[4]
                    screen_logger.info('\tRow cell size %s (y direction)' % str(cell_y_size))
                    
                    x = col
                    y = row
                    upper_left  = rc.transform * (x, y) 
                    screen_logger.info('\tCell upper_left  %s' %  str(upper_left))
                    
                    x = col + 1
                    y = row
                    upper_right  = rc.transform * (x, y)
                    screen_logger.info('\tCell upper_right %s' % str(upper_right))
                    
                    x = col + 1
                    y = row + 1
                    lower_right = rc.transform * (x, y)
                    screen_logger.info('\tCell lower_right %s' %  str(lower_right))
                    
                    x = col
                    y = row + 1
                    lower_left  = rc.transform * (x, y)
                    screen_logger.info('\tCell lower_left  %s' %  str(lower_left))
                    
                    cell = [ upper_left, upper_right, lower_right, lower_left]
                    #screen_logger.info('\tCell %s' %  str(cell))

                    # Computing row/col
                    #
                    rowEst = abs(origin_y - float(y_coordinate)) / cell_y_size
                    colEst = abs(origin_x - float(x_coordinate)) / cell_x_size
                    screen_logger.info('\tEstimated Raster row %s col %s' % (str(rowEst), str(colEst)))

                    py, px = rc.index(float(x_coordinate), float(y_coordinate))
                    screen_logger.info('\tPixel location x %s y %s' % (str(px), str(py)))

                screen_logger.info('\nProcessing raster %s' % raster)

                noData = rc.nodata
                screen_logger.info('\tnoData %s' % str(noData))

                # Raster cell value
                #
                rasterData = rc.read(1, masked=True)

                rasterValue = rasterData[abs(row)][abs(col)]
                if str(rasterValue) != '--':

                    rasterList.append({"unit": '%s' % raster, "top_elev": '%s' % rasterValue})
                    
                else:
                    rasterValue = 'null'                    
                screen_logger.info('\tRaster cell value %s' % str(rasterValue))

        except:
            errorMessage('Error: Opening and reading raster %s' % rasterFile)

    screen_logger.info('\nDone reading rasters')

    # Output raster information
    #
    landSurface = None
    if len(rasterList) > 0:
    
        for i in range(len(rasterList)):

            top_elev = float(rasterList[i]['top_elev'])

            if landSurface is None:
                landSurface = top_elev
 
            top_depth = landSurface - top_elev
            rasterList[i]['top_depth'] = top_depth
               
            j = i + 1
            if j <= len(rasterList) - 1:
                bot_elev = float(rasterList[j]['top_elev'])
                rasterList[i]['top_elev'] = top_elev
                rasterList[i]['bot_elev'] = bot_elev
                rasterList[i]['bot_depth'] = landSurface - bot_elev
                rasterList[i]['thickness'] = top_elev - bot_elev
                
            else:
                rasterList[i]['top_elev'] = top_elev
                rasterList[i]['bot_elev'] = None
                rasterList[i]['bot_depth'] = None
                rasterList[i]['thickness'] = None

    screen_logger.info('Done with cell information\n')

    # Begin JSON format
    #
    jsonL = []
    jsonL.append('{')
    jsonL.append('  "status"        : "%s",' % "success")
    
    jsonL.append('  "cell_log" : ')
    jsonL.append('             %s' % json.dumps(rasterList))
    jsonL.append('}')
        
    print('Content-type: application/json\n')
    print('\n'.join(jsonL))
    
else:

    usage_message = ", ".join([
    'Provide a longitude value',
    'Provide a latitude value',
    'Provide a x coordinate in the raster coordinate projection',
    'Provide a y coordinate in the raster coordinate projection',
    #'Provide a path to directory containing the set of rasters',
    'Provide a set of rasters from land surface to bedrock (descending order)'
    ])
    errorMessage(usage_message)

sys.exit()
