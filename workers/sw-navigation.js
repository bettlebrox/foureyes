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
            console.log(token);
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
        'type': 'navigation', 'title': tab.title, 'tabId': webNavigationDetails.tabId,
        'timestamp': webNavigationDetails.timeStamp,
        'documentId': webNavigationDetails.documentId,
        'url': webNavigationDetails.url
    }
    if (webNavigationDetails.transitionType) {
        navlog['transitionType'] = webNavigationDetails.transitionType
    }
    return navlog
}

chrome.webNavigation.onCompleted.addListener((details) => {
    chrome.tabs.get(details.tabId, function (tab) {
        if (!tab || details.url == 'about:blank' ||
            details.frameType == 'sub_frame') return;
        console.log(createNavlog(details, tab))
    })
});

//log transitiontype of navigation
chrome.webNavigation.onCommitted.addListener((details) => {
    chrome.tabs.get(details.tabId, function (tab) {
        if (!tab || details.transitionType == 'auto_subframe') return;
        console.log(createNavlog(details, tab))
    })
});