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

// upper-case the first character of a string.
function ucFirst(str) {
	// guard against empty strings; str[0] will throw an error for those.
	if (!str) return str;

	return str[0].toUpperCase() + str.slice(1);
}

// reverse a string.
function reverse(str) {
	return str.split('').reverse().join('');
}

// Event handler to close sample soup overlay. Based on (with modifications)
// Tim Down's code at https://stackoverflow.com/posts/3369743/revisions .
function closeSoupOverlay(evt) {

	evt          = evt || window.event;
	var isEscape = false;
	var isClick  = false;

	if("key" in evt)
	    isEscape = (evt.key == "Escape" || evt.key == "Esc");
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

// convert a 16x16 (typically C1) sample soup to a 16x16 array. The soup
// should be passed as an array of RLE lines, including precisely one header
// line.
function sampleSoupToArray(lines) {
	var sampleSoupArray = new Array(16);

	for(var lineNumber = 1; lineNumber < lines.length; lineNumber++)
		sampleSoupArray[lineNumber - 1] = lines[lineNumber]
			.replace(/[$!]/, "")
				.split("")
				.map(
					function(character) {
						if(character == "b")
							return 0;
						else if(character == "o")
							return 1;
					});

	return sampleSoupArray;

}

function overlaySoup(soupURL, soupNumber, totalSoups, apgcode, name) {

	// regex to extract soup seed etc. from soupURL
	// FIXME: using \d instead of [0-9] does not work. Why?
	var soupURLRegex = new RegExp("^(https?://)" + catagolueHostName + "/hashsoup/(.*?)/(([A-Za-z]_)?[A-Za-z0-9]{12})(.*?)/(.*)$");

	// match regex against soup URL. This also verifies that we're not getting
	// passed just any URL to load remotely.
	var matches = soupURLRegex.exec(soupURL);

	if(!matches) {
		// URL could not be parsed
		console.log("Could not parse soup URL: " + soupURL);
		return false;
	}

	// collect soup parameters.
	//
	// NOTE: seedPrefix indicates if the haul was submitted using apgsearch 
	// 0.x/1.x (empty string), apgnano 2.x ("n_"), apgmera 3.x  ("m_"), 
	// apgluxe 4.x ("l_") or HoneySearch 1.0 ("h_"), but we have no use for 
	// this at the moment.
	//
	// NOTE 2: soupNumberInHaul is not guaranteed to be a number, and in fact
	// will generally not be for hauls generated by hs 1.0.
	//
	// NOTE 3: "symmetry" here may actually include a topology, e.g. 
	// "T256x256~D2_+1". See:
	//
	// http://conwaylife.com/forums/viewtopic.php?p=50407#p50407 and
	// http://conwaylife.com/wiki/Catagolue_naming_conventions .
	var URLScheme        = matches[1]
	var symmetry         = matches[2];
	var seed             = matches[3];
	var seedPrefix       = matches[4];
	var soupNumberInHaul = matches[5];
	var rule             = matches[6];

	// URL for the haul containing this soup.
	var haulURL = URLScheme + catagolueHostName + "/haul/" + rule + "/" + symmetry + "/" + hex_md5(seed);

	// color to use for the sample soup overlay's border. this matches the 
	// colors of the sample soup "dots" that Catagolue uses for the same 
	// symmetry.
	var color = 
		(symmetry == "C1")
		? "black"
		: "#" + hex_sha256(symmetry).substr(0, 6);

	// Sample soup overlay, based on (with modifications) Method 5 on
	// http://www.vikaskbh.com/five-css-techniques-make-overlay-div-centered/

	// create the elements we'll need.
	var overlayDiv         = document.createElement("div"     );
	var overlayInnerDiv    = document.createElement("div"     );
	var overlayShadingDiv  = document.createElement("div"     );
	var closeButtonImg     = document.createElement("img"     );
	var introParagraph     = document.createElement("p"       );
	var haulLink           = document.createElement("a"       );
	var soupSelectAll      = document.createElement("p"       );
	var soupSelectAllLink  = document.createElement("a"       );
	var sampleSoupTextarea = document.createElement("textarea");
	var sampleSoupLink     = document.createElement("a"       );

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

	// link to the soup itself, in case the user wants to copy the link or
	// see the usual "bare" soup
	sampleSoupLink.href        = soupURL;
	sampleSoupLink.textContent = "Soup";

	// a short introductory note informing the user which soup this is.
	// NOTE: U+2116 is the "Numero" symbol.
	introParagraph.style.marginTop = "0";
	if(soupNumber)
		introParagraph.appendChild(document.createTextNode(symmetry + " soup \u2116 " + soupNumber.toString() + " / " + totalSoups.toString() + " ("));
	else
		introParagraph.appendChild(document.createTextNode(symmetry + " soup \u2116 ? / ? ("));

	introParagraph.appendChild(sampleSoupLink);
	introParagraph.appendChild(document.createTextNode(", "));
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
//	document.getElementById("sampleSoupTable").appendChild(overlayDiv);
	document.getElementById("content").appendChild(overlayDiv);
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

			// if we can't find the sample soup text area, we might as well
			// not do any more work.
			if(!sampleSoupTextarea)
				return;

			var sampleSoup         = sampleSoupRequest.responseText;

			// Catagolue does not generate correct sample soup RLE for 
			// inofficial symmetries. Such soups are returned as if the 
			// symmetry is C1, so we attempt to detect these cases and, if we 
			// know how to, fix up these soups.
			//
			// NOTE: for some symmetries, correct sample soups may be produced
			// by the server in the future; to avoid accidentally applying a
			// fix-up that's no longer necessary, we restrict our post-
			// processing to soups that should never be size 16x16.
			//
			// FIXME: this doesn't currently handle inofficial symmetries that
			// also use non-standard topologies, e.g.
			// "T256x256~AB_sha512_16x32_Test". No such symmetries actually
			// exist on Catagolue at the moment (2017-09-02), however.

			if((symmetry != "C1") && (sampleSoup.substr(0, 16) == "x = 16, y = 16, "))

				var soupBxFactor   = 1;
				var soupByFactor   = 1;
				var soupBxExtra    = 0;
				var soupByExtra    = 0;

				switch(symmetry) {

					// handle Apple Bottom's 1x256, 2x128 and 4x64 test 
					// symmetries, as well as wwei23's 1x256X2 and 1x256X2+1
					// symmetries. These are all handled by the same core code
					// (below); we start by setting a few parameters.
					// 
					// NOTE: some earlier 1x256X2 soups do not produce they
					// objects they should, e.g. the first two sample soups for
					// bi-pentadecathlon 1:
					//
					// https://catagolue.appspot.com/object/xp15_4r4y14r4z4r4y14r4/b3s23/1x256X2
					// https://catagolue.appspot.com/hashsoup/1x256X2/QJRUqQzyjNUz12656/b3s23
					// https://catagolue.appspot.com/hashsoup/1x256X2/QJRUqQzyjNUz34587/b3s23
					//
					// This is most likely due to sample soups being generated
					// differently in an earlier version of wwei23's modified
					// version of apgsearch 1.1, but we cannot do anything
					// about this.
					//
					// FIXME: wwei23 also used the following symmetries,
					// without explaining how these soups were generated:
					//
					// https://catagolue.appspot.com/census/b3s23/1X2x256X2
					// https://catagolue.appspot.com/census/b3s23/1X2x256X2_TEST
					// https://catagolue.appspot.com/census/b3s23/25p
					// https://catagolue.appspot.com/census/b3s23/75pTEST
					// https://catagolue.appspot.com/census/b3s23/WW_25c

					case "AB_1x256_Test":
						var linesToCombine = 16;

						// fall through to next case
					case "AB_2x128_Test":
						// don't you wish Javascript had Perl's ||= and //= 
						// operators?
						if(!linesToCombine)
							linesToCombine = 8;

						// fall through to next case
					case "AB_4x64_Test":
						if(!linesToCombine)
							linesToCombine = 4;

						// fall through to next case
					case "1x256X2":
						if(!linesToCombine) {
							linesToCombine = 16;
							soupBxFactor   = 2;
							soupBxExtra    = 0;
						}

						// fall through to next case
					case "1x256X2+1":
						if(!linesToCombine) {
							linesToCombine = 16;
							soupBxFactor   = 2;
							soupBxExtra    = -1;
						}

						// NOTE: the actual common code for generating soups
						// for all these symmetries starts HERE.

						// split soup into lines
						var lines = sampleSoup.split("\n");

						// build a new soup, starting with the RLE header
						sampleSoup = lines[0].replace("x = 16", "x = " + (16 * linesToCombine * soupBxFactor + soupBxExtra)).replace("y = 16", "y = " + (16 * soupByFactor / linesToCombine)) + "\n";
					
						// append RLE lines, removing the trailing $ (pattern 
						// linebreak) where necessary.
						for(var lineNumber = 1; lineNumber < lines.length - linesToCombine + 1; lineNumber += linesToCombine) {

							// assemble a new line for this soup.
							var newSoupLine = "";
							for(var lineNumber2 = 0; lineNumber2 < linesToCombine; lineNumber2++)
								newSoupLine += lines[lineNumber + lineNumber2].replace(/[!$]/, "");

							// wwei23's 1x256X2 and 1x256X2+1 symmetries are
							// generated by mirroring a regular 1x256 soup. In
							// the former case, they are joined directly; in
							// the latter case, they overlap by one cell.
							if(symmetry == "1x256X2+1")
								newSoupLine = reverse(newSoupLine) + newSoupLine.substring(1);
							else if(symmetry == "1x256X2")
								newSoupLine = reverse(newSoupLine) + newSoupLine;

							// append the final new line to the soup.
							sampleSoup += newSoupLine;

							// append a pattern end-of-line marker ($), or an
							// end-of-pattern marker (!) if we're done.
							if(lineNumber < lines.length + 1)
								sampleSoup += "$\n";
							else
								sampleSoup += "!\n";
						}

						break;

					// handle Apple Bottom's 256x256 test symmetry. This is
					// the Kronecker product of the C1 soup with itself.
					//
					// FIXME: wwei23's "25p" symmetry uses similar soups, but 
					// the below code doesn't work for them. There is, 
					// unfortunately, not a whole lot of information on how 
					// these soups ARE generated, other than the following
					// statement:
					// 
					// "Basically, take a 16x16 soup, and replace each cell 
					// with a 16x16 block of cells. Then replace each 16x16 
					// block of cells with the original soup. It was the only
					// way I could get 25p to work."
					// http://www.conwaylife.com/forums/viewtopic.php?p=47858#p47858
					//
					// NOTE: as of 2017-08-28, there are TWO rules that have
					// used a "25p" symmetry, B3/S23 and B378/S2678. Both were
					// investigated by wwei23 (2017-07-07 and 2017-06-16
					// respectively), and it is __probably__ reasonable to 
					// assume that the same sample soup generation method was
					// used for both. However, see the caveat concerning
					// object-per-soup ratios at
					// http://www.conwaylife.com/forums/viewtopic.php?p=46137#p46137
					// .

					case "AB_256x256_Test":
						// split soup into lines
						var lines = sampleSoup.split("\n");

						// build a new soup, starting with the RLE header
						sampleSoup = lines[0].replace("x = 16", "x = 256").replace("y = 16", "y = 256") + "\n";

						// convert sample soup into a 16x16 bit array.
						var sampleSoupArray = sampleSoupToArray(lines);

						// we can now compute the actual Kronecker product.
						for(var x = 0; x < 256; x++) {
							for(var y = 0; y < 256; y++)
								if(sampleSoupArray[Math.trunc(x / 16)][Math.trunc(y / 16)] * sampleSoupArray[x % 16][y % 16]) 
									sampleSoup += "o";
								else
									sampleSoup += "b";

							if(x < 255)
								sampleSoup += "$\n";

						}

						sampleSoup += "!\n";

						break;

					// handle Apple Bottom's SHA-512-based test symmetries.
					// As before, these are handled by the same core code, and
					// we start by setting some parameters.
					//
					// NOTE: Unlike in the previous cases, we cannot simply 
					// transform the soup we got from the server; we have to
					// compute it anew from the seed and soup number.

					case "AB_sha512_16x32_Test":
						var numHashChars = 64;
						var soupBx       = 16;
						var soupBy       = 32;
						var bitsAtATime  = 1;

						// fall through to next case
					case "AB_sha512_20x20_Test":

						// for 20x20 soups, we only need 400 bits,
						// corresponding to 50 characters (bytes).
						if(!numHashChars) {
							numHashChars = 50;
							soupBx       = 20;
							soupBy       = 20;
							bitsAtATime  = 1;
						}

						// fall through to next case
					case "AB_sha512_25p_Test":
					case "AB_sha512_75p_Test":

						if(!numHashChars) {
							numHashChars = 64;
							soupBx       = 16;
							soupBy       = 16;
							bitsAtATime  = 2;
						}

						// NOTE: the actual common code for generating soups
						// for these symmetries starts HERE.

						// generate a new digest to convert to a soup.
						var hashDigest = rstr_sha512(seed + soupNumberInHaul);

						// split existing soup into lines. We mostly just do
						// this so we don't have to recreate the rulestring
						// for our new sample soup.
						var lines = sampleSoup.split("\n");

						// build a new soup, starting with the RLE header
						sampleSoup = lines[0].replace("x = 16", "x = " + soupBx).replace("y = 16", "y = " + soupBy) + "\n";

						var currentRLELineLength = 0;

						// draw as many characters as we need from the digest.
						for(var currentHashCharNum = 0; currentHashCharNum < numHashChars; currentHashCharNum += bitsAtATime) {

							// assemble the current hash character... which 
							// may in fact be more than one (8-bit) character.
							//
							// And if anyone can think of a better name than
							// "currentHashCharNumInChunk", please, let me
							// know.
							var currentHashChar = 0;
							for(var currentHashCharNumInChunk = 0; currentHashCharNumInChunk < bitsAtATime; currentHashCharNumInChunk++)
								currentHashChar = (currentHashChar << 8) + hashDigest[currentHashCharNum + currentHashCharNumInChunk].charCodeAt(0);

							// "currentBit" is really a bit (har har) of a 
							// misnomer for the 25p and 75p test symmetries
							// where we're considering two bits at a time for
							// each cell.
							for(var currentBit = 0; currentBit < 8 * bitsAtATime; currentBit += bitsAtATime) {

								var liveCell = 0;

								// For the two-bit-at-a-time symmetries, we 
								// have to jump through some extra hoops to
								// test whether a cell should be live; for the
								// one-bit-at-a-time symmetries, it's easier.
								//
								// NOTE: bytes are in MSBF bit order, but we 
								// want LSBF.
								// 
								// NOTE 2: note to self, don't forget the
								// braces when you're nesting if statements,
								// or your else branches will apply to the
								// wrong if statement. *headdesk*
								if(symmetry == "AB_sha512_25p_Test") {
									if((currentHashChar & (1 << (14 - currentBit))) && (currentHashChar & (1 << (15 - currentBit))))
										liveCell = 1;

								} else if(symmetry == "AB_sha512_75p_Test") {
									if((currentHashChar & (1 << (14 - currentBit))) || (currentHashChar & (1 << (15 - currentBit)))) {
										liveCell = 1;
									}

								} else if(currentHashChar & (1 << (7 - currentBit)))
									liveCell = 1;

								sampleSoup += (liveCell ? "o" : "b");

								// start a new line if necessary -- but only 
								// if we're not already at the end of the soup
								// anyway.
								if((++currentRLELineLength == soupBx) && (currentHashCharNum < (numHashChars - bitsAtATime))) {
									sampleSoup += "$\n";
									currentRLELineLength = 0;
								}

							}
						}

						sampleSoup += "!\n";

						break;

					// handle Apple Bottom's "inflation" test symmetries.
					// As before, these are handled by the same core code, and
					// we start by setting some parameters. 
					// "MB_C1_2x2_32x32_Test" is the same, used by muzikbike.

					case "AB_C1_2x2_32x32_Test":
					case "MB_C1_2x2_32x32_Test":
						var expansionX = 2;
						var expansionY = 2;

						// split soup into lines. For some reason, split also
						// returns trailing empty lines that really aren't in
						// the actual sample soup, so we simply filter any
						// empty lines.
						var lines = sampleSoup.split("\n").filter(function(str) { return str.length });

						// build a new soup, starting with the RLE header
						sampleSoup = lines[0].replace("x = 16", "x = " + (16 * expansionX)).replace("y = 16", "y = " + (16 * expansionY)) + "\n";

						for(var lineNumber = 1; lineNumber < lines.length; lineNumber++) {

							// we build each new line by:
							//    1) removing any end-of-line/pattern markers
							//    2) splitting the line into characters
							//    3) repeating each character expansionX times
							//    4) gluing the result back together.
							var newLine = lines[lineNumber]
											.replace(/[!$]/, "")
											.split('')
											.map(function(s) { return s.repeat(expansionX) })
											.join('');

							// each new line must be appende dot the soup
							// expansionY times.
							for(var i = 0; i < expansionY; i++) {
								sampleSoup += newLine;

								// append end-of-line or end-of-pattern marker
								if(lineNumber < (lines.length - 1) || (i < expansionY - 1))
									sampleSoup += "$\n";
								else
									sampleSoup += "!\n";

							}

						}

						break;

					// handle Apple Bottom's diagonal skew-gutter test
					// symmetry. This is essentially regular diagonal symmetry
					// (D2_x), but with an empty diagonal lane of cells (the
					// "gutter"), and with the second, mirrored half of the
					// soup offset by one cell orthogonally ("skewed").
					case "AB_D2_x_skewgutter_Test":

						// split existing soup into lines. We mostly just do
						// this so we don't have to recreate the rulestring
						// for our new sample soup.
						var lines = sampleSoup.split("\n");

						// build a new soup, starting with the RLE header
						sampleSoup = lines[0].replace("y = 16", "y = 17") + "\n";
						
						// convert sample soup into a 16x16 bit array.
						var sampleSoupArray = sampleSoupToArray(lines);

						// build new sample soup, line by line.
						for(var y = 0; y < 17; y++) {

							// we iterate through each line bit by bit.
							for(var x = 0; x < 16; x++)

								// NOTE: sampleSoupArray is an array of lines,
								// and each line is an array of columns. As
								// such, y comes before x here.
								if((x > y) && sampleSoupArray[y][x])
									// upper half.
									sampleSoup += "o";
								else if(((y - x) > 1) && sampleSoupArray[x][y - 1])
									// lower, skew-mirrored half.
									sampleSoup += "o";
								else
									sampleSoup += "b";
						
							// start a new RLE line if we're not already at the
							// end of the entire soup.
							if(y < 16)
								sampleSoup += "$\n";

						}

						// append end-of-RLE marker.
						sampleSoup += "!\n";

						break;

					// handle MB's test symmetries: MB_bad8x8_test, 
					// MB_dense1x8_test and MB_dense2x8_test.
					// 
					// We're actually just recreating the sample soup from 
					// scratch here, it's easier that way.
					//
					// See:
					// http://conwaylife.com/forums/viewtopic.php?p=51601#p51601
					// http://conwaylife.com/forums/viewtopic.php?p=51608#p51608
					//
					// FIXME: there is some overlap with the code that handles
					// AB's SHA-512-based symmetries, above. Merge these?

					case "MB_bad8x8_test":

						var xLineDivisor    = 1;
						var xLineMultiplier = 8;
						var yLineDivisor    = 4;
						var soupBx          = 8;
						var soupBy          = 8;

						// fall through to next case
					case "MB_dense1x8_test":

						if(!xLineDivisor) {
							xLineDivisor    = 1;
							xLineMultiplier = 2;
							yLineDivisor    = 32;
							soupBx          = 8;
							soupBy          = 1;
						}

						// fall through to next case
					case "MB_dense2x8_test":

						if(!xLineDivisor) {
							xLineDivisor    = 1;
							xLineMultiplier = 2;
							yLineDivisor    = 16;
							soupBx          = 8;
							soupBy          = 2;
						}

						// generate a new digest to convert to a soup.
						var hashDigest = rstr_sha256(seed + soupNumberInHaul);

						// create an empty sample soup to work with. 
						var sampleSoupLines = new Array(soupBy);
						for(var y = 0; y < soupBy; y++) {
							sampleSoupLines[y] = "b".repeat(soupBx);
						}

						// FIXME: we're generating RLE lines on the fly here,
						// rather than creating an array first and then
						// converting that to RLE in a second step. Doing
						// that might be faster (fewer string operations),
						// so consider doing that.

						// currentHashCharNum corresponds to j in apgsearch 
						// 1.1's hashsoup() function.
						for(var currentHashCharNum = 0; currentHashCharNum < 32; currentHashCharNum++) {

							// currentHashChar corresponds to t in the same function.
							var currentHashChar = hashDigest[currentHashCharNum].charCodeAt(0);

							// currentBit corresponds to k in the same function.
							for(var currentBit = 0; currentBit < 8; currentBit++) {

								// bytes are in MSBF bit order, but we want
								// LSBF.
								if(currentHashChar & (1 << (7 - currentBit))) {

									var x = currentBit + xLineMultiplier * (currentHashCharNum % xLineDivisor);
					                var y = Math.floor(currentHashCharNum / yLineDivisor);

									// patch in a live cell ("o") where appropriate.
									sampleSoupLines[y] =
										sampleSoupLines[y].substr(0, x) +
										"o" +
										sampleSoupLines[y].substr(x + 1);

								}

							}

						}

						// we've got our RLE lines, so we just need to append
						// the header. To do this, we just reuse the existing
						// sample soup header.

						// split soup into lines
						var lines = sampleSoup.split("\n");

						// build a new soup, starting with the RLE header
						sampleSoup = lines[0].replace("x = 16", "x = " + soupBx).replace("y = 16", "y = " + soupBy) + "\n";

						// append our collected lines.
						for(var y = 0; y < soupBy; y++) {
							sampleSoup += sampleSoupLines[y];

							// append end-of-line marker, except for on the
							// last line
							if(y < (soupBy - 1))
								sampleSoup += "$\n";

						}

						// append end-of-pattern marker
						sampleSoup += "!\n";

						break;
					
					// handle wwei23's 32x32 symmetry. This is just four
					// copies of the same C1 soup glued together. See:
					// http://www.conwaylife.com/forums/viewtopic.php?p=45555#p45555
					case "32x32":

						// split soup into lines
						var lines = sampleSoup.split("\n");

						// build a new soup, starting with the RLE header
						sampleSoup = lines[0].replace("x = 16", "x = 32").replace("y = 16", "y = 32") + "\n";

						for(var verticalCopy = 0; verticalCopy <= 1; verticalCopy++)
							for(var lineNumber = 1; lineNumber <= 16; lineNumber++) {
								var currentLine = lines[lineNumber].replace(/[$!]/, "");
								sampleSoup += currentLine + currentLine;
						
								if(lineNumber * verticalCopy != 16)
									sampleSoup += "$\n";

							}

						sampleSoup += "!\n";

						break;

				}

			// prepend information to sample soup
			sampleSoup = "#C " + URLScheme + catagolueHostName + "/object/" + apgcode + "/" + rule + "/" + symmetry + "\n"
						+ "#C " + soupURL + "\n"
						+ "#C " + haulURL + "\n"
						+ sampleSoup;

			// prepend soup number, if known
			if(soupNumber)
				sampleSoup = "#C " + symmetry + " sample soup " + soupNumber + " of " + totalSoups + "\n"
							+ sampleSoup;
			else
				sampleSoup = "#C " + symmetry + " sample soup ? of ?\n"
							+ sampleSoup;


			// prepend apgcode
			sampleSoup = "#C " + apgcode + "\n"
						+ sampleSoup;

			// also prepend name, if known
			if(name)
				sampleSoup = "#N " + ucFirst(name) + "\n"
							+ sampleSoup;

			// at this point we have a sample soup and a text area to put it
			// in, so we go ahead and do just that.
            sampleSoupTextarea.textContent = sampleSoup;
	    });

	// fire off request.
	sampleSoupRequest.open("GET", soupURL);
	sampleSoupRequest.send();

	// success!
	return true;

}

// register an event handler so the soup overlay can be closed by pressing escape.
document.onkeydown = closeSoupOverlay;

/*** INJECTED SCRIPT ENDS ***/
