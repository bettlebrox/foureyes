import { CognitoIdentityClient, GetIdCommand, GetCredentialsForIdentityCommand } from "@aws-sdk/client-cognito-identity"; // ES Modules import
import { apigClientFactory } from '/workers/apigClient.js'
const config = {
    inAuthFlow:false
}

init()

function awsAuth(token){
    const ci = new CognitoIdentityClient({ region: "eu-west-1" })
    const command = new GetIdCommand({
        IdentityPoolId: "eu-west-1:d2933d30-6cef-4ea0-a6da-d0ff89f933f9",
        Logins: { // LoginsMap
            "accounts.google.com": token,
        }
    })
    ci.send(command).then(
        (data) => {
            console.log("auth response: " + data)
            const cmd = new GetCredentialsForIdentityCommand({
                IdentityId: data.IdentityId,
                Logins: { // LoginsMap
                    "accounts.google.com": token,
                }
            })
            ci.send(cmd, function (err, output) {
                chrome.storage.local.set({
                    'accessKeyId': output.Credentials.AccessKeyId,
                'secretAccessKey': output.Credentials.SecretKey,
                'sessionToken': output.Credentials.SessionToken,
                'sessionExpiration': Math.floor(output.Credentials.Expiration/1000),
                'google_id_token': token
                }, function () {
                    console.log("credentials stored, google token: " + token+" expiration: "+output.Credentials.Expiration)
                })
                console.log("credentials response: " +output + " error: "+err)
            })
        },
        (error) => {
          console.log("auth failed: " + error)
          init()
        }
      );
}

function init(){
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
    if(config.inAuthFlow){
        console.log("Already in auth flow, not starting another one")
        return
    }
    config.inAuthFlow = true
    chrome.identity.launchWebAuthFlow(
        {
            'url': url,
            'interactive': true
        },
        function (redirectedTo) {
            if (chrome.runtime.lastError) {
                console.log("Auth page could not be loaded: "+chrome.runtime.lastError.message);
                config.inAuthFlow = false
                return
            }
            const token = redirectedTo.split('#', 2)[1].split('&')[0].split('id_token=')[1];
            awsAuth(token)
            config.inAuthFlow = false
        }
    );
}

function createNavlog(webNavigationDetails, tab) {
    var navlog = {
        'type': 'navigation', 'title': tab.title, 
        'tabId': String(webNavigationDetails.tabId),
        'timestamp': String(webNavigationDetails.timeStamp),
        'documentId': String(webNavigationDetails.documentId),
        'url': webNavigationDetails.url,
        'body_inner_text': webNavigationDetails.body_inner_text
    }
    if(webNavigationDetails.parentDocumentId) {
        navlog['parentDocumentId'] = webNavigationDetails.parentDocumentId
    }
    if (webNavigationDetails.transitionType) {
        navlog['transitionType'] = webNavigationDetails.transitionType
    }
    if (webNavigationDetails.transitionQualifiers) {
        navlog['transitionQualifiers'] = webNavigationDetails.transitionQualifiers
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
        'body_text': 'body_text' in message? message.body_text.substring(0,5000):null,
        'image':message.image
    }
    return navlog;
}
function postNavlog(navlog) {
        chrome.storage.local.get(['accessKeyId', 'secretAccessKey', 'sessionToken','sessionExpiration','google_id_token'], async function (storage_result) {
            console.log("Expiration: "+storage_result.sessionExpiration + " now: "+Date.now())
            if(storage_result.sessionExpiration < Date.now()) {
                console.log("Session expired, re-authenticating with google token: " + storage_result.google_id_token)
                awsAuth(storage_result.google_id_token)
                return
            }
            var apigClient = apigClientFactory.newClient({
                accessKey: storage_result.accessKeyId,
                secretKey: storage_result.secretAccessKey,
                sessionToken: storage_result.sessionToken,
                region: 'eu-west-1' }) 
            apigClient.apiNavlogsPost({}, navlog, {})
                .then(function(result){
                   console.log("Navigation log post status: "+result.status);
                   if(result.status === 403) {
                        console.log("Authentication failed, re-authenticating with google token: " + storage_result.google_id_token)
                        awsAuth(storage_result.google_id_token)
                   } 
                }).catch( function(result){
                    console.log("Navigation log posting failed", result);
                });
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