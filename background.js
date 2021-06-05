chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    name: "Refresher",
  });
});

var localCacheList = {};
var localRefreshList = {};

async function getCurrentTab() {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

function loadStorageToLocalCache() {
  chrome.storage.local.get(null, function (items) {
    localCacheList = items;
    console.log("localCacheList", localCacheList);
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "get_url") {
    console.log("called tab query");
    let queryOptions = { active: true, currentWindow: true };
    chrome.tabs.query(queryOptions).then((tab) => {
      console.log("sending back tab");
      sendResponse({
        message: "success",
        payload: tab,
      });
    });
    return true;
  }
});

//Main Execution:
loadStorageToLocalCache();

function startRefreshingTab(duration, targetTab, url) {
  var timer = duration;
  const interval = setInterval(function () {

    console.log("time before refresh: ", timer, " ", url);

    if (!localRefreshList[url].isSessionActive) {
      console.log("session not active, clearing interval");
      localRefreshList[url].interval = null;
      clearInterval(interval);
    }

    localRefreshList[url].currentTime = timer;
    if (--timer < 0) {
      timer = duration;
      console.log("restarting targetTab ", targetTab);
      chrome.tabs
        .reload(targetTab.id, { bypassCache: false })
        .then((e) => {
          // callback
          console.log("reload finishs ");
        })
        .catch((e) => {
          //error catching
          console.log("error on reload");
          console.log(e);
          localRefreshList[url] = {
            currentTime: duration,
            isSessionActive: false,
            interval: null,
          };
          clearInterval(interval); // time is up
        });
    }
    // chrome.browserAction.setBadgeBackgroundColor({color:[190, 190, 190, 230]});
    // chrome.browserAction.setBadgeText({text:timer.toString()});
  }, 1000);

  localRefreshList[url].interval = interval;
}



//Main API:
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "add_url") {
    chrome.storage.local.set(
      {
        [request.payload.url]: request.payload.time,
      },
      () => {
        if (chrome.runtime.lastError) {
          sendResponse({ message: "fail" });
          return;
        }

        //save to be used in get_refresh_time call 
        localCacheList[request.payload.url] = request.payload.time; 

        if (
          localRefreshList[request.payload.url] &&
          localRefreshList[request.payload.url].interval
        ) {
          clearInterval(localRefreshList[request.payload.url].interval);
        }
        localRefreshList[request.payload.url] = {
          currentTime: request.payload.time,
          isSessionActive: true,
        };
        startRefreshingTab(
          request.payload.time,
          request.payload.tab,
          request.payload.url
        );
        sendResponse({ message: "success" });
      }
    );
    return true;
  }else if (request.message === "get_refresh_time") {
      console.log('getting refreshing time', localCacheList)
    if(localCacheList[request.payload.url]){
        console.log("sending back payload");
        sendResponse({
        message: "success",
        payload: localCacheList[request.payload.url],
      });
    }else{
        sendResponse({
            message: "fail",
        });
    }
    
  } else if (request.message === "remove_url") {
    localRefreshList[request.payload.url] = {
      currentTime: localRefreshList[request.payload.url].time
        ? localRefreshList[request.payload.url].time
        : 0,
      isSessionActive: false,
    };
    sendResponse({ message: "success" });
  } else if (request.message === "check_url") {
    console.log(
      "Getting Info based on URL",
      request.payload.url,
      localRefreshList[request.payload.url]
    );
    console.log(localRefreshList);
    if (localRefreshList[request.payload.url] != null) {
      console.log("sending back payload");
      sendResponse({
        message: "success",
        payload: localRefreshList[request.payload.url],
      });
    } else {
      sendResponse({
        message: "fail",
      });
    }
  }
});
