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
    console.debug(error);
    return false;
  }
}
interface NavLog {
  transitionType?: string;
  transitionQualifiers?: string[];
  body_inner_text?: string;
  parentDocumentId?: string;
  type: string;
  title: string | undefined;
  url: string;
  tabId: string;
  timestamp: string;
  documentId: string | undefined;
}

function createNavlog(
  webNavigationDetails:
    | chrome.webNavigation.WebNavigationTransitionCallbackDetails
    | chrome.webNavigation.WebNavigationFramedCallbackDetails,
  tab: chrome.tabs.Tab
) {
  const navlog: NavLog = {
    type: "navigation",
    title: tab.title,
    tabId: String(webNavigationDetails.tabId),
    timestamp: String(webNavigationDetails.timeStamp),
    documentId: String(webNavigationDetails.documentId),
    url: webNavigationDetails.url,
  };
  if ("body_inner_text" in webNavigationDetails) {
    navlog.body_inner_text = String(webNavigationDetails.body_inner_text);
  }
  if ("parentDocumentId" in webNavigationDetails) {
    navlog.parentDocumentId = String(webNavigationDetails.parentDocumentId);
  }
  if ("transitionType" in webNavigationDetails) {
    navlog.transitionType = webNavigationDetails.transitionType;
  }
  if ("transitionQualifiers" in webNavigationDetails) {
    navlog.transitionQualifiers = webNavigationDetails.transitionQualifiers;
  }
  return navlog;
}
interface ContentPageMessage {
  title: string;
  url: string;
  body_inner_html: string;
  body_text: string;
  image: string;
}
function createNavlogFromContent(
  message: ContentPageMessage,
  sender: chrome.runtime.MessageSender
): NavLog | undefined {
  if (!sender.tab) {
    console.debug("sender tab is undefined");
    return undefined;
  }
  const navlog = {
    type: "content",
    title: message.title,
    tabId: String(sender.tab.id),
    timestamp: String(Date.now()),
    documentId: sender.documentId ? String(sender.documentId) : undefined,
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
async function postNavlog(navlog: NavLog) {
  if (!(await isLoggedIn())) {
    console.debug("skipping post, not logged in");
    return;
  }
  try {
    post({
      apiName: "Dassie",
      path: "/api/navlogs",
      options: {
        //@ts-expect-error need to convert this to typescript
        body: navlog,
      },
    });
  } catch (error) {
    console.log("POST call failed: " + error);
  }
}

function getTabAndPost(
  webNavigationDetails:
    | chrome.webNavigation.WebNavigationTransitionCallbackDetails
    | chrome.webNavigation.WebNavigationFramedCallbackDetails
) {
  chrome.tabs.get(webNavigationDetails.tabId, function (tab) {
    if (
      !tab ||
      (webNavigationDetails.url && webNavigationDetails.url == "about:blank") ||
      (webNavigationDetails.frameType &&
        webNavigationDetails.frameType == "sub_frame") ||
      ("transitionType" in webNavigationDetails &&
        webNavigationDetails.transitionType == "auto_subframe")
    )
      return;
    const navlog = createNavlog(webNavigationDetails, tab);
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

chrome.runtime.onMessage.addListener((request, sender) => {
  console.debug("received message: " + request + sender);
  if (request.type && request.type == "content") {
    const navlog = createNavlogFromContent(request, sender);
    if (navlog) postNavlog(navlog);
  } else if (request.type && request.type == "authStorage") {
    switch (request.method) {
      case "setItem":
        authStorage.setItem(request.key, request.value);
        break;
      case "removeItem":
        authStorage.removeItem(request.key);
        break;
      case "clear":
        authStorage.clear();
        break;
      default:
        break;
    }
  }
  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setOptions({ path: "sidepanel.html" });
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
