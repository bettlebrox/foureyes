import { CognitoIdentityClient, CognitoIdentity, GetIdCommand } from "@aws-sdk/client-cognito-identity"; // ES Modules import
import {
    CognitoIdentityProviderClient,
    GetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    ListObjectsCommand,
    DeleteObjectCommand,
} from "@aws-sdk/client-s3";
const NAVLOG_REST_HOST = 'https://p5cgnlejzk.execute-api.eu-west-1.amazonaws.com/prod/api/navlogs';

var manifest = chrome.runtime.getManifest();
var clientId = encodeURIComponent(manifest.oauth2.client_id);
var scopes = encodeURIComponent(manifest.oauth2.scopes.join(' '));
var redirectUri = encodeURIComponent('https://' + chrome.runtime.id + '.chromiumapp.org');
var url = 'https://accounts.google.com/o/oauth2/auth' +
    '?client_id=' + clientId +
    '&response_type=id_token' +
    '&access_type=offline' +
    '&redirect_uri=' + redirectUri +
    '&scope=' + scopes;
chrome.identity.launchWebAuthFlow(
    {
        'url': url,
        'interactive': true
    },
    function (redirectedTo) {
        if (chrome.runtime.lastError) {
            // Example: Authorization page could not be loaded.
            console.log(chrome.runtime.lastError.message);
        }
        else {
            var token = redirectedTo.split('#', 2)[1].split('&')[0].split('id_token=')[1];
            // Example: id_token=<YOUR_BELOVED_ID_TOKEN>&authuser=0&hd=<SOME.DOMAIN.PL>&session_state=<SESSION_SATE>&prompt=<PROMPT>
            const ci = new CognitoIdentityClient({ region: "eu-west-1" })
            const command = new GetIdCommand({
                IdentityPoolId: "eu-west-1:d2933d30-6cef-4ea0-a6da-d0ff89f933f9",
                Logins: { // LoginsMap
                    "accounts.google.com": token,
                }
            })
            ci.send(command, function (err, ouput) {
                console.log("auth response: " + err + "data:" + output)
            })
        }
    }
);

function createNavlog(webNavigationDetails, tab) {
    var navlog = {
        'type': 'navigation', 'title': tab.title, 
        'tabId': String(webNavigationDetails.tabId),
        'timestamp': String(webNavigationDetails.timeStamp),
        'documentId': String(webNavigationDetails.documentId),
        'url': webNavigationDetails.url,
        'body_inner_text': webNavigationDetails.body_inner_text
    }
    if (webNavigationDetails.transitionType) {
        navlog['transitionType'] = webNavigationDetails.transitionType
    }
    return navlog
}

function createNavlogFromContent(message, sender) {
    var navlog = {
        'type': 'content', 'title': message.title, 'tabId': String(sender.tab.id),
        'timestamp': String(Date.now()),
        'documentId': String(sender.tab.documentId),
        'url': message.url,
        'body_inner_html': 'body_inner_html' in message? message.body_inner_html.substring(0,5000):null,
        'body_text': 'body_text' in message? message.body_text.substring(0,5000):null
    }
    return navlog;
}


function postNavlog(navlog) {
    fetch(NAVLOG_REST_HOST, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(navlog)
    })
}
function getTabandPost(webNavigationDetails) {
    chrome.tabs.get(webNavigationDetails.tabId, function (tab) {
        if (!tab || (webNavigationDetails.url && webNavigationDetails.url == 'about:blank') ||
            (webNavigationDetails.frameType && webNavigationDetails.frameType == 'sub_frame') ||
            (webNavigationDetails.transitionType && webNavigationDetails.transitionType == 'auto_subframe')
        ) return;
        var navlog = createNavlog(webNavigationDetails, tab)
        console.debug("posting navlog...:" + navlog)
        postNavlog(navlog)
    })
}
chrome.webNavigation.onCompleted.addListener((details) => {
    getTabandPost(details)
});

//log transitiontype of navigation
chrome.webNavigation.onCommitted.addListener((details) => {
    getTabandPost(details)
});

chrome.runtime.onMessage.addListener(function (request, sender) {
    console.log("received message: " + request + sender)
    if (request.type && request.type == "content") {
        var navlog = createNavlogFromContent(request, sender)
        postNavlog(navlog)
    }
})