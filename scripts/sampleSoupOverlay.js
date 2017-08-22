/*** INJECTED SAMPLE SOUP OVERLAY SCRIPT ***/

// change this in case Catagolue moves.
var catagolueHostName  = "catagolue.appspot.com";

// close button (PNG image), encoded as base64 using David Wilkinson's data:
// URI generator: http://dopiaza.org/tools/datauri/index.php
// NOTE: it would be nicer to include this in the extension as a proper image
// file, but since this is an *injected* script it cannot use chrome.extension
// .getURL to access extension resources.
var closeButtonData = `
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAQAAABuvaSwAAACNU
lEQVQoU22RTUhUURiG35kxFKEwFMmaGb0z914HlFBLCiusIWhRTPYDRQSlgRVhRBREUmoEIV
RERMsoKYKI/iAiKFxIq3aBVqBRWLbIdHRK8+88LZwRR+c9i8M55/2e7+O8UppI7sabfs4gJF
Fh2s1LunhjLrNOkkxm85flpmuKEX7zngETZwremUrJpHc4KyleT+IDjVSzCj9FrKHBdME0Jx
fRe2Lw0ARwcOctm9vGwLH50/uerJ0xDyhOM7q4OAS4Y5gxVsrqCeXFX41TbpxFZhcHm254nW
T7sneU8auFIC5VNHOGCC4WW2jlOBYOp4yBvFnyskv7IYKDS5hrQDd+YkySoAoblyh/MI2S5F
Xh4+s/CCXb+mkDvjJGDzXJuzKG4JYkZan4WUcv4bkpAzwC/hHFIvUng3BfkpYofPXGSPLBwe
Ec0Mcoo0SxcXGpIo65Mkt2apugGhuXCp4C94iwB5jgMCFcYoxDTJJ8CloHh4c7TBCH9ZyniQ
guYWpp4TQWDu3AbCgeFSj6otOw3TjYWFjJFG1KsLCp5C9TzanIc1WmI4OJT5QbZ0HcDhEzAH
0/l6bi9qlQm1a3jYz2stcECCULwqykznQzM/itUnPyKFt+bS298H0IOtlNiBBBdvLWTDPZf6
JAHs2TRznya4MO3H3e3880JAAmxj5+vthQKK8WyKNs5atUG4t2VRzadvRma/2+uprNJcqRJw
07J69ylKciBVWsFcpXrrIy+tJKZlcG4H+31Z9mARxy9AAAAABJRU5ErkJggg==
`;

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
	var soupURLRegex = new RegExp("^(https?://)" + catagolueHostName + "/hashsoup/(.*?)/((m_|n_)?[A-Za-z0-9]{12})([0-9]*)/(.*)$");

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
	var URLScheme        = matches[1]
	var symmetry         = matches[2];
	var seed             = matches[3];
	// var seedPrefix       = matches[4];
	var soupNumberInHaul = matches[5];
	var rule             = matches[6];

	// URL for the haul containing this soup.
	var haulURL = URLScheme + catagolueHostName + "/haul/" + rule + "/" + symmetry + "/" + hex_md5(seed);

	var color = symmetryColors[symmetry] || "black";

	// Sample soup overlay, based on (with modifications) Method 5 on
	// http://www.vikaskbh.com/five-css-techniques-make-overlay-div-centered/

	// create the elements we'll need.
	var overlayDiv         = document.createElement("div");
	var overlayInnerDiv    = document.createElement("div");
	var overlayShadingDiv  = document.createElement("div");
	var closeButtonImg     = document.createElement("img");
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
	overlayInnerDiv.style.minHeight       = "50%";
	overlayInnerDiv.style.maxHeight       = "90%";
	overlayInnerDiv.style.padding         = "1em";
	overlayInnerDiv.style.boxShadow       = "10px -10px 10px 0px #003040";

	// style close button.
	// NOTE: right and top should be half of width and height.
	closeButtonImg.src            = closeButtonData; // chrome.extension.getURL("images/closeButton.png");
	closeButtonImg.onmousedown    = closeSoupOverlay;
	closeButtonImg.style.position = "absolute";
	closeButtonImg.style.right    = "-11px";
	closeButtonImg.style.top      = "-11px";
	closeButtonImg.style.cursor   = "pointer";
	closeButtonImg.style.display  = "block";
	closeButtonImg.style.width    = "22px";
	closeButtonImg.style.height   = "22px";

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
	sampleSoupTextarea.id              = "sampleSoupTextArea";
	sampleSoupTextarea.style.width     = "100%";
	sampleSoupTextarea.style.overflowY = "scroll";
	sampleSoupTextarea.rows            = "34";
	sampleSoupTextarea.style.maxHeight = (window.innerHeight * 0.65) + "px";
	sampleSoupTextarea.readOnly        = true;
	sampleSoupTextarea.textContent     = "Loading " + soupURL + ", please wait...";

	// assemble elements.
	document.getElementById("sampleSoupTable").appendChild(overlayDiv);
	overlayDiv.appendChild(overlayInnerDiv);
	overlayDiv.appendChild(overlayShadingDiv);
	overlayInnerDiv.appendChild(introParagraph);
	overlayInnerDiv.appendChild(soupSelectAll);
	overlayInnerDiv.appendChild(sampleSoupTextarea);
	overlayInnerDiv.appendChild(closeButtonImg);

	// make sample soup overlay draggable with the mouse; text area is
	// excluded (so the user can select the sample soup with the mouse).
	dragDrop.initElement("sampleSoupOverlay", "sampleSoupTextArea");

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

/*** INJECTED SCRIPT ENDS ***/
