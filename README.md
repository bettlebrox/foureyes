# Four Eyes Chrome Extension
This chrome extension logs what you are browsing to a lambda function. It's intended to be used as part of the Dassie, research agent service.

sw-navigation.js is a chrome worker that is responsible for sending logs to the Lambda function using an autogenerated client apigClient.js. 
Posts to the lambda function are authenticated using a google session token that's exchanged for an AWS session token from cognito.

content.js is a content script that takes some metadata and screenshot(html2canvas)for each page when loaded and notifies sw-navigation to log.

## TODO
Cleanup Lambda client
model browser navigation and browsing
handle re-authentication
add instructions for replacing the autogenerated client apigClient.js with your own
