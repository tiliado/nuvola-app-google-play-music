/*
 * Copyright 2011-2015 Jiří Janoušek <janousek.jiri@gmail.com>
 * Copyright 2014 Martin Pöhlmann <martin.deimos@gmx.de>
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met: 
 * 
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer. 
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution. 
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

(function(Nuvola)
{
// FUTURE: Remove after NP 3.2.0
Nuvola.VERSION = Nuvola.VERSION || (
    Nuvola.VERSION_MAJOR * 10000 + Nuvola.VERSION_MINOR * 100 + Nuvola.VERSION_BUGFIX);

// For request to upgrade libraries
var WEBKITGTK_UPGRADE_REQUEST = "app.webkitgtk_upgrade";
var WEBKITGTK_UPGRADE_HELP_URL = "https://github.com/tiliado/nuvolaplayer/wiki/WebKitGTK-Upgrade";
var KNOWN_ISSUES_URL = "https://github.com/tiliado/nuvola-app-google-play-music/wiki/Known-Issues";

var _ = Nuvola.Translate.gettext;
var C_ = Nuvola.Translate.pgettext;
var ngettext = Nuvola.Translate.ngettext;

var State = Nuvola.PlaybackState;
var PlayerAction = Nuvola.PlayerAction;
var player = Nuvola.$object(Nuvola.MediaPlayer);

var THUMB_NEVER_TOGGLES = "app.thumb_never_toggles";
var ACTION_THUMBS_UP = "thumbs-up";
var ACTION_THUMBS_DOWN = "thumbs-down";
var THUMBS_ACTIONS = [ACTION_THUMBS_UP, ACTION_THUMBS_DOWN];

if (!String.prototype.endsWith)
{
    String.prototype.endsWith = function(searchString, position)
    {
        var subjectString = this.toString();
        if (position === undefined || position > subjectString.length)
            position = subjectString.length;
        position -= searchString.length;
        var lastIndex = subjectString.indexOf(searchString, position);
        return lastIndex !== -1 && lastIndex === position;
    };
}

var WebApp = Nuvola.$WebApp();

WebApp._onInitAppRunner = function(emitter)
{
    Nuvola.WebApp._onInitAppRunner.call(this, emitter);
    Nuvola.config.setDefault(WEBKITGTK_UPGRADE_REQUEST, null);
    Nuvola.config.setDefault(THUMB_NEVER_TOGGLES, false);
    Nuvola.core.connect("PreferencesForm", this);
    Nuvola.actions.addAction("playback", "win", ACTION_THUMBS_UP, C_("Action", "Thumbs up"), null, null, null, true);
    Nuvola.actions.addAction("playback", "win", ACTION_THUMBS_DOWN,C_("Action", "Thumbs down"), null, null, null, true);
}

WebApp._onInitWebWorker = function(emitter)
{
    Nuvola.WebApp._onInitWebWorker.call(this, emitter);
    
    Nuvola.actions.connect("ActionActivated", this);
    this.thumbsUp = undefined;
    this.thumbsDown = undefined;
    this.state = State.UNKNOWN;
    player.addExtraActions(THUMBS_ACTIONS);
    var state = document.readyState;
    if (state === "interactive" || state === "complete")
        this._onPageReady();
    else
        document.addEventListener("DOMContentLoaded", this._onPageReady.bind(this));
}

WebApp._onPreferencesForm = function(emitter, values, entries)
{
    this.appendPreferences(values, entries);
}

WebApp.appendPreferences = function(values, entries)
{
    values[THUMB_NEVER_TOGGLES] = Nuvola.config.get(THUMB_NEVER_TOGGLES);
    entries.push(["header", "Google Play Music"])
    entries.push(["bool", THUMB_NEVER_TOGGLES, _("Ensure thumb up/down flag is not toggled off\nonce it has been toggled on")]);
}

/**
 * Signal handler for @link{Core::UriChanged}
 */
WebApp._onUriChanged = function(emitter, uri)
{
    /* 
     * Users that use the queue page a lot might end up with it as a start-up page. However, this page is always empty
     * and not useful at all, so load Listen now page instead. https://bugs.launchpad.net/nuvola-player/+bug/1306678
     */
    if (uri === "https://play.google.com/music/listen#/ap/queue")
        uri = this.meta.home_url;
    
    Nuvola.WebApp._onUriChanged.call(this, emitter, uri);
}

WebApp._onHomePageRequest = function(emitter, result)
{
    if (!this._showUpgradeRequest(result))
        Nuvola.WebApp._onHomePageRequest.call(this, emitter, result);
}

WebApp._onLastPageRequest = function(emitter, result)
{
    if (!this._showUpgradeRequest(result))
    {
        Nuvola.WebApp._onLastPageRequest.call(this, emitter, result);
        if (result.url && result.url.indexOf("file://") === 0)
            result.url = null;
    }
}

