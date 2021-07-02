console.log("Pop Up Script execution");

var currentURL = "nothing";
var currentTab = null;
var seconds = null;
var interval;


//TODO: Move the below to foreground process, it will be use to
//change extension icon when update is active in this tab
// chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
//     if (changeInfo.status === 'complete' && /^http/.test(tab.url)) {
//         console.log('tab updated from popup script')
//         getCurrentURL();
//     }
// });

async function getCurrentTab(callback) {
  chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
    var tab = tabs[0];

    if (tab) {
      console.log("Current Tab: ", tab);
      callback(tab);

    } else {
      chrome.tabs.get(activeTabId, function (tab) {
        if (tab) {
          console.log("Active Tab: ", tab);
          callback(tab);
        } else {
          console.log('No active tab identified.');
        }
      });

    }
  });
}


/*
Get current URL of tab
*/
function getCurrentURL() {
  console.log("getCurrentURL executed");

  getCurrentTab((e) => {
    currentTab = e;
    console.log("Recieved URL", e.url);
    currentURL = e.url; // set current URL to where we are
    console.log('getting current time')
    getCurrentTime();
    getSavedRefreshTime();
  })
}


/*
Send URL and tab to background service which will start the refresh process,
function will also start a timer
*/
function startButtonClicked() {
    if(interval){
        clearInterval(interval)
    }
  seconds = parseInt(document.getElementById("timeInput").value);
  console.log("input value: ", seconds);
  console.log("currentTab: ", currentURL);
  if (seconds != null && seconds > 0) {
    chrome.runtime.sendMessage(
      {
        message: "add_url",
        payload: {
          url: currentURL,
          tab: currentTab,
          time: seconds,
        },
      },
      (response) => {
        if (response.message === "success") {
          console.log("sucessfully logged");
          startTimer(seconds, document.getElementById("timer"));
        } else {
          console.log("unsucessfully logged");
        }
      }
    );
  }
}

/*
Stop the timer and prevent further refresh activity
*/
function stopButtonClicked() {
  if(interval){
      clearInterval(interval)
  }
  document.getElementById("timer").textContent = ""
  seconds = parseInt(document.getElementById("timeInput").value);
  console.log("input value: ", seconds);
  console.log("currentTab: ", currentURL);


  chrome.runtime.sendMessage(
    {
      message: "stop_single_process",
      payload: {
        url: currentURL,
        tab: currentTab
      },
    },
    (response) => {
      if (response && response.message === "success") {
        console.log("sucessfully removed");
      } else {
        console.log("unsucessfully removed");
      }
    }
  );
}

/*
Start a count down timer
*/
function startTimer(duration, display) {
    console.log('creating a new instance of timer');
  var timer = duration,
    minutes,
    seconds;
    if(interval){
        clearInterval(interval);
    }
    interval = setInterval(function () {
    minutes = parseInt(timer / 60, 10);
    seconds = parseInt(timer % 60, 10);

    minutes = minutes < 10 ? "0" + minutes : minutes;
    seconds = seconds < 10 ? "0" + seconds : seconds;

    display.textContent = minutes + ":" + seconds;

    if (--timer < 0) {
      timer = duration;
      display.textContent = "";
    }
  }, 1000);
}

/*
Get current time before another refresh
*/
function getCurrentTime() {
  console.log("getCurrentTime Execution");
    chrome.runtime.sendMessage(
    {
        message: "get_tab_info",
        payload: {
            url: currentURL,
            tab: currentTab
        },
    },
    (response) => {
        if (response.message === "success") {
            console.log("Sucessfully received time");
            console.log(response);
            if(response.payload.isSessionActive){
                console.log("Setting timer");
                startTimer(response.payload.currentTime - 1, document.getElementById("timer"));
            }
        }else{
            console.log("Unsucessfully received time");
        }
    }
    );
  }

  /*
  Get the saved reset time used for this URL previously
  */
  async function getSavedRefreshTime() {
    chrome.runtime.sendMessage(
    {
        message: "get_refresh_time",
        payload: {
            url: currentURL
        },
    },
    (response) => {
        if (response.message === "success") {
            console.log("sucessfully received getSavedRefreshTime");
            console.log(response);

            document.getElementById("timeInput").value = response.payload
        }else{
            console.log("unsucessfully received getSavedRefreshTime");
        }
    }
    );
  }


  function stopAllButtonClicked() {
    if(interval){
        clearInterval(interval)
    }

    console.log("Stop all Button Clicked")
    document.getElementById("timer").textContent = ""
  
    chrome.runtime.sendMessage(
      {
        message: "stop_all_processes",
        payload: {
        },
      }
    );
  }

getCurrentURL();

document.getElementById("startButton").onclick = function () {
  startButtonClicked();
};


document.getElementById("stopButton").onclick = function () {
  stopButtonClicked();
};

document.getElementById("stopAllButton").onclick = function () {
  stopAllButtonClicked();
};

