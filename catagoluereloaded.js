// ==UrerScript==
// @name        Catagolue Reloaded
// @namespace   None
// @description Various useful tweaks to Catagolue object pages.
// @include     https://catagolue.appspot.com/object/*
// @version     3.1
// @grant       none
// ==/UserScript==

// "On second thought, let's not hack in Javascript. 'tis a silly language."

// separator used for breadcrumb navigation links
var breadcrumbSeparator = " » "; // > ›

// change these in case Catagolue moves.
var catagolueURLscheme = "https://";
var catagolueHostName  = "catagolue.appspot.com";

// MAIN function.
function MAIN() {

	// read page parameters
	var params = readParams();

	if(params != null) {

		// do our work.
		addNavLinks    (params);
		handleSampleSoups(params);
		objectToRLE    (params);

	} else {

		// this shouldn't happen on pages where this script actually runs.
		console.log("Could not read page parameters.");

	}
}

/*********************************
 * HTML-related helper functions *
 *********************************/

// find the heading containing the object's code
function findTitleHeading() {

	// find the content div; the heading is (currently) its first child.
	var content = document.getElementById("content");
	if(content)
		return content.firstElementChild;

	// this shouldn't happen unless the page layout changes.
	return null;

}

// find the H2 beginning the comments section.
function findCommentsH2() {

	var contentRegex = /Comments \(/;

	// most elements on Catagolue pages do not have ids etc., so instead we 
	// look for the right h2 tag.
	// NOTE: this may break if Catagolue's page layout changes.
	var h2s = document.getElementsByTagName("h2");
	for(var i = 0; i < h2s.length; i++) {
	  
		if(contentRegex.test(h2s[i].textContent)) {
			return h2s[i];
		}
	}

	// not found?
	return null;

}

// find the paragraph containing the sample soup links.
function findSampleSoupsParagraph() {

	// most elements on Catagolue pages do not have ids etc., so instead we
	// look for the right h3 tag; the paragraph we want is the following 
	// element.
	// NOTE: this may break if Catagolue's page layout changes.
	var h3s = document.getElementsByTagName("h3");
	for(var i = 0; i < h3s.length; i++) {
	  
		if(h3s[i].textContent == "Sample occurrences") {
			return h3s[i].nextElementSibling;
		}
	}

	// not found?
	return null;

}

// append a table row containing a hr element to a node (a table, in practice).
function appendHR(node) {

	var hrRow  = document.createElement("tr");
	var hrCell = document.createElement("td");
	var hr     = document.createElement("hr");

	// HACK: hardcoded colspan=3.
	hrCell.colSpan             = "3";
	hrCell.style.paddingTop    = "0";
	hrCell.style.paddingBottom = "0"
    hr.    style.margin        = "0";


	node.  appendChild(hrRow);
	hrRow. appendChild(hrCell);
	hrCell.appendChild(hr);

}

// read and return apgcode, rulestring etc.
function readParams() {

	// regular expression to extract apgcode and rulestring from the page URL
	var locRegex = /object\/(.*?)\/(.*)/;

	// regular expression to extract prefix and encoded object from apgcode
	var codeRegex = /^(.*?)_(.*)$/;

	var matches = locRegex.exec(document.location);
	if(matches) {

		var params = new Object;

		// parameters extracted from URL go here.

		params["apgcode"] = matches[1];

		// the rulestring may or may not contain the symmetry as well.
		// Normally it won't, but if the user came from a page that our
		// symmetry injector script ran on, it will.
		if(matches[2].indexOf("/") == -1) {

			params["rule"    ] = matches[2];
			params["symmetry"] = null;

		} else {

			var pieces = matches[2].split("/", 2);

			params["rule"    ] = pieces[0];
			params["symmetry"] = pieces[1];

		}

		// pathologicals do not have an object code apart from the prefix
		// itself.
		if(matches[1] == "PATHOLOGICAL") {

			params["prefix"] = "PATHOLOGICAL";
			params["object"] = "";

		} else {

			// separate prefix from code proper.
			// FIXME: shouldn't simply assume this succeeds, I guess.
			var pieces = codeRegex.exec(matches[1]);

			params["prefix" ] = pieces[1];
			params["object" ] = pieces[2];

		}

		// other parameters go here.
		// (none yet)

		return params;
	}

	// location didn't match.
	return null;

}

// create and return a hyperlink
function makeLink(linkTarget, linkText) {

	// create a new "a" element
	var link = document.createElement("a");

	link.href        = linkTarget;
	link.textContent = linkText;

	return link;

}

/****************************************
 * General GoL-related helper functions *
 ****************************************/

// return an empty universe of the desired size
function emptyUniverse(bx, by) {

	// there's no autovivification.
	var universe = new Array(bx);
	for (var i = 0; i < bx; i++) {
		universe[i] = new Array(by);
	}

	return universe;
}

// convert a rulestring to slashed uppercase notation, e.g. "B3/S23" instead
// of "b3s23" etc. Note that named rules (e.g. "tlife") are left alone, as are
// neighborhood conditions in non-totalistic rules in Hensel notation.
function ruleSlashedUpper(rule) {

	rule = rule.replace(new RegExp("b", "g"), "B");
	rule = rule.replace(new RegExp("s", "g"), "/S");

	// we may have introduced double slashes.
	rule = rule.replace(new RegExp("//", "g"), "/");

	return rule;

}

// debugging function: return a pattern object as a string, suitable for
// visual inspection (e.g. using console.log).
function patternToString(patternObject) {

	// string to return
	var strPattern = "";

	// read pattern line by line
	for(var i = 0; i <= patternObject["by"]; i++) {
		for(var j = 0; j <= patternObject["bx"]; j++) {

			// live cells are represented by an O, dead ones by a .
			if(patternObject["pattern"][j][i])
				strPattern += "O";
			else
				strPattern += ".";
		}

		// add a linebreak at the end of each pattern line
		strPattern += "\n";
	}

	return strPattern;
}

/************************************
 * apgcode-related helper functions *
 ************************************/

// decode w/x/y in an apgcode.
// FIXME: there's got to be a more elegant/idiomatic way of doing this.
function apgcodeDecodeWXY(code) {

	// replace y0 to y9 with 4 to 13 zeroes, respectively.
	for(var i = 0; i <= 9; i++) {
		code = code.replace(new RegExp("y" + i.toString(), "g"), "0".repeat(i + 4));
	}

	// replace ya to yz with 14 to 39 zeroes, respectively.
	// NOTE: 97=ord('a'); 122=ord('z').
	for(var i = 97; i <= 122; i++) {
		code = code.replace(new RegExp("y" + String.fromCharCode(i), "g"), "0".repeat(i - 83));
	}

	// finally, replace w and x with 2 and 3 zeroes, respectively.
	// NOTE: this needs to come last so yw and yx will be handled correctly.
	code = code.replace(new RegExp("w", "g"), "00");
	code = code.replace(new RegExp("x", "g"), "000");

	return code;

}

// Convert an object (represented by its apgcode) to a pattern.
function apgcodeToPattern(object, rule) {

	// create a 40x40 array to hold the pattern. Note that 40x40 is the 
	// maximum object size;  larger objects are classified as PATHOLOGICAL on
	// Catagolue.
	var pattern = emptyUniverse(40, 40);

	// decode w/x/y
	object = apgcodeDecodeWXY(object);

	// split object's apgcode into strips.
	var strips = object.split("z");

	// bounding box; this is computed en passant.
	var bx = 0;
	var by = 0;

	for(var i = 0; i < strips.length; i++) {

		// split strip into characters.
		var characters = strips[i].split("");

		for(var j = 0; j < characters.length; j++) {
			var charCode = characters[j].charCodeAt(0);

			// decode character. Letters a-v denote numbers 10-31.
			var number = 0;
			if((charCode >= 48) && (charCode <= 57)) {
				number = charCode - 48;
			} else if((charCode >= 97) && (charCode <= 118)) {
				number = charCode - 87;
			}

			// each character encodes five bits.
			for(var bit = 0; bit <= 4; bit++) {

				var x = j;
				var y = i * 5 + bit;

				// If a bit is set...
				if(number & (Math.pow(2, bit))) {

					// take note of bounding box.
					if(x > bx)
						bx = x;

					if(y > by)
						by = y;

					// and set the cell for this bit.
					pattern[x][y] = 1;
				}
			}
		}
	}

	var ret = new Object();

	ret["pattern"] = pattern;
	ret["bx"     ] = bx;
	ret["by"     ] = by;
	ret["rule"   ] = rule;

	return ret;
}

/********************************
 * RLE-related helper functions *
 ********************************/

// return an encoded RLE run.
function RLEAddRun(count, state) {

	var ret = "";

	if(count > 1)
		ret += count.toString();

	// dead cells are encoded as "b", live cells as "o".
	if(state == 1)
		ret += "o";
	else
		ret += "b";

	return ret;
}

// convert a pattern to an RLE string.
function patternToRLE(patternObject) {

	// extract values
	var pattern = patternObject["pattern"];
	var bx      = patternObject["bx"];
	var by      = patternObject["by"];
	var rule    = patternObject["rule"];

	// RLE pattern
	// the first line is a header.
	var RLE = "x = " + (bx + 1) + ", y = " + (by + 1) + ", rule = " + ruleSlashedUpper(rule) + "\n";

	// state of the ongoing run
	var currentState = "NONE";
	var runCount     = 0;

	var currentLine  = "";

	// read pattern linewise
	for(var i = 0; i <= by; i++) {
		for(var j = 0; j <= bx; j++) {

			// current cell we're looking at
			var cell = pattern[j][i];

			// did we change state?
			if(cell != currentState) {

				// if our line's getting too long, flush it.
				// FIXME: this may actually produce lines slightly longer 
				// than 70 chars. Not a problem in practice, but strictly
				// speaking a violation of the spec.
				if(currentLine.length >= 70) {
					RLE         += currentLine + "\n";
					currentLine  = "";
				}

				// if we have an ongoing run, wrap that up.
				if(currentState != "NONE")
					currentLine += RLEAddRun(runCount, currentState);

				// begin a new run
				currentState = cell;
				runCount     = 1;

			} else
				// continue ongoing run
				runCount++;

		}

		// wrap up current run.
		currentLine += RLEAddRun(runCount, currentState);

		// reset run.
		runCount     = 0;
		currentState = "NONE";

		// if this isn't the last line, begin a new one.
		if(i < by)
			currentLine += "$";
	}

	// wrap up RLE
	RLE += currentLine + "!\n";

	return RLE;

}

/***********************
 * Major functionality *
 ***********************/

/*** INJECTED MD5 SCRIPT ***/

/***************************************************************************
 * NOTE: all code in this script was written by Paul Johnson and is taken  *
 * from http://pajhome.org.uk/crypt/md5/md5.html . The code is licensed    *
 * under the 3-clause BSD license, which is compatible with the GNU GPL.   *
 * See http://pajhome.org.uk/site/legal.html#bsdlicense , as well as the   *
 * FSF's https://www.gnu.org/licenses/license-list.html#ModifiedBSD .      *
 ***************************************************************************/

var MD5Script = `

/*
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.2 Copyright (C) Paul Johnston 1999 - 2009
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */

/*
 * Configurable variables. You may need to tweak these to be compatible with
 * the server-side, but the defaults work in most cases.
 */
var hexcase = 0;   /* hex output format. 0 - lowercase; 1 - uppercase        */
var b64pad  = "";  /* base-64 pad character. "=" for strict RFC compliance   */

/*
 * These are the functions you'll usually want to call
 * They take string arguments and return either hex or base-64 encoded strings
 */
function hex_md5(s)    { return rstr2hex(rstr_md5(str2rstr_utf8(s))); }
function b64_md5(s)    { return rstr2b64(rstr_md5(str2rstr_utf8(s))); }
function any_md5(s, e) { return rstr2any(rstr_md5(str2rstr_utf8(s)), e); }
function hex_hmac_md5(k, d)
  { return rstr2hex(rstr_hmac_md5(str2rstr_utf8(k), str2rstr_utf8(d))); }
function b64_hmac_md5(k, d)
  { return rstr2b64(rstr_hmac_md5(str2rstr_utf8(k), str2rstr_utf8(d))); }
function any_hmac_md5(k, d, e)
  { return rstr2any(rstr_hmac_md5(str2rstr_utf8(k), str2rstr_utf8(d)), e); }

/*
 * Perform a simple self-test to see if the VM is working
 */
function md5_vm_test()
{
  return hex_md5("abc").toLowerCase() == "900150983cd24fb0d6963f7d28e17f72";
}

/*
 * Calculate the MD5 of a raw string
 */
function rstr_md5(s)
{
  return binl2rstr(binl_md5(rstr2binl(s), s.length * 8));
}

/*
 * Calculate the HMAC-MD5, of a key and some data (raw strings)
 */
function rstr_hmac_md5(key, data)
{
  var bkey = rstr2binl(key);
  if(bkey.length > 16) bkey = binl_md5(bkey, key.length * 8);

  var ipad = Array(16), opad = Array(16);
  for(var i = 0; i < 16; i++)
  {
    ipad[i] = bkey[i] ^ 0x36363636;
    opad[i] = bkey[i] ^ 0x5C5C5C5C;
  }

  var hash = binl_md5(ipad.concat(rstr2binl(data)), 512 + data.length * 8);
  return binl2rstr(binl_md5(opad.concat(hash), 512 + 128));
}

/*
 * Convert a raw string to a hex string
 */
function rstr2hex(input)
{
  try { hexcase } catch(e) { hexcase=0; }
  var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
  var output = "";
  var x;
  for(var i = 0; i < input.length; i++)
  {
    x = input.charCodeAt(i);
    output += hex_tab.charAt((x >>> 4) & 0x0F)
           +  hex_tab.charAt( x        & 0x0F);
  }
  return output;
}

/*
 * Convert a raw string to a base-64 string
 */
function rstr2b64(input)
{
  try { b64pad } catch(e) { b64pad=''; }
  var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var output = "";
  var len = input.length;
  for(var i = 0; i < len; i += 3)
  {
    var triplet = (input.charCodeAt(i) << 16)
                | (i + 1 < len ? input.charCodeAt(i+1) << 8 : 0)
                | (i + 2 < len ? input.charCodeAt(i+2)      : 0);
    for(var j = 0; j < 4; j++)
    {
      if(i * 8 + j * 6 > input.length * 8) output += b64pad;
      else output += tab.charAt((triplet >>> 6*(3-j)) & 0x3F);
    }
  }
  return output;
}

/*
 * Convert a raw string to an arbitrary string encoding
 */
function rstr2any(input, encoding)
{
  var divisor = encoding.length;
  var i, j, q, x, quotient;

  /* Convert to an array of 16-bit big-endian values, forming the dividend */
  var dividend = Array(Math.ceil(input.length / 2));
  for(i = 0; i < dividend.length; i++)
  {
    dividend[i] = (input.charCodeAt(i * 2) << 8) | input.charCodeAt(i * 2 + 1);
  }

  /*
   * Repeatedly perform a long division. The binary array forms the dividend,
   * the length of the encoding is the divisor. Once computed, the quotient
   * forms the dividend for the next step. All remainders are stored for later
   * use.
   */
  var full_length = Math.ceil(input.length * 8 /
                                    (Math.log(encoding.length) / Math.log(2)));
  var remainders = Array(full_length);
  for(j = 0; j < full_length; j++)
  {
    quotient = Array();
    x = 0;
    for(i = 0; i < dividend.length; i++)
    {
      x = (x << 16) + dividend[i];
      q = Math.floor(x / divisor);
      x -= q * divisor;
      if(quotient.length > 0 || q > 0)
        quotient[quotient.length] = q;
    }
    remainders[j] = x;
    dividend = quotient;
  }

  /* Convert the remainders to the output string */
  var output = "";
  for(i = remainders.length - 1; i >= 0; i--)
    output += encoding.charAt(remainders[i]);

  return output;
}

/*
 * Encode a string as utf-8.
 * For efficiency, this assumes the input is valid utf-16.
 */
function str2rstr_utf8(input)
{
  var output = "";
  var i = -1;
  var x, y;

  while(++i < input.length)
  {
    /* Decode utf-16 surrogate pairs */
    x = input.charCodeAt(i);
    y = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
    if(0xD800 <= x && x <= 0xDBFF && 0xDC00 <= y && y <= 0xDFFF)
    {
      x = 0x10000 + ((x & 0x03FF) << 10) + (y & 0x03FF);
      i++;
    }

    /* Encode output as utf-8 */
    if(x <= 0x7F)
      output += String.fromCharCode(x);
    else if(x <= 0x7FF)
      output += String.fromCharCode(0xC0 | ((x >>> 6 ) & 0x1F),
                                    0x80 | ( x         & 0x3F));
    else if(x <= 0xFFFF)
      output += String.fromCharCode(0xE0 | ((x >>> 12) & 0x0F),
                                    0x80 | ((x >>> 6 ) & 0x3F),
                                    0x80 | ( x         & 0x3F));
    else if(x <= 0x1FFFFF)
      output += String.fromCharCode(0xF0 | ((x >>> 18) & 0x07),
                                    0x80 | ((x >>> 12) & 0x3F),
                                    0x80 | ((x >>> 6 ) & 0x3F),
                                    0x80 | ( x         & 0x3F));
  }
  return output;
}

/*
 * Encode a string as utf-16
 */
function str2rstr_utf16le(input)
{
  var output = "";
  for(var i = 0; i < input.length; i++)
    output += String.fromCharCode( input.charCodeAt(i)        & 0xFF,
                                  (input.charCodeAt(i) >>> 8) & 0xFF);
  return output;
}

function str2rstr_utf16be(input)
{
  var output = "";
  for(var i = 0; i < input.length; i++)
    output += String.fromCharCode((input.charCodeAt(i) >>> 8) & 0xFF,
                                   input.charCodeAt(i)        & 0xFF);
  return output;
}

/*
 * Convert a raw string to an array of little-endian words
 * Characters >255 have their high-byte silently ignored.
 */
function rstr2binl(input)
{
  var output = Array(input.length >> 2);
  for(var i = 0; i < output.length; i++)
    output[i] = 0;
  for(var i = 0; i < input.length * 8; i += 8)
    output[i>>5] |= (input.charCodeAt(i / 8) & 0xFF) << (i%32);
  return output;
}

/*
 * Convert an array of little-endian words to a string
 */
function binl2rstr(input)
{
  var output = "";
  for(var i = 0; i < input.length * 32; i += 8)
    output += String.fromCharCode((input[i>>5] >>> (i % 32)) & 0xFF);
  return output;
}

/*
 * Calculate the MD5 of an array of little-endian words, and a bit length.
 */
function binl_md5(x, len)
{
  /* append padding */
  x[len >> 5] |= 0x80 << ((len) % 32);
  x[(((len + 64) >>> 9) << 4) + 14] = len;

  var a =  1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d =  271733878;

  for(var i = 0; i < x.length; i += 16)
  {
    var olda = a;
    var oldb = b;
    var oldc = c;
    var oldd = d;

    a = md5_ff(a, b, c, d, x[i+ 0], 7 , -680876936);
    d = md5_ff(d, a, b, c, x[i+ 1], 12, -389564586);
    c = md5_ff(c, d, a, b, x[i+ 2], 17,  606105819);
    b = md5_ff(b, c, d, a, x[i+ 3], 22, -1044525330);
    a = md5_ff(a, b, c, d, x[i+ 4], 7 , -176418897);
    d = md5_ff(d, a, b, c, x[i+ 5], 12,  1200080426);
    c = md5_ff(c, d, a, b, x[i+ 6], 17, -1473231341);
    b = md5_ff(b, c, d, a, x[i+ 7], 22, -45705983);
    a = md5_ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
    d = md5_ff(d, a, b, c, x[i+ 9], 12, -1958414417);
    c = md5_ff(c, d, a, b, x[i+10], 17, -42063);
    b = md5_ff(b, c, d, a, x[i+11], 22, -1990404162);
    a = md5_ff(a, b, c, d, x[i+12], 7 ,  1804603682);
    d = md5_ff(d, a, b, c, x[i+13], 12, -40341101);
    c = md5_ff(c, d, a, b, x[i+14], 17, -1502002290);
    b = md5_ff(b, c, d, a, x[i+15], 22,  1236535329);

    a = md5_gg(a, b, c, d, x[i+ 1], 5 , -165796510);
    d = md5_gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
    c = md5_gg(c, d, a, b, x[i+11], 14,  643717713);
    b = md5_gg(b, c, d, a, x[i+ 0], 20, -373897302);
    a = md5_gg(a, b, c, d, x[i+ 5], 5 , -701558691);
    d = md5_gg(d, a, b, c, x[i+10], 9 ,  38016083);
    c = md5_gg(c, d, a, b, x[i+15], 14, -660478335);
    b = md5_gg(b, c, d, a, x[i+ 4], 20, -405537848);
    a = md5_gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
    d = md5_gg(d, a, b, c, x[i+14], 9 , -1019803690);
    c = md5_gg(c, d, a, b, x[i+ 3], 14, -187363961);
    b = md5_gg(b, c, d, a, x[i+ 8], 20,  1163531501);
    a = md5_gg(a, b, c, d, x[i+13], 5 , -1444681467);
    d = md5_gg(d, a, b, c, x[i+ 2], 9 , -51403784);
    c = md5_gg(c, d, a, b, x[i+ 7], 14,  1735328473);
    b = md5_gg(b, c, d, a, x[i+12], 20, -1926607734);

    a = md5_hh(a, b, c, d, x[i+ 5], 4 , -378558);
    d = md5_hh(d, a, b, c, x[i+ 8], 11, -2022574463);
    c = md5_hh(c, d, a, b, x[i+11], 16,  1839030562);
    b = md5_hh(b, c, d, a, x[i+14], 23, -35309556);
    a = md5_hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
    d = md5_hh(d, a, b, c, x[i+ 4], 11,  1272893353);
    c = md5_hh(c, d, a, b, x[i+ 7], 16, -155497632);
    b = md5_hh(b, c, d, a, x[i+10], 23, -1094730640);
    a = md5_hh(a, b, c, d, x[i+13], 4 ,  681279174);
    d = md5_hh(d, a, b, c, x[i+ 0], 11, -358537222);
    c = md5_hh(c, d, a, b, x[i+ 3], 16, -722521979);
    b = md5_hh(b, c, d, a, x[i+ 6], 23,  76029189);
    a = md5_hh(a, b, c, d, x[i+ 9], 4 , -640364487);
    d = md5_hh(d, a, b, c, x[i+12], 11, -421815835);
    c = md5_hh(c, d, a, b, x[i+15], 16,  530742520);
    b = md5_hh(b, c, d, a, x[i+ 2], 23, -995338651);

    a = md5_ii(a, b, c, d, x[i+ 0], 6 , -198630844);
    d = md5_ii(d, a, b, c, x[i+ 7], 10,  1126891415);
    c = md5_ii(c, d, a, b, x[i+14], 15, -1416354905);
    b = md5_ii(b, c, d, a, x[i+ 5], 21, -57434055);
    a = md5_ii(a, b, c, d, x[i+12], 6 ,  1700485571);
    d = md5_ii(d, a, b, c, x[i+ 3], 10, -1894986606);
    c = md5_ii(c, d, a, b, x[i+10], 15, -1051523);
    b = md5_ii(b, c, d, a, x[i+ 1], 21, -2054922799);
    a = md5_ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
    d = md5_ii(d, a, b, c, x[i+15], 10, -30611744);
    c = md5_ii(c, d, a, b, x[i+ 6], 15, -1560198380);
    b = md5_ii(b, c, d, a, x[i+13], 21,  1309151649);
    a = md5_ii(a, b, c, d, x[i+ 4], 6 , -145523070);
    d = md5_ii(d, a, b, c, x[i+11], 10, -1120210379);
    c = md5_ii(c, d, a, b, x[i+ 2], 15,  718787259);
    b = md5_ii(b, c, d, a, x[i+ 9], 21, -343485551);

    a = safe_add(a, olda);
    b = safe_add(b, oldb);
    c = safe_add(c, oldc);
    d = safe_add(d, oldd);
  }
  return Array(a, b, c, d);
}

/*
 * These functions implement the four basic operations the algorithm uses.
 */
function md5_cmn(q, a, b, x, s, t)
{
  return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s),b);
}
function md5_ff(a, b, c, d, x, s, t)
{
  return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
}
function md5_gg(a, b, c, d, x, s, t)
{
  return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
}
function md5_hh(a, b, c, d, x, s, t)
{
  return md5_cmn(b ^ c ^ d, a, b, x, s, t);
}
function md5_ii(a, b, c, d, x, s, t)
{
  return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safe_add(x, y)
{
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function bit_rol(num, cnt)
{
  return (num << cnt) | (num >>> (32 - cnt));
}

`

/*** End of Paul Johnson's MD5 code ***/

/*** INJECTED SAMPLE SOUP OVERLAY SCRIPT ***/

var sampleSoupOverlayScript = `

// Event handler to close sample soup overlay. Based on (with modifications)
// https://stackoverflow.com/posts/3369743/revisions .
function closeSoupOverlay(evt) {

    evt          = evt || window.event;
    var isEscape = false;
    var isClick  = false;

    if("key" in evt)
        isEscape = (evt.key == "Escape");
    else
        isEscape = (evt.keyCode == 27);

    if("type" in evt)
        isClick = (evt.type == "mousedown");

    if(isEscape || isClick) {
        var overlayDiv = document.getElementById("sampleSoupOverlay");
        if(overlayDiv)
            overlayDiv.parentNode.removeChild(overlayDiv);
    }

}

function overlaySoup(soupURL, soupNumber, totalSoups) {

	// regex to extract soup seed etc. from soupURL
	// FIXME: using \d instead of [0-9] does not work. Why?
	var soupURLRegex = new RegExp("^" + catagolueURLScheme + catagolueHostName + "/hashsoup/(.*?)/((m_|n_)?[A-Za-z0-9]{12})([0-9]*)/(.*)$");

	// match regex against soup URL. This also verifies that we're not getting
	// passed just any URL to load remotely.
	var matches = soupURLRegex.exec(soupURL);

	if(!matches) {
		// URL could not be parsed
		console.log("Could not parse soup URL: " + soupURL);
		return false;
	}

	// collect soup parameters.
	// NOTE: seedPrefix would indicate if the haul was submitted using 
	// apgsearch 0.x/1.x (empty string), apgnano 2.x ("n_") or apgmera 3.x
	// ("m_"), but we have no use for this at the moment.
	var symmetry         = matches[1];
	var seed             = matches[2];
	// var seedPrefix       = matches[3];
	var soupNumberInHaul = matches[4];
	var rule             = matches[5];

	// URL for the haul containing this soup.
	var haulURL = catagolueURLScheme + catagolueHostName + "/haul/" + rule + "/" + symmetry + "/" + hex_md5(seed);

    var color = symmetryColors[symmetry] || "black";

	// Sample soup overlay, based on (with modifications) Method 5 on
	// http://www.vikaskbh.com/five-css-techniques-make-overlay-div-centered/

	// create the elements we'll need.
	var overlayDiv         = document.createElement("div");
    var overlayInnerDiv    = document.createElement("div");
    var overlayShadingDiv  = document.createElement("div");
    var introParagraph     = document.createElement("p");
	var haulLink           = document.createElement("a");
	var soupSelectAll      = document.createElement("p");
	var soupSelectAllLink  = document.createElement("a");
	var sampleSoupTextarea = document.createElement("textarea");

	// style outer div.
    overlayDiv.id             = "sampleSoupOverlay";
    overlayDiv.style.position = "fixed";
    overlayDiv.style.top      = "0";
    overlayDiv.style.left     = "0";
    overlayDiv.style.width    = "100%";
    overlayDiv.style.zIndex   = "1";
    overlayDiv.style.height   = "100%";

	// style inner div.
	// NOTE: margin-left must be half of width for the div to be centered.
	// NOTE 2: border color matches the color of the sample soup dots for
	// this symmetry.
	// NOTE 3: #003040 is a shade of deep cerulean, taken from Catagolue's
	// background image.
    overlayInnerDiv.style.position        = "relative";
    overlayInnerDiv.style.left            = "50%";
    overlayInnerDiv.style.marginLeft      = "-375px";
    overlayInnerDiv.style.border          = "5px outset " + color;
    overlayInnerDiv.style.borderRadius    = "10px";
    overlayInnerDiv.style.backgroundColor = "white";
    overlayInnerDiv.style.color           = "black";
    overlayInnerDiv.style.width           = "750px";
    overlayInnerDiv.style.zIndex          = "3";
    overlayInnerDiv.style.top             = "20%";
    overlayInnerDiv.style.minimumHeight   = "50%";
    overlayInnerDiv.style.padding         = "1em";
    overlayInnerDiv.style.boxShadow       = "10px -10px 10px 0px #003040";

	// style the div that will shade the remainder of the page behind the
	// sample soup while the overlay is open.
    overlayShadingDiv.style.position        = "fixed";
    overlayShadingDiv.style.width           = "100%";
    overlayShadingDiv.style.height          = "100%";
    overlayShadingDiv.style.margin          = "auto";
    overlayShadingDiv.style.backgroundColor = "black";
    overlayShadingDiv.style.opacity         = "0.5";
    overlayShadingDiv.style.zIndex          = "2";
    overlayShadingDiv.style.top             = "0";
    overlayShadingDiv.style.left            = "0";

	// clicking outside the overlay will close it.
    overlayShadingDiv.onmousedown           = closeSoupOverlay;

	// link to the haul containing this soup
	haulLink.href        = haulURL;
	haulLink.textContent = "Haul";
 
	// a short introductory note informing the user which soup this is.
	// NOTE: U+2116 is the "Numero" symbol.
    introParagraph.style.marginTop = "0";
    introParagraph.appendChild(document.createTextNode(symmetry + " soup \u2116 " + soupNumber.toString() + " / " + totalSoups.toString() + " ("));
	introParagraph.appendChild(haulLink);
	introParagraph.appendChild(document.createTextNode(")"));

	// create "select all" link for the sample soup
	soupSelectAll.style.marginTop    = 0;
	soupSelectAll.style.marginBottom = "0.5em";
	soupSelectAll.style.fontFamily   = "monospace";

	soupSelectAllLink.href        = "#";
	soupSelectAllLink.textContent = "Select All";
	soupSelectAllLink.setAttribute("onclick", 'document.getElementById("sampleSoupTextArea").select(); return false');

	soupSelectAll.appendChild(soupSelectAllLink);

	// the textarea that will hold the soup.
    sampleSoupTextarea.id          = "sampleSoupTextArea";
    sampleSoupTextarea.style.width = "100%";
    sampleSoupTextarea.rows        = "34";
    sampleSoupTextarea.readOnly    = true;
    sampleSoupTextarea.textContent = "Loading " + soupURL + ", please wait...";

	// assemble elements.
    document.getElementById("sampleSoupTable").appendChild(overlayDiv);
    overlayDiv.appendChild(overlayInnerDiv);
    overlayDiv.appendChild(overlayShadingDiv);
    overlayInnerDiv.appendChild(introParagraph);
    overlayInnerDiv.appendChild(soupSelectAll);
    overlayInnerDiv.appendChild(sampleSoupTextarea);

	// asynchronous request to retrieve the soup.
    var sampleSoupRequest = new XMLHttpRequest();

	// once the soup is loaded, put it into the textarea.
    sampleSoupRequest.addEventListener("load", function() {
            var sampleSoupTextarea = document.getElementById("sampleSoupTextArea");
            if(sampleSoupTextarea)
                sampleSoupTextarea.textContent = sampleSoupRequest.responseText;
        });

	// fire off request.
    sampleSoupRequest.open("GET", soupURL);
    sampleSoupRequest.send();

	// success!
	return true;

}

// colors used for the various symmetries. Color values are probably
// autogenerated from the symmetries' names, but I don't know how, so here's
// a hardcoded list.
var symmetryColors = new Object();

// standard symmetries. 
symmetryColors["25pct"] = "#72da55";
symmetryColors["75pct"] = "#10963a";
symmetryColors["8x32" ] = "#6d0ecf";
symmetryColors["C1"   ] = "black";
symmetryColors["C2_1" ] = "#f83e05";
symmetryColors["C2_2" ] = "#31a6d8";
symmetryColors["C2_4" ] = "#aceb02";
symmetryColors["C4_1" ] = "#d085ff";
symmetryColors["C4_4" ] = "#cd14a0";
symmetryColors["D2_+1"] = "#39bab9";
symmetryColors["D2_+2"] = "#747d16";
symmetryColors["D2_x" ] = "#fb71fe";
symmetryColors["D4_+1"] = "#f6b2b6";
symmetryColors["D4_+2"] = "#f8e612";
symmetryColors["D4_+4"] = "#cfc20e";
symmetryColors["D4_x1"] = "#ae360f";
symmetryColors["D4_x4"] = "#3e5b59";
symmetryColors["D8_1" ] = "#ed65b6";
symmetryColors["D8_4" ] = "#a621fb";

// "weird" symmetries
symmetryColors["D4 +4"] = "#d32f3f";
symmetryColors["D8_+4"] = "#0bb2a2";

// register an event handler so the soup overlay can be closed by pressing escape.
document.onkeydown = closeSoupOverlay;
`;

/*** INJECTED SCRIPT ENDS ***/

// inject a function to display sample soups in an overlay.
function injectScript(injectedScript) {

	// create a new script element
	var script = document.createElement("script");
	script.type = "text/javascript";

	// inject script text
	script.textContent = injectedScript;

	// append script to document
	document.getElementsByTagName("head")[0].appendChild(script);

}

// sort the sample soups on a Catagolue object page by symmetry.
function handleSampleSoups(params) {

	// regular expression to extract symmetries from sample soup links
	var symRegex   = /hashsoup\/(.*?)\/.*?\/(.*?)$/;

	// hash of arrays containing sample soup links, grouped by symmetry
	var soupLinks  = new Object();

	// total number of sample soups
	var totalSoups = 0;
  
	// paragraph holding the sample soups.
	var sampleSoupsParagraph = findSampleSoupsParagraph();

	// parse links on this page, and convert HTMLCollection to an array so it 
	// won't be "live" and change underneath us when we remove those links.
	var links = Array.prototype.slice.call(sampleSoupsParagraph.getElementsByTagName("a"));

	// we want to have soup links pop up an overlay with a textarea. In order 
	// to do this, we set an onclick handler on the links below that calls a
	// function doing this. This function must live in the document, however,
	// so we inject it now.
	injectScript(sampleSoupOverlayScript);

	// furthermore, we need to inject Paul Johnston's MD5 script, since
	// Javascript lacks any built-in support for computing MD5 hashes.
	injectScript(MD5Script);

	for(var i = 0; i < links.length; i++) {
	  
		var link	   = links[i];
		var linkTarget = link.getAttribute("href");
	  
		var matches	= symRegex.exec(linkTarget);
		if(matches) {

			// there's no autovivification, sigh.
			if(!soupLinks[matches[1]]) {
			  soupLinks[matches[1]] = [];
			}

			totalSoups++;
			soupLinks[matches[1]].push(link);
			link.remove();
		  
		}
	}

	// now that all the links are collected and removed, add a table.
	var table = document.createElement("table");
	table.id                    = "sampleSoupTable";
	table.style.backgroundColor = "#a0ddcc";
	table.style.border          = "2px solid";
	table.style.borderRadius    = "10px";
	table.style.width           = "100%";

	// add table headers.
	var headerRow = document.createElement("tr");
	table.appendChild(headerRow);
  
	var header1 = document.createElement("th");
	header1.textContent = "Symmetry";
	headerRow.appendChild(header1);
  
	var header2 = document.createElement("th");
	header2.innerHTML = "#&nbsp;Soups";
	headerRow.appendChild(header2);
  
	var header3 = document.createElement("th");
	header3.textContent = "Sample soup links";
	headerRow.appendChild(header3);

	// insert table into page, replacing the old sample soup paragraph.
	sampleSoupsParagraph.parentNode.replaceChild(table, sampleSoupsParagraph);

	// iterate through symmetries and add new links.
	var symmetries = Object.keys(soupLinks).sort();
	for(var i = 0; i < symmetries.length; i++) {

		var symmetry = symmetries[i];
		var numSoups = soupLinks[symmetry].length;

		// add a hr between table rows, for the sake of looks.
		appendHR(table);

		// create a new row holding the soup links for this symmetry.
		var tableRow = document.createElement("tr");
		table.appendChild(tableRow);

		// create a table cell indicating the symmetry.
		var tableCell1 = document.createElement("td");
		tableRow.appendChild(tableCell1);

		// create a link to the main census page for this rulesym.
		var censusLink = document.createElement("a");
		censusLink.href        = "/census/" + params["rule"] + "/" + symmetry;
		censusLink.textContent = symmetry;
		tableCell1.appendChild(censusLink);

		// create a table cell indicating the number of sample soup.
		var tableCell2 = document.createElement("td");
		tableCell2.textContent = numSoups;
		tableRow.appendChild(tableCell2);

		// create a table cell holding the sample soup links.
		var tableCell3 = document.createElement("td");
		for(var j = 0; j < numSoups; j++) {

			var link = soupLinks[symmetry][j];

			// modify link so that when the user's browsing with Javascript
			// enabled, clicking it pops up an overlay with the sample soup
			// in a textarea.
			// NOTE: returning false here keeps the link's href from being
			// loaded after the function has run. Note further that returning
			// false FROM the function does not work.
			link.setAttribute("onclick", 'return !overlaySoup("' + link.href + '", ' + (j + 1).toString() + ', ' + numSoups.toString() + ')');

			// put link in this table cell.
			tableCell3.appendChild(link);
			tableCell3.appendChild(document.createTextNode(" "));

		}
		tableRow.appendChild(tableCell3);
	  
	}

	// add another hr before the "totals" row.
	appendHR(table);
 
	// now add a row indicating the total number of sample soups.
	var totalsRow = document.createElement("tr");
	table.appendChild(totalsRow);
  
	var totals1 = document.createElement("th");
	totals1.textContent = "Total";
	totalsRow.appendChild(totals1);
  
	var totals2 = document.createElement("th");
	totals2.innerHTML = totalSoups;
	totalsRow.appendChild(totals2);
  
}

// add a textarea with the object in RLE format.
function objectToRLE(params) {

	var prefix = params["prefix"];
	var object = params["object"];
	var rule   = params["rule"  ];

	// regex to test prefix
	var prefixRegex = /^x[pqs]/;

	// only run for known objects.
	if(object == null)
		return;

	// only run for spaceships (xq), oscillators (xp) and still lifes (xs).
	if(!prefixRegex.test(prefix))
		return;

	// convert object to pattern, and pattern to RLE.
	var pattern = apgcodeToPattern(object, rule);
	var RLE     = patternToRLE    (pattern);

	// find the "Comments" H2
	var commentsH2 = findCommentsH2();

	// create a new heading for the RLE code.
	var RLEHeading = document.createElement("h3");
	RLEHeading.textContent = "RLE";

	// create "select all" link for RLE code.
	var RLESelectAll     = document.createElement("p");
	var RLESelectAllLink = document.createElement("a");

	RLESelectAll.style.marginTop    = 0;
	RLESelectAll.style.marginBottom = "0.5em";
	RLESelectAll.style.fontFamily   = "monospace";

	RLESelectAllLink.href        = "#";
	RLESelectAllLink.textContent = "Select All";
	RLESelectAllLink.setAttribute("onclick", 'document.getElementById("RLETextArea").select(); return false');

	RLESelectAll.appendChild(RLESelectAllLink);

	// create a textarea for the RLE code.
	var RLETextArea = document.createElement("textarea");
	RLETextArea.id          = "RLETextArea";
	RLETextArea.style.width = "100%";
	RLETextArea.rows        = "10";
	RLETextArea.readOnly    = true;
	RLETextArea.textContent = RLE;

	// insert the new nodes.
	commentsH2.parentNode.insertBefore(RLEHeading,   commentsH2);
	commentsH2.parentNode.insertBefore(RLESelectAll, commentsH2);
	commentsH2.parentNode.insertBefore(RLETextArea,  commentsH2);

}

// add navigation
function addNavLinks(params) {

	var rule     = params["rule"];
	var prefix   = params["prefix"];
	var symmetry = params["symmetry"];

	// if symmetry is not set, default to C1.
	if(!symmetry)
		symmetry = "C1";

	// heading containing the object's code
	var titleHeading = findTitleHeading();

	// main content div
	var contentDiv = titleHeading.parentNode;

	// new paragraph for navigation links
	var navigationParagraph = document.createElement("p");

	// insert navigation paragraph before title heading
	contentDiv.insertBefore(navigationParagraph, titleHeading);

	// add breadcrumb links to navigation paragraph
	navigationParagraph.appendChild(document.createTextNode("You are here: "));
	navigationParagraph.appendChild(makeLink("/census/", "Census"));
	navigationParagraph.appendChild(document.createTextNode(breadcrumbSeparator));
	navigationParagraph.appendChild(makeLink("/census/" + rule, rule));
	navigationParagraph.appendChild(document.createTextNode(breadcrumbSeparator));
	navigationParagraph.appendChild(makeLink("/census/" + rule + "/" + symmetry, symmetry));
	navigationParagraph.appendChild(document.createTextNode(breadcrumbSeparator));
	navigationParagraph.appendChild(makeLink("/census/" + rule + "/" + symmetry + "/" + prefix, prefix));

}

// ### MAIN ###
MAIN();
