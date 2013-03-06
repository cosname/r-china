(function() {
    var win = window,
        doc = document,
        body,
        nullVal = null,
        trueVal = true,
        falseVal = false,
        undef = "undefined";

    function waitForDOMReady() {
        if (domReady) {
            return domReady;
        }
        body = doc.body;
        if (body && body.lastChild) {
            domReady = trueVal;
            return domReady;
        } else {
            return setTimeout(waitForDOMReady, 0);
        }
    }
    
    // make sure our DOM is ready to go before we proceed
    waitForDOMReady();
    
    if (!win.cooliris) {
        win.cooliris = {};
    }

    var ci = win.cooliris,
        swfX, swfY,
        callbackID      = 0,
        callbackStorage = {},
        wrapper         = nullVal,
        client          = nullVal,
        bgT, bgB, bgL, bgR,
        close, closeStyle,
        foreground, foregroundStyle,
        backgroundColor = '#000000',
        hundredPct = "100%",
        scannedPageForSWFs = falseVal,
        swfs       = [],
        domReady   = falseVal,
        currOverlay, currStyle, // for SWF and HTML DIV overlays
        root       = 'http://apps.cooliris.com/embed/',
        iframeRoot = '/wall/js/',                              // replace this debug URL with the production URL
        swfURL     = '/wall/bin-debug/CoolirisInMotion.swf',   // replace this debug URL with the production URL
        lastSWF;

    if (doc.location.protocol == "https:") {
        iframeRoot = iframeRoot.replace("http:", "https:");
        swfURL = swfURL.replace("http:", "https:");
    }

    function isValid(aVariable) {
        return aVariable != nullVal && typeof(aVariable) != undef;
    }

    /**
     * Two functions for detecting and launching the browser plugin.
     */
    function hasCI() {
        if (!client) {
            var plc = nullVal,
                ax = "application/x-cooliris";
            if (typeof(PicLensContext) != undef) { // Firefox
                // Can't use isValid here due to ReferenceError
                plc = new PicLensContext();
            } else if (win.ActiveXObject) { // IE
                try {
                    plc = new ActiveXObject("PicLens.Context");
                } catch (e) {
                    plc = nullVal;
                }
            } else { // Safari
                if (navigator.mimeTypes[ax]) { // Safari
                    plc = doc.createElement("object");
                    plc.style.width = 0;
                    plc.style.height = 0;
                    plc.type = ax;
                    doc.documentElement.appendChild(plc);
                } 
            }
            client = plc;
        }
        return isValid(client);
    }
  
    ci.hasClient = hasCI;
    ci.launchClient = function(url, guid) {
        if (hasCI()) {
            if (typeof(url) == undef && typeof(cooliris.embed != undef)) {
                url = cooliris.embed.getFeedURLForClient();
            }
            setTimeout(function() {
                if (isValid(guid)) {
                    client.launch(url, "uid", guid);
                } else {
                    client.launch(url,"","");
                }
            }, 5);
            return trueVal;
        }
        return falseVal;
    };

    function getItem(id) {
        return doc.getElementById(id);
    }

    /**
     * Allows us to pass in JS function references/closures OR function names.
     * Once our function returns, we'll either call the function directly by name, or
     * look it up in our callbackStorage table and then invoke the function closure.
     * Once we call the function, delete it immediately!
     */
    function getFunctionName(fcnNameOrRef) {
        if (!isValid(fcnNameOrRef)) {
            return nullVal;
        } else if (typeof(fcnNameOrRef) == "string") {
            return fcnNameOrRef; // it's already a name
        } else { // function reference, so we need to store it for later
            var fcnName = "f_" + callbackID++;
            callbackStorage[fcnName] = fcnNameOrRef;
            return fcnName;
        }
    }
    
    function findSWFs(tag) {
        var objs = doc.getElementsByTagName(tag);
        var i = objs.length;
        try {
            while(i--) { // there are still items
                if (objs[i].GID && objs[i].GID() == "CISWF") {
                    swfs.push(objs[i]);
                }
            }
        } catch (err) {
            // not ready!
        }
    }
    
    function flash() { // auto detect the swf object
        if (!scannedPageForSWFs) {
            findSWFs("object");
            findSWFs("embed");
            scannedPageForSWFs = trueVal;
        }
        
        // do a linear search for the currently active swf
        // TODO: start from the previous SWF that was active, as that's probably the same one that will be active
        // If none are active, we choose the last SWF in the array (or maybe the previously active SWF)
        
        if(lastSWF && lastSWF.IA && lastSWF.IA()) {
            return lastSWF;
        }
        var swf, i;
        for (i=0; i<swfs.length; i++) {
            swf = swfs[i];
            if (swf.IA && swf.IA()) {
                lastSWF = swf;
                break;
            }
        }
        return lastSWF;
    }

    function initWrapper() {
        if (wrapper !== nullVal) {
            return;
        }
        // we need to know where our SWF is
        if(flash()) {
            swfX = flash().offsetLeft;
            swfY = flash().offsetTop;
        }

        // we try to find it automatically, based on flash().parentNode
        if(flash()) {wrapper = flash().parentNode;} 
        if (wrapper && wrapper.tagName == "OBJECT") {
            wrapper = wrapper.parentNode;
        }
    }

    function createChildDIV(parentElement, clearParent) {
        var div = doc.createElement('div');
        if (parentElement) {
            // clear out the parent element
            if (clearParent) {
                parentElement.innerHTML = '';
            }
            parentElement.appendChild(div);
        }
        return div;
    }

    function copyParams(objFrom, objTo) {
        for (var p in objFrom) {
            if (objFrom.hasOwnProperty(p)) {
                objTo[p] = objFrom[p] + 'px';
            }
        }
    }
    
    function styleBackground(div, params) {
        var style = div.style;
        style.position = 'fixed';
        style.backgroundColor = backgroundColor;
        style.zIndex = 10000;
        style.opacity = '0.33';
        style.filter = 'alpha(opacity=33)'; // IE
        copyParams(params, style);
    }
    
    function styleBackgroundDIVs(space) {
        styleBackground(bgT, { top: 0, left: 0, right: 0, height: space });
        styleBackground(bgB, { bottom: 0, left: 0, right: 0, height: space });
        styleBackground(bgL, { top: space, left: 0, bottom: space, width: space });
        styleBackground(bgR, { top: space, bottom: space, right: 0, width: space });
    }

    function finalizeExit() {
        body.removeChild(bgT);
        body.removeChild(bgB);
        body.removeChild(bgL);
        body.removeChild(bgR);
        body.removeChild(foreground);
        body.removeChild(close);
        bgT = bgB = bgL = bgR = foreground = close = nullVal;
    }

    function exit() {
        // hide DIVs now, and remove them in a bit
        bgT.style.display = bgB.style.display = bgL.style.display = bgR.style.display = foregroundStyle.display = closeStyle.display = 'none';
        setTimeout(finalizeExit, 100); // 0.1s
    }

    function displayLightbox() {
        var borderSpace = 40;
    
        // foreground container DIV
        foreground = createChildDIV(body);
        foregroundStyle = foreground.style;
        foregroundStyle.backgroundColor = backgroundColor;
        foregroundStyle.position = 'fixed';
        foregroundStyle.border = '8px solid #FBFBFC';
        foregroundStyle.zIndex = 10001;     // above the bg
        foregroundStyle.left = foregroundStyle.right = foregroundStyle.top = foregroundStyle.bottom = borderSpace + 'px';

        // draw four surrounding DIVs
        bgT = createChildDIV(body);
        bgB = createChildDIV(body);
        bgL = createChildDIV(body);
        bgR = createChildDIV(body);
        styleBackgroundDIVs(borderSpace);
        
        // put the close button in here
        close = createChildDIV(body);
        closeStyle = close.style;
        
        // put the SWF in here
        var content = createChildDIV(foreground),
            contentStyle = content.style;
            
        closeStyle.background = "url(" + root + "images/close.png)";
        closeStyle.position = 'fixed';
        closeStyle.width = closeStyle.height = '30px';
        closeStyle.zIndex = 10002;
        closeStyle.right = closeStyle.top = (borderSpace - 15) + 'px';

        bgT.onclick = bgB.onclick = bgL.onclick = bgR.onclick = close.onclick = exit;
        
        content.id = "ci_swf_" + Math.floor(Math.random()*10000);
        contentStyle.backgroundColor = backgroundColor;
        contentStyle.width = hundredPct;
        contentStyle.height = hundredPct;

        return content.id;
    }

    function handleMouseWheel(e) {
        if (!flash()) {
            return trueVal;
        }
        
        // e.wheelDelta
        // Safari/Windows (MouseWheel Up is +120; Down is -120)
        var delta = 0;
        if (!e) {
            e = win.event;
        }
        if (e.wheelDelta) { // IE/Opera
            delta = e.wheelDelta/120;
        } else if (e.detail) { // Firefox/Moz
            var d = e.detail;
            // on mac, do not divide by 3...
            if (Math.abs(d) < 3) {
                delta = -d;
            } else {
                delta = -d/3;
            }
        }
        if (delta) {
            // do not send abs values < 1; otherwise, you can only scroll next
            // var top = document.body.scrollTop; // might be useful for safari's trackpad scrolling bug
            // if the swf returned true, we do not allow our document to scroll
            if (flash() && flash().HMW(delta)) {
                if (e.preventDefault) {
                    e.preventDefault();
                }
                e.returnValue = falseVal;
                return falseVal;
            }
        }
        return trueVal;
    }

    function embedSWF(id, width, height, flashvars) {
        var params = {
            allowscriptaccess : "always",
            allowfullscreen : "true",
            wmode : "opaque"
        };

        // add the background color
        var bgColor = nullVal;
        for (var fv in flashvars) {
            if (fv.toLowerCase() == "backgroundcolor") {
                bgColor = flashvars[fv];
                if (bgColor.indexOf("0x") != -1) {
                    bgColor = bgColor.replace("0x", "#");
                }
                params.bgColor = bgColor;
            }
        }
        if (bgColor === nullVal) {
            params.bgColor = "#121212";
        }

        swfobject.embedSWF(swfURL, id, width, height, "9.0.0", root + "modules/swfobject/expressInstall.swf", flashvars, params, nullVal, onSWFEmbedded);
    }
    
    function onSWFEmbedded(e) {
        if (e.success && e.ref.style) {
            e.ref.style.outline = "none"; // remove the firefox outline
        }
    }
    
    function myEval(jsonString) {
        // TODO: Can we do the other myEval approach (as seen in JS Scraper code)?
        return (new Function("return " + jsonString + ";"))();
    }
    
    function getPosition(obj) {
        var curLeft = 0,
            curTop = 0;
        if (obj.offsetParent) {
            do {
                curLeft += obj.offsetLeft;
                curTop += obj.offsetTop;
            } while (obj = obj.offsetParent); // we assign obj to the parent, and stop if obj is null
        }
        return [curLeft, curTop];
    }
    
    function getSize() {
        return flash().GS();
    }


    /**
     * The cooliris.embed.* public API.
     */
    ci.embed = ci.embed || {};
    var embed = ci.embed;
    embed.APIVersion = "1.0"; // this signals that the API is now available
    embed.addCustomButton = function(iconURL, actionURL) {
        if(flash()){ flash().ACB(iconURL, actionURL); }
    };
    embed.callFunction = function(fcnName, param0, param1) {
        if (callbackStorage[fcnName] != nullVal) {
            callbackStorage[fcnName](param0, param1);
            
            // TODO: Someday, explore an approach to free up memory
            // DO NOT do this for now, because it will kill some permanent callbacks (e.g., onItemSelected)
            // delete callbackStorage[fcnName];
        }
    };
    // this assumes that swfobject exists
    embed.createWall = function(config) {
        var width, 
            height,
            queryString = "",
            target, iframe;

        // if the user has specified type == iframe, then we'll inject an iframe into the target DIV
        // id parameter is required
        if (config.type == "iframe") {
            target = getItem(config.id);
            width = config.width || "700";
            height = config.height || "430";
            for (var key in config) {
                if (config.hasOwnProperty(key)) {
                    queryString += key + "=" + encodeURIComponent(config[key]) + "&";
                }
            }
            iframe = doc.createElement('iframe');
            iframe.src = iframeRoot + "?" + queryString + "pageURL=" + encodeURIComponent(win.top.location.href);
            iframe.frameBorder = 0;
            iframe.style.border = "none";
            iframe.style.width = width + "px";
            iframe.style.height = height + "px";
            target.appendChild(iframe);
        } else {
            if (!config.hasOwnProperty("id")) {
                // default to the lightbox (if the user hasn't specified an id)
                config.id = displayLightbox(); // displays a lightbox and returns the random ID
                config.lightbox = trueVal;
                width = hundredPct;
                height = hundredPct;
            } else {
                // alternatively, allow users to embed the wall within a DIV
                width = config.width || "700";
                height = config.height || "430";
                var parentDIV = getItem(config.id);
                if (parentDIV.style.width == '') {
                    if (width.indexOf("%") == -1) {
                        width += 'px';
                    }
                    parentDIV.style.width = width;
                }
                if (parentDIV.style.height == '') {
                    if (height.indexOf("%") == -1) {
                        height += 'px';
                    }
                    parentDIV.style.height = height;
                }
                var div = createChildDIV(parentDIV, trueVal);
                div.id = config.id + "_swf";
                config.id = div.id;
            }
            embedSWF(config.id, width, height, config);
        }
    };
    embed.deselectItem = function() {
        if(flash()){ flash().DI(); }
    };
    embed.getBounds = function() {
        var f = flash(),
            pos = getPosition(f),
            size = getSize();
        return [pos[0], pos[1], size[0], size[1]];
    };
    embed.getEmbedCode = function() {
        if(flash()){ return flash().GEC(); } return "";
    };
    embed.getFeedURL = function() {
        if(flash()){ return flash().GFU(); } return "";
    };
    embed.getFeedURLForClient = function() {
        if(flash()){ return flash().GFUFC(); } return "";
    };
    embed.getFlashVars = function() {
        if(flash()){ return flash().GFV(); } return "";
    };
    embed.getItems = function(whichItems, type, jsCallback) {
        if (jsCallback) {
            if(flash()){ flash().GI(whichItems, type, getFunctionName(jsCallback)); }
        } else {
            var retVal;
            if(flash()){ retVal = flash().GI(whichItems, type, ""); }
            if (retVal === nullVal) { 
                return retVal;
            }
            if (typeof(type) == undef || type.toLowerCase() == "json") {
                var newRetVal;
                if (typeof(retVal) == "string") {
                    return myEval(retVal);
                } else if (typeof(retVal.length) == undef) { // object w/ JSON values
                    newRetVal = {};
                    for (var k in retVal) {
                        if (retVal.hasOwnProperty(k)) {
                            newRetVal[k] = myEval(retVal[k]);
                        }
                    }
                    return newRetVal;
                } else { // array of JSON strings
                    var len = retVal.length;
                    newRetVal = [];
                    for (var i=0; i<len; i++) {
                        newRetVal.push(myEval(retVal[i]));
                    }
                    return newRetVal;
                }
            } else { // xml
                return retVal; // xml string
            }
        }
    };
    embed.getPartnerLogo = function() {
        if(flash()){ return flash().GPL(); } return "";
    };
    embed.getSelectedItem = function() {
        if(flash()){ return myEval(flash().GSI()); } return "";
    };
    embed.getSize = getSize;
    embed.getSWF = function() {
        return flash();
    };
    embed.initMouseHandlers = function() {
        if (win.addEventListener) {          // Firefox
            win.addEventListener("DOMMouseScroll", handleMouseWheel, falseVal);
        } else if (doc.attachEvent) {        // IE/Opera
            doc.attachEvent("onmousewheel", handleMouseWheel);
        }
        doc.onmousewheel = handleMouseWheel; // Safari and Others
    };
    embed.mouseEvent = function(eventType) { // "LEAVE"
        if(flash()){ flash().M(eventType); }
    };
    embed.init = function() { // when cooliris.swf is embedded or re-embedded, we'll need to update the JS API
        scannedPageForSWFs = falseVal;
        swfs = [];
        if (wrapper != nullVal) {
            embed.overlay.hide();
            wrapper = nullVal;
        }
    };
    // provide a relative index +1, +2, -1, etc...
    // this chooses a nearby item
    // if no item is selected, it selects the central item
    embed.selectItemNearby = function(relIndex) {
        if(flash()){ flash().SIN(relIndex); }
    };
    embed.selectItemByIndex = function(n) {
        if(flash()){ flash().SIBI(n); }
    };
    embed.selectItemByGUID = function(guid) {
        if(flash()){ flash().SIBG(guid); }
    };
    embed.setCallbacks = function(cb) {
        if(flash()){ 
            flash().SC(getFunctionName(cb.firstmousedown), getFunctionName(cb.mousedown), getFunctionName(cb.select),
                   getFunctionName(cb.deselect), getFunctionName(cb.debug), getFunctionName(cb.linkout), getFunctionName(cb.stats),
                   getFunctionName(cb.feedload), getFunctionName(cb.feederror));
        }
    };
    embed.setFeedContents = function(contents) {
        if(flash()){ flash().SFC(contents); }
    };
    embed.setFeedURL = function(url) {
        if(flash()){ flash().SFU(url); }
    };
    embed.setTitle = function(title, url) {
        if(flash()){ flash().ST(title, url); }
    };
    embed.setMessage = function(msg, fontSize, posX, posY) {
        if (!isValid(msg)) {
            msg = "";
        }    
        if (!isValid(fontSize)) {
            fontSize = 18;
        }    
        if (!isValid(posX)) {
            posX = 50;
        }    
        if (!isValid(posY)) {
            posY = 50;
        }
        if(flash()) { flash().SM(msg, fontSize, posX, posY); }
    };
    embed.showSharing = function(tabName) {
        if(flash()){ flash().SSH(tabName); }
    };
    embed.showSpinner = function(flag) {
        if(flash()){ flash().SS(flag); }
    };
    embed.useCustomCursor = function(flag) {
        if(flash()){ flash().UCC(flag); }
    };
        
    
    /**
     * Facebook API
     */
    embed.facebook = function() {
        return {
            callMethod : function(method, args, jsCallback, mode) {
                if(flash()){ flash().fbCM(method, args, getFunctionName(jsCallback), mode); }
            },
            fqlQuery : function(fql, jsCallback, mode) {
                if(flash()){ flash().fbFQ(fql, getFunctionName(jsCallback), mode); }
            },
            getFriendIDs : function(jsCallback, mode) {
                if(flash()){ flash().fbGFI(getFunctionName(jsCallback), mode); }
            },
            getFriendsByName : function (nameFragment, jsCallback, mustStartWith, mode) {
                if(flash()){ flash().fbGFBN(nameFragment, getFunctionName(jsCallback), mustStartWith, mode); }
            }
        };
    }();

    /**
     * Displays an iframe or div overlay.
     * We create it each time, to make sure that history is not affected
     * and that the div's contents are clean...
     * 
     * cooliris.embed.overlay.*
     */
    embed.overlay = function() {
        
        return {
            init : function(type, urlOrContents, bgColor, iframeScrolling) {
                initWrapper();
                currOverlay = doc.createElement(type);
                currStyle = currOverlay.style;
                currStyle.position="absolute";
                currStyle.textAlign = "center";
                currStyle.display = "none";
                if (bgColor !== '') {
                    currStyle.background=bgColor;
                }
                if (type == "iframe") {
                    // case sensitivity matters! http://www.visible-form.com/blog/createelement-and-events-and-iframe-borders/
                    currOverlay.frameBorder = 0;
                    currOverlay.scrolling = iframeScrolling;
                    currOverlay.src = urlOrContents;
                } else { // "div" is used to display SWF items
                    currStyle.overflow = "hidden";
                    currOverlay.innerHTML = urlOrContents;
                }
            },
            
            show : function(x, y, w, h, borderThickness, movieW, movieH) {
                var s = 1;
                if(flash()){ s = parseInt(flash().width, 10) / movieW; }// scale factor can be NaN, if width is 100%
                if (isNaN(s)) {
                    s = 1;
                }
                currStyle.border = borderThickness + "px solid #7C7C7C";
                currStyle.left = (swfX + x) * s + "px";
                currStyle.top = (swfY + y) * s + "px";
                currStyle.width = (w * s) + "px";
                currStyle.height = (h * s) + "px";
                currStyle.display = "";
                // in IE, the DIV is a child of the HTMLDocument!
                // in Firefox, the DIV has a null parent
                if (currOverlay.parentNode != wrapper) {
                    wrapper.appendChild(currOverlay);
                }
            },

            hide : function() {
                currStyle.display = "none";
                var p = currOverlay.parentNode;
                if (isValid(p)) {
                    p.removeChild(currOverlay);
                }
            }
        };
    }();

    var f = cooliris.embed.onJSLoaded;
    if (f) {
        f("wall");
    }
})();
