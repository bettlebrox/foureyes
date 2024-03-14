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
chrome.webNavigation.onCompleted.addListener((details) => {
    chrome.tabs.get(details.tabId, function (tab) {
        if (!tab || details.url == 'about:blank' ||
            details.frameType == 'sub_frame') return;
        console.log({
            'type': 'navigation', 'title': tab.title, 'tabId': details.tabId,
            'timestamp': details.timeStamp,
            'documentId': details.documentId,
            'url': details.url
        })
    })
});

//log transitiontype of navigation
chrome.webNavigation.onCommitted.addListener((details) => {

    chrome.tabs.get(details.tabId, function (tab) {
        if (!tab || details.transitionType == 'auto_subframe') return;
        console.log({
            'type': 'navigation', 'tabId': details.tabId,
            'timestamp': details.timeStamp,
            'transitionType': details.transitionType,
            'documentId': details.documentId,
            'url': details.url
        })
        chrome.identity. getAuthToken({ interactive: false }, function (token) {
            if (chrome.runtime.lastError) {
                alert(chrome.runtime.lastError.message);
                return;
            }
            
            console.log(token);
            const ci = new CognitoIdentityClient({ region: "eu-west-1" })
            const command = new GetIdCommand({
                IdentityPoolId: "eu-west-1:d83ac7ac-b66b-44ff-a1d0-164c1adba6ec",
                Logins: { // LoginsMap
                    "accounts.google.com": token,
                }
            })
            ci.send(command, function (data) {
                console.log("auth response: " + data)
            })

        });
    })

});