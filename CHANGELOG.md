Changelog
=========

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
