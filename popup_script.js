console.log("This is Pop Up Script");

// chrome.runtime.sendMessage({
//     message: "get_name"
// }, response => {
//     if (response.message === 'success') {
//         document.querySelector('div').innerHTML = `Hello ${response.payload}`;
//     }
// });

var currentURL = "nothing";
var currentTab = null;
var seconds = null;
var interval;

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

function getCurrentURL() {
  console.log("ran get currentURL");

  getCurrentTab((e) => {
    currentTab = e;
    console.log("Recieved URL", e.url);
    // if (!/^http/.test(e)){
    //     console.log('invalid URL')
    // }
    // document.getElementById("urlHolder").innerHTML = e.url;
    currentURL = e.url; // set current URL to where we are
    console.log('getting current time')
    getCurrentTime();
    getSavedRefreshTime();
  })
}

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
      message: "remove_url",
      payload: {
        url: currentURL,
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

function getCurrentTime() {
    chrome.runtime.sendMessage(
    {
        message: "check_url",
        payload: {
            url: currentURL
        },
    },
    (response) => {
        if (response.message === "success") {
            console.log("sucessfully received time");
            console.log(response);
            if(response.payload.isSessionActive){
                console.log("sucessfully received time");
                startTimer(response.payload.currentTime - 1, document.getElementById("timer"));
            }
        }else{
            console.log("unsucessfully received time");
        }
    }
    );
  }

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


getCurrentURL();
document.getElementById("startButton").onclick = function () {
  startButtonClicked();
};


document.getElementById("stopButton").onclick = function () {
  stopButtonClicked();
};

