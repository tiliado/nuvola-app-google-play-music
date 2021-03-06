Google Play Music Changelog
===========================

6.4 - April 11th, 2021
----------------------

 * Script is deprecated as Google Play Music is shutting down. Issue: tiliado/nuvolaruntime#660

6.3 - September 28, 2020
------------------------

 * Mask as Safari to work around Google sign-in issues. Issue: tiliado/nuvolaruntime#575

6.2 - October 14th, 2018
------------------------

  * Nuvola 4.13 is required.
  * The shuffle status was integrated. Issue: tiliado/nuvolaruntime#20
  * The repeat status was integrated. Issue: tiliado/nuvolaruntime#21

6.1 - June 1st, 2018
--------------------

  * Media Source Extension and Chromium backend are used for audio playback instead of Flash plugin.

6.0 - September 28th, 2017
-----------------------

  * The check of WebKitGTK+ version was removed as Nuvola 3.0.9 depends on new enough version (2.16.3).
  * Async JavaScripr API is used to improve responsiveness and reduce lags, but Nuvola 4.8+ is required.

5.19 - June 18th, 2017
----------------------

  * Malfunctioning Google sign-in page has been fixed by setting the user agent string to WebKit.
    Issue: tiliado/nuvolaplayer#336
  * Don't check setting THUMB_NEVER_TOGGLES too often.
  * Metadata was updated according to the latest Nuvola SDK requirements.
  * Progress bar is fully integrated - it is possible to show track position and change it as well.
    Issue: tiliado/nuvolaruntime#155
  * Volume management is fully integrated - it is possible to show volume and change it as well.
    Issue: tiliado/nuvolaruntime#22

5.18 - February 12th, 2017
--------------------------

  * Improve wording for thumbs-up/down preferences for ease of understanding.
  * Ported to use Nuvola SDK.

5.17 - August 6th, 2016
-----------------------

  * Added option to ensure the thumb up/down flag is not toggled off once it has been toggled on.

5.16 - July 26th, 2016
----------------------

  * WebKitGTK 2.12.0 or higher is required for proper functionality and an upgrade request is shown with older versions.

5.15 - June 7th, 2016
---------------------

  * Added Contributing to Google Play Music script
  * Script now doesn't assume that it is always executed before a basic structure of a web page is loaded. This isn't
    guaranteed and it leads to an incompatibility with Nuvola Player 3.0.3. Issue: tiliado/nuvolaplayer#239

5.14 - May 22nd, 2016
---------------------

  * SVG images are optimized in build time.
  * Lasem, librsvg, GraphicsMagick and ImageMagick SVG converters are supported.
  * Broken symlink to the scalable icons has been fixed.

5.13 - May 8th, 2016
--------------------

  * Export thumbs up/down track rating over MPRIS interface. It is shown as one star (thumbs down) or five stars
    (thumbs up) in Media Player Indicator GNOME Shell extension, for example. Issue: tiliado/nuvolaplayer#204
  * Add license metadata field.
  * Add a track rating handler that allows user to set rating from Media Player Indicator GNOME Shell extension.
    Issue: tiliado/nuvolaplayer#204

5.12 - January 23rd, 2016
-------------------------

  * Use relative icon symlinks in a build script. They are broken in DEB/RPM packages otherwise.
    Issue: tiliado/nuvola-app-google-play-music#9

5.11 - December 26th, 2015
--------------------------

  * Remove webcomponents.js hack because it is no longer necessary.
  * Build whole icon set instead of a single badly scalable icon.
    Issue: tiliado/nuvolaplayer#126, tiliado/nuvolaplayer#78
