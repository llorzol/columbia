/**
 * Namespace: updateNavbar
 *
 * updateNavbar is a JavaScript library to provide a method to update the 
 *  Navbar selection by focusing and triggering the active status.
 *
 * version 1.37
 * Sptember 4, 2017
*/

/*
###############################################################################
# Copyright (c) 2017 Oregon Water Science Center
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
// Prepare when the DOM is ready 
//
function updateNavBar()
  {
   //console.log("Updating navbar");
   var pathname  = window.location.pathname;
   var pathArray = window.location.pathname.split( '/');
   var html_file = pathArray[pathArray.length - 1];
   // console.log("Path " + html_file);

   var navBars   = jQuery(".nav-tabs li");
   //console.log("navBar " + navBars.length);
   navBars.each(function(index)
      {
       //console.log("navBar -> " + this);
       var navBar = $(this).children();
       //console.log("navBar querySelectorAll " + navBar.prop('href'));
       if(navBar.prop('href').indexOf(html_file) > -1)
         {
          //console.log("navBar ==> ");
          jQuery(this).focus();
          jQuery(this).addClass("active");
          //jQuery(this).css({ 'background-color': "#d5b97c!important" });
          jQuery("#topic").html(navBar.html());
         }
      });
  }
