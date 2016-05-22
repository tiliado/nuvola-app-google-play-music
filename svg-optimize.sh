#!/bin/sh
#
# Copyright 2016 Patrick Burroughs (Celti) <celti@celti.name>
# Copyright 2016 Jiří Janoušek <janousek.jiri@gmail.com>
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
dest_file="$2"

exists () {
	type "$1" >/dev/null 2>/dev/null
}

if exists scour; then # Scour: https://github.com/codedread/scour
	CONVERT=scour
# svgo doesn't work well :-(
elif test ! -z "$SVGO_ENABLED" && exists svgo; then # svgo: https://github.com/svg/svgo
	CONVERT=svgo
else
	echo "No supported SVG optimizer found! Tried: " >&2
	echo "- scour: https://github.com/codedread/scour" >&2
	test ! -z "$SVGO_ENABLED" && echo "- svgo: https://github.com/svg/svgo" >&2
	exit 1
fi

case $CONVERT in
	scour)
		$CONVERT -i "${source_file}" -o "${dest_file}" --enable-viewboxing --enable-id-stripping \
			--enable-comment-stripping --shorten-ids --indent=none  --remove-metadata
		;;
	svgo)
		$CONVERT -i "${source_file}" -o "${dest_file}"
		;;
esac