WebApp._onPageReady = function()
{
    if (location.protocol === "file:")
    {
        this._handleUpgradeRequest();
        return;
    }
    
    // Connect rating handler if supported
    if ((Nuvola.API_VERSION || 300) >= 301) // API 3.1
        player.connect("RatingSet", this);

    this.update();
}

WebApp.update = function()
{
    var elm;
    /* Fix for Google Play Music shows an incomplete queue. https://github.com/tiliado/nuvolaplayer/issues/106 */
    if (!this._queueOverlayFixed && (elm = document.getElementById("queue-overlay")) && elm.hasAttribute("layout"))
    {
        elm.removeAttribute("layout");
        this._queueOverlayFixed = true;
    }
    
    this.state = State.UNKNOWN;
    var prevSong, nextSong, canPlay, canPause;
    try
    {
        var pp = this._getPlayPauseButton();
        if (pp.disabled === true)
            this.state = State.UNKNOWN;
        else if (pp.className.indexOf("playing") !== -1)
            this.state = State.PLAYING;
        else
            this.state = State.PAUSED;
        
        if (this.state !== State.UNKNOWN)
        {
            prevSong = this._getGoPrevButton().disabled === false;
            nextSong = this._getGoNextButton().disabled === false;
        }
        else
        {
            prevSong = nextSong = false;
        }
    }
    catch (e)
    {
        this.state = State.UNKNOWN;
        this.scheduleUpdate();
        return;
    }
    
    player.setPlaybackState(this.state);
    player.setCanPause(this.state === State.PLAYING);
    player.setCanPlay(this.state === State.PAUSED || this.state === State.UNKNOWN && this._luckyMix());
    player.setCanGoPrev(prevSong);
    player.setCanGoNext(nextSong);
    
    if ((Nuvola.API_VERSION || 300) >= 301) // API 3.1
        player.setCanRate(this.state !== State.UNKNOWN);
    
    var track = {};
    try
    {
        track.artLocation = document.querySelector("#playerSongInfo #playerBarArt").src.replace("=s90-", "=s500-");
    }
    catch(e)
    {
        track.artLocation =  null;
    }
    
    try
    {
        elm = document.querySelector("#playerSongInfo #currently-playing-title");
        track.title = elm.innerText || elm.textContent;
    }
    catch(e)
    {
        track.title = null;
    }
    
    try
    {
        elm = document.getElementById('player-artist').firstChild;
        track.artist = elm.innerText || elm.textContent;
    }
    catch (e)
    {
        track.artist = null;
    }
    
    try
    {
        elm = document.querySelector("#playerSongInfo .player-album");
        track.album = elm.innerText || elm.textContent;
    }
    catch (e)
    {
        track.album = null;
    }
    
    var thumbsUp = this._getThumbsUpButton();
    var thumbsDown = this._getThumbsDownButton();
    if (this._isThumbSelected(thumbsUp))
        track.rating = 1.0;
    else if (this._isThumbSelected(thumbsDown))
        track.rating = 0.20;
    else
        track.rating = 0.0;
    
    player.setTrack(track);
    
    // Extract enabled flag and state from a web page
    var actionsEnabled = {};
    var actionsStates = {};
    actionsStates[ACTION_THUMBS_UP] = this._isThumbSelected(thumbsUp);
    actionsStates[ACTION_THUMBS_DOWN] = this._isThumbSelected(thumbsDown);
    var thumbNeverToggles = Nuvola.config.get(THUMB_NEVER_TOGGLES);
    actionsEnabled[ACTION_THUMBS_UP] = !!thumbsUp && !(thumbNeverToggles && this._isThumbSelected(thumbsUp));
    actionsEnabled[ACTION_THUMBS_DOWN] = !!thumbsDown && !(thumbNeverToggles && this._isThumbSelected(thumbsDown));
    
    // Compare with previous values and update if necessary
    Nuvola.actions.updateEnabledFlags(actionsEnabled);
    Nuvola.actions.updateStates(actionsStates);
    
    this.scheduleUpdate();
}

WebApp.scheduleUpdate = function()
{
    setTimeout(this.update.bind(this), 500);
}

WebApp._getButton = function(id)
{
    return document.querySelector("[data-id=" + id + "]");
}

WebApp._getPlayPauseButton = function()
{
    return this._getButton("play-pause");
}

WebApp._getGoPrevButton = function()
{
    return this._getButton("rewind");
}

WebApp._getGoNextButton = function()
{
    return this._getButton("forward");
}

WebApp._getShuffleButton = function()
{
    return this._getButton("shuffle");
}

WebApp._getThumbsUpButton = function()
{
    return document.querySelector(".player-rating-container [data-rating='5']");
}

WebApp._getThumbsDownButton = function()
{
    return document.querySelector(".player-rating-container [data-rating='1']");
}

WebApp._isThumbSelected = function(elm)
{
    return (elm && elm.icon) ? elm.icon.indexOf('-outline') == -1 : false;
}

