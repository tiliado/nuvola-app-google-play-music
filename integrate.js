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

var C_ = Nuvola.Translate.pgettext;
var ngettext = Nuvola.Translate.ngettext;

var State = Nuvola.PlaybackState;
var PlayerAction = Nuvola.PlayerAction;
var player = Nuvola.$object(Nuvola.MediaPlayer);

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
    document.addEventListener("DOMContentLoaded", this._onPageReady.bind(this));
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

WebApp._onPageReady = function()
{
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
    actionsEnabled[ACTION_THUMBS_UP] = !!thumbsUp;
    actionsEnabled[ACTION_THUMBS_DOWN] = !!thumbsDown;
    
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

WebApp.start();

})(this);  // function(Nuvola)
