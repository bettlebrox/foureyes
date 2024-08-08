import { Amplify } from "aws-amplify";
import { post } from "aws-amplify/api";
import outputs from "../workers/amplify_outputs.json";
import { cognitoUserPoolsTokenProvider } from "aws-amplify/auth/cognito";
import { ChromeStorage } from "../common/ChromeStorage";
import { getCurrentUser } from "aws-amplify/auth";

Amplify.configure(outputs);
const existingConfig = Amplify.getConfig();
const authStorage = new ChromeStorage();
Amplify.configure({
  ...existingConfig,
  API: {
    ...existingConfig.API,
    REST: {
      ...existingConfig.API?.REST,
      Dassie: {
        endpoint: "https://p5cgnlejzk.execute-api.eu-west-1.amazonaws.com/prod", //'http://localhost:3000',//
        region: "eu-west-1", // Optional
      },
    },
  },
});
cognitoUserPoolsTokenProvider.setKeyValueStorage(authStorage);
async function isLoggedIn() {
  try {
    await getCurrentUser();
    return true;
  } catch (error) {
    return false;
  }
}

function createNavlog(webNavigationDetails, tab) {
  var navlog = {
    type: "navigation",
    title: tab.title,
    tabId: String(webNavigationDetails.tabId),
    timestamp: String(webNavigationDetails.timeStamp),
    documentId: String(webNavigationDetails.documentId),
    url: webNavigationDetails.url,
    body_inner_text: webNavigationDetails.body_inner_text,
  };
  if (webNavigationDetails.parentDocumentId) {
    navlog["parentDocumentId"] = webNavigationDetails.parentDocumentId;
  }
  if (webNavigationDetails.transitionType) {
    navlog["transitionType"] = webNavigationDetails.transitionType;
  }
  if (webNavigationDetails.transitionQualifiers) {
    navlog["transitionQualifiers"] = webNavigationDetails.transitionQualifiers;
  }
  return navlog;
}

function createNavlogFromContent(message, sender) {
  var navlog = {
    type: "content",
    title: message.title,
    tabId: String(sender.tab.id),
    timestamp: String(Date.now()),
    documentId: String(sender.tab.documentId),
    url: message.url,
    body_inner_html:
      "body_inner_html" in message
        ? message.body_inner_html.substring(0, 5000)
        : null,
    body_text:
      "body_text" in message ? message.body_text.substring(0, 5000) : null,
    image: message.image,
  };
  return navlog;
}
async function postNavlog(navlog) {
  if (!(await isLoggedIn())) {
    console.debug("skipping post, not logged in");
    return;
  }
  try {
    post({
      apiName: "Dassie",
      path: "/api/navlogs",
      options: {
        body: navlog,
      },
    });
  } catch (error) {
    console.log("POST call failed: ");
  }
}

function getTabAndPost(webNavigationDetails) {
  chrome.tabs.get(webNavigationDetails.tabId, function (tab) {
    if (
      !tab ||
      (webNavigationDetails.url && webNavigationDetails.url == "about:blank") ||
      (webNavigationDetails.frameType &&
        webNavigationDetails.frameType == "sub_frame") ||
      (webNavigationDetails.transitionType &&
        webNavigationDetails.transitionType == "auto_subframe")
    )
      return;
    var navlog = createNavlog(webNavigationDetails, tab);
    console.debug("posting navlog...:" + navlog);
    postNavlog(navlog);
  });
}
chrome.webNavigation.onCompleted.addListener((details) => {
  getTabAndPost(details);
});

chrome.webNavigation.onCommitted.addListener((details) => {
  getTabAndPost(details);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.debug("received message: " + request + sender);
  if (request.type && request.type == "content") {
    var navlog = createNavlogFromContent(request, sender);
    postNavlog(navlog);
  }
  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setOptions({ path: "sidepanel.html" });
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