WebApp._onActionActivated = function(emitter, name, param)
{
    var prevSong = this._getGoPrevButton();
    var nextSong = this._getGoNextButton();
    var playPause = this._getPlayPauseButton();
    var luckyMix = this._luckyMix();
    
    switch (name)
    {
    /* Base media player actions */
    case PlayerAction.TOGGLE_PLAY:
        if (this.state === State.UNKNOWN && luckyMix)
            luckyMix.click();
        else
            playPause.click();
        break;
    case PlayerAction.PLAY:
        if (this.state === State.UNKNOWN && luckyMix)
            luckyMix.click();
        else if (this.state != State.PLAYING)
            playPause.click();
        break;
    case PlayerAction.PAUSE:
    case PlayerAction.STOP:
        if (this.state == State.PLAYING)
            playPause.click();
        break;
    case PlayerAction.PREV_SONG:
        if (prevSong)
           prevSong.click();
        break;
    case PlayerAction.NEXT_SONG:
        if (nextSong)
            nextSong.click();
        break;
    
    /* Custom actions */
    case ACTION_THUMBS_UP:
        this._getThumbsUpButton().click();
        break;
    case ACTION_THUMBS_DOWN:
        this._getThumbsDownButton().click();
        break;
    }
}

// Handler for rating
WebApp._onRatingSet = function(emitter, rating)
{
    Nuvola.log("Rating set: {1}", rating);
    var thumbsUp = this._getThumbsUpButton();
    var thumbsDown = this._getThumbsDownButton();
    if (rating < 0.01) // Unset rating
    {
        if (this._isThumbSelected(thumbsUp))
            thumbsUp.click();
        else if (this._isThumbSelected(thumbsDown))
            thumbsDown.click();
    }
    else if (rating <= 0.41) // 0-2 stars
    {
        if (!this._isThumbSelected(thumbsDown))
            thumbsDown.click();
    }
    else if (rating >= 0.79) // 4-5 stars
    {
        if (!this._isThumbSelected(thumbsUp))
            thumbsUp.click();
    }
    else  // three stars
    {
        window.alert("Invalid rating: " + rating + "." 
        + "Have you clicked the three-star button? It isn't supported.");
    }
}

WebApp._luckyMix = function()
{
    return location.hash === "#/now" ? document.querySelector("div[data-type=imfl]") || false : false;
}

WebApp._showUpgradeRequest = function(result)
{
    // FUTURE: Remove Nuvola version check after NP 3.2.0
    if (Nuvola.VERSION >= 30003 && Nuvola.WEBKITGTK_VERSION < this.meta.webkitgtk)
    {
        if (Nuvola.config.get(WEBKITGTK_UPGRADE_REQUEST) === Nuvola.WEBKITGTK_VERSION + ":" + this.meta.webkitgtk)
        {
            Nuvola.log(
                "Library upgrade request dismissed with WebKitGTK {1} ({2} required).",
                this._formatVersion(Nuvola.WEBKITGTK_VERSION),
                this._formatVersion(this.meta.webkitgtk));
            return false;
        }
        
        if (result)
            result.url = "nuvola://outdated-libraries.html";
        return true;
    }
    return false;
}

WebApp._formatVersion = function(version)
{
    var micro = version % 100;
    version = (version - micro) / 100;
    var minor = version % 100;
    var major = (version - minor) / 100;
    return major + "." + minor + "." + micro;
}

WebApp._handleUpgradeRequest = function()
{
    if (!this._showUpgradeRequest())
    {
        Nuvola.actions.activate(Nuvola.BrowserAction.GO_HOME);
        return;
    }
    
    document.getElementById("webkitgtk-found").innerText = this._formatVersion(Nuvola.WEBKITGTK_VERSION);
    document.getElementById("webkitgtk-required").innerText = this._formatVersion(this.meta.webkitgtk);
    document.getElementById("known-issues").onclick = this._showKnownIssues.bind(this);
    document.getElementById("dismiss-upgrade").onclick = this._dismissUpgradeRequest.bind(this);
    var button = document.getElementById("upgrade-webkitgtk");
    if (Nuvola.WEBKITGTK_VERSION < this.meta.webkitgtk)
        button.onclick = this._showWebkitgtkUpgradeInfo.bind(this);
    else
        button.style.display = "none";
}

WebApp._dismissUpgradeRequest = function()
{
    Nuvola.config.set(WEBKITGTK_UPGRADE_REQUEST, Nuvola.WEBKITGTK_VERSION + ":" + this.meta.webkitgtk);
    Nuvola.actions.activate(Nuvola.BrowserAction.GO_HOME);
}

WebApp._showWebkitgtkUpgradeInfo = function()
{
    window.open(WEBKITGTK_UPGRADE_HELP_URL, "WebkitgtkUpgrade", "width=900,height=600");
}

WebApp._showKnownIssues = function()
{
    window.open(KNOWN_ISSUES_URL, "KnownIssues", "width=900,height=600");
}

WebApp.start();

})(this);  // function(Nuvola)
