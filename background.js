var localCacheList = {}; //list to remember, even after closing tabs
var localRefreshList = {}; //list of pages to refresh

function initStartIcon() {
  chrome.browserAction.setIcon({path: "./images/icon-timer.png"});
}
function initStopIcon() {
  chrome.browserAction.setIcon({path: "./images/icon-refresh.png"});
}

chrome.tabs.onActivated.addListener(tab => {
  console.log("Checking if tab is in refresh list")
  initStopIcon();
//Remove URL from list to refresh
for (var jay in localRefreshList) {
  if (tab.tabId == localRefreshList[jay].tab.id ) {
    console.log("this tab is in refresh list")
    initStartIcon()
  }
}

});

function loadData() {
  chrome.storage.local.get('SavedRefreshList', function (items) {
    localCacheList = items;
    console.log("Loading SavedRefreshList", localCacheList);
  });
}

function saveData() {
  console.log("Saving SavedRefreshList", localCacheList);
  chrome.storage.local.set({
    'SavedRefreshList': localCacheList,
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "get_url") {
    console.log("called tab query");
    let queryOptions = { active: true, currentWindow: true };
    chrome.tabs.query(queryOptions, (tab) => {
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
loadData();

function startRefreshingTab(duration, targetTab, url) {
  var timer = duration;
  const interval = setInterval(() => {

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
        .reload(targetTab.id, { bypassCache: false }, (e) => {
          chrome.windows.getAll({ populate: true }, (windows) => {
            var tabExist = false
            for (var i = 0, window; window = windows[i]; i++) {
              for (var j = 0, tab; tab = window.tabs[j]; j++) {
                if (tab.id == targetTab.id) {
                  tabExist = true
                }
              }
            }
            if (tabExist === false) {
              console.log("tab does not exist");
              //Removed cache from list of Urls to refresh
              localRefreshList[url] = {
                currentTime: duration,
                isSessionActive: false,
                interval: null,
              };
              clearInterval(interval); // time is up
            }
          });
          console.log("Reload finih, no errors");
        })

    }
  }, 1000);

  localRefreshList[url].interval = interval;
}

//Main API:
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "add_url") {
    chrome.storage.local.set( //add to local data
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
        
        if ( //if current URLs exists in refresh list, remove it and stop
          localRefreshList[request.payload.url] &&
          localRefreshList[request.payload.url].interval
        ) {
          clearInterval(localRefreshList[request.payload.url].interval);
        }

        //Add to refresh list
        localRefreshList[request.payload.url] = {
          currentTime: request.payload.time,
          tab: request.payload.tab,
          isSessionActive: true,
        };
        saveData()
        startRefreshingTab(
          request.payload.time,
          request.payload.tab,
          request.payload.url
        );
        initStartIcon()
        
        sendResponse({ message: "success" });
      }
    );
    return true;

  } else if (request.message === "get_refresh_time") {
    // Get refresh time for url IF it exists

    console.log('getting refreshing time', localCacheList)
    if (localCacheList[request.payload.url]) {
      console.log("sending back payload");
      sendResponse({
        message: "success",
        payload: localCacheList[request.payload.url],
      });
    } else {
      sendResponse({
        message: "fail",
      });
    }
  }
  else if (request.message === "stop_all_processes") {
    console.log("Removing all refresh activity")
    for (var key in localRefreshList) {
        localRefreshList[key].isSessionActive = false;
    }
    initStartIcon();
    sendResponse({
      message: "success",
      payload: localCacheList[request.payload.url],
    });
  }
  else if (request.message === "stop_single_process") {
    // TODO: we should change this to remove by tabID
    console.log("removing url", request.payload.url, "  ", localRefreshList[request.payload.url])
    console.log("removing url2", request.payload.tab)

    //Remove URL from list to refresh
    for (var eye in localRefreshList) {
      console.log("removing url3",request.payload.tab.id, localRefreshList[eye].tab.id)
      if (request.payload.tab.id == localRefreshList[eye].tab.id ) {
        console.log("removing -> " + localRefreshList[eye]);
        localRefreshList[eye].isSessionActive = false;
        sendResponse({
          message: "success",
          payload: localCacheList[request.payload.url],
        });
        initStopIcon();
      }
    }
    sendResponse({
      message: "fail",
    });
  } else if (request.message === "get_tab_info") {
    //Check if current URL's time left before refresh, poor naming here
    console.log(
      "Getting Info based on URL",
      request.payload.url,
      request.payload.tab,
      localRefreshList[request.payload.url]
    );

    console.log ("request.payload.tab: ", request.payload.tab)
    console.log ("localRefreshList: ", localRefreshList)
    for (var key0 in localRefreshList) {
      if (request.payload.tab.id == localRefreshList[key0].tab.id ) {
        console.log("found matching tab info -> " + localRefreshList[key0]);
        sendResponse({
          message: "success",
          payload: localRefreshList[key0],
        });
      }
    }
    sendResponse({
      message: "fail",
    });
  }
});
