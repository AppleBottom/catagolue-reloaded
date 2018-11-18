This extension provides various useful enhancements to make life easier for 
users of Adam P. Goucher's Catagolue website.

Right now, the following changes are implemented:

1. On object pages:
   a. Display sample soups in a pop-up for easy copying/pasting.
   b. Add links to the hauls containing the sample soups.
   c. Encode object in RLE format for easy copying/pasting.
   d. Encode object in SOF format for easy searching on Pentadecathlon.com.
   e. Add breadcrumbs navigation links.
   f. Add LifeWiki/Life forum/Google search links.
   g. Add links to SVG images.
   h. Allow collapsing/expanding comments.
   i. Always display apgcode, even for named objects.
   j. Identify (some) objects appearing in Jason Summers' jslife-20121230 
      collection.
   k. Generate correct soups for the following symmetries not supported by the
      server:
         * AB_1x256_Test
         * AB_2x128_Test
         * AB_4x64_Test
         * AB_256x256_Test
	 * AB_sha512_16x32_Test
	 * AB_sha512_20x20_Test
	 * AB_sha512_25p_Test
	 * AB_sha512_75p_Test
	 * AB_C1_2x2_32x32_Test
	 * AB_D2_x_skewgutter_Test
	 * 1x256X2
	 * 1x256X2+1
	 * 32x32 (wwei23)
	 * MB_C1_2x2_32x32_Test
	 * MB_bad8x8_test
	 * MB_dense1x8_test
	 * MB_dense2x8_test
   l. Add RLE comments to sample soups.
2. On object category pages:
   a. Word-wrap long apgcodes.
   b. Align numbers and add separators.
3. On the main census overview page:
   a. Keep overly long rulestrings from breaking page layout.
   b. Convert unordered lists to ordered.
4. On haul pages:
   a. Word-wrap long apgcodes.
   b. Display sample soups in a pop-up for easy copying/pasting.
   c. Word-wrap long roots.
   d. Align numbers and add separators.
5. On individual census pages:
   a. Add breadcrumbs navigation links.
   b. Indicate rule/symmetry/prefix/offset in page title/heading.
   c. Display average objects/soup and soups/haul in intro paragraph.
   d. Highlight "official" symmetries on rule overview pages.

Further enhancements may be added in future versions.

The following enhancements have been integrated into vanilla Catagolue and
are not part of the extension anymore:

1. On object pages:
   a. Organize sample soup links by soup symmetry.
   b. Word-wrap long apgcodes.
