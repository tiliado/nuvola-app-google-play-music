# Copyright 2014-2016 Jiří Janoušek <janousek.jiri@gmail.com>
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

# Service integration id
APP_ID = google_play_music
# Default installation destination
DEST ?= $(HOME)/.local/share/nuvolaplayer3/web_apps
# Files to be installed
INSTALL_FILES = metadata.json integrate.js
LICENSES = LICENSE
# Icon set
SOURCE_ICON ?= icons/icon.svg
SOURCE_ICON_XS ?= icons/icon-xs.svg
SOURCE_ICON_SM ?= icons/icon-sm.svg
ICON_SIZES ?= 16 22 24 32 48 64 128 256
ICONS_DIR ?= icons
PNG_ICONS = $(foreach size,$(ICON_SIZES),$(ICONS_DIR)/$(size).png)
SCALABLE_ICON = $(ICONS_DIR)/scalable.svg

help:
	@echo "make build               - build files (graphics, etc.)"
	@echo "make clean               - clean source directory"
	@echo "make install             - install to user's local directory (~/.local)"
	@echo "make install DEST=/path  - install to '/path' directory"
	@echo "make uninstall           - uninstall from user's local directory (~/.local)"

build: $(PNG_ICONS) $(SCALABLE_ICON)

# Create icons dir
$(ICONS_DIR):
	mkdir -p $@

# Optimize SVG icons
$(ICONS_DIR)/%.svg: src/%.svg | $(ICONS_DIR)
	./svg-optimize.sh $< $@

# Generate icon 16
$(ICONS_DIR)/16.png: $(SOURCE_ICON_XS) | $(ICONS_DIR)
	./svg-convert.sh $< 16 $@

# Generate icon 22	
$(ICONS_DIR)/22.png : $(SOURCE_ICON_XS) | $(ICONS_DIR)
	./svg-convert.sh $< 22 $@

# Generate icon 24	
$(ICONS_DIR)/24.png : $(SOURCE_ICON_XS) | $(ICONS_DIR)
	./svg-convert.sh $< 24 $@

# Generate icon 32	
$(ICONS_DIR)/32.png : $(SOURCE_ICON_SM) | $(ICONS_DIR)
	./svg-convert.sh $< 32 $@

# Generate icon 48
$(ICONS_DIR)/48.png : $(SOURCE_ICON_SM) | $(ICONS_DIR)
	./svg-convert.sh $< 48 $@

# Generate icons 64 128 256
$(ICONS_DIR)/%.png : $(SOURCE_ICON) | $(ICONS_DIR)
	./svg-convert.sh $< $* $@

# Copy scalable icon
$(SCALABLE_ICON) : $(SOURCE_ICON) | $(ICONS_DIR)
	cp $< $@

# Clean built files
clean:
	rm -rf icons

# Install files
install: $(LICENSES) $(INSTALL_FILES) $(PNG_ICONS) $(SCALABLE_ICON)
	# Install data
	install -vCd $(DEST)/$(APP_ID)/$(ICONS_DIR)
	install -vC -t $(DEST)/$(APP_ID) $(LICENSES) $(INSTALL_FILES)
	install -vC -t $(DEST)/$(APP_ID)/$(ICONS_DIR) $(PNG_ICONS) $(SCALABLE_ICON)
	
	# Create symlinks to icons
	mkdir -pv $(DEST)/../../icons/hicolor/scalable/apps || true
	ln -s -f -v -T ../../../../nuvolaplayer3/web_apps/$(APP_ID)/$(SCALABLE_ICON) \
		$(DEST)/../../icons/hicolor/scalable/apps/nuvolaplayer3_$(APP_ID).svg;
	for size in $(ICON_SIZES); do \
		mkdir -pv $(DEST)/../../icons/hicolor/$${size}x$${size}/apps || true ; \
		ln -s -f -v -T ../../../../nuvolaplayer3/web_apps/$(APP_ID)/$(ICONS_DIR)/$$size.png \
		$(DEST)/../../icons/hicolor/$${size}x$${size}/apps/nuvolaplayer3_$(APP_ID).png; \
	done
	

# Uninstall files
uninstall:
	rm -fv $(DEST)/../../icons/hicolor/scalable/apps/nuvolaplayer3_$(APP_ID).svg
	for size in $(ICON_SIZES); do \
		rm -fv $(DEST)/../../icons/hicolor/$${size}x$${size}/apps/nuvolaplayer3_$(APP_ID).png; \
	done
	rm -rfv $(DEST)/$(APP_ID)
