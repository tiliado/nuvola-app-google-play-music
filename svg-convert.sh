#!/bin/sh
#
# Copyright 2016 Patrick Burroughs (Celti) <celti@celti.name>
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are met:
#
# 1. Redistributions of source code must retain the above copyright notice, this
#    list of conditions and the following disclaimer.
# 2. Redistributions in binary form must reproduce the above copyright notice,
#    this list of conditions and the following disclaimer in the documentation
#    and/or other materials provided with the distribution.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
# ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
# WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
# DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
# ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
# (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
# LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
# ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
# (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
# SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

source_file="$1"
dest_size="$2"
dest_file="$3"

exists () {
	type "$1" >/dev/null 2>/dev/null
}

divide () {
	echo - | awk "{ print $1 / $2 }"
}

if exists lasem-render; then       # GNOME/Lasem
	CONVERT=lasem-render
elif exists lasem-render-0.4; then # GNOME/Lasem (current version May 2016)
	CONVERT=lasem-render-0.4
elif exists rsvg-convert; then     # librsvg (broken on Arch Linux as of May 2016)
	CONVERT=rsvg-convert
elif exists gm; then               # GraphicsMagick
	CONVERT=gm
elif exists convert; then          # ImageMagick
	CONVERT=convert
else
	echo "No supported SVG converter found! (Tried: Lasem, librsvg, GraphicsMagick, ImageMagick)" >&2
	exit 1
fi

case $CONVERT in
	lasem-render*)
		source_size=$($CONVERT --debug render "${source_file}" -o /dev/null | awk '/width/ { print $3 }')
		zoom_factor=$(divide ${dest_size} ${source_size})
		$CONVERT -z ${zoom_factor} "${source_file}" -o "${dest_file}"
		;;
	rsvg-convert)
		$CONVERT -w ${dest_size} -h ${dest_size} "${source_file}" -o "${dest_file}"
		;;
	gm)
		$CONVERT convert "${source_file}" -resize ${dest_size} "${dest_file}"
		;;
	convert)
		$CONVERT "${source_file}" -resize ${dest_size} "${dest_file}"
		;;
esac
