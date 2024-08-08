import ReactDOM from "react-dom/client";
import { Amplify } from "aws-amplify";
import outputs from "../workers/amplify_outputs.json";
import { Authenticator } from "@aws-amplify/ui-react";
import { Button } from "@mui/material";
import "@aws-amplify/ui-react/styles.css";
import { cognitoUserPoolsTokenProvider } from "aws-amplify/auth/cognito";
import { ChromeStorage } from "../common/ChromeStorage";
import React from "react";

Amplify.configure(outputs);
cognitoUserPoolsTokenProvider.setKeyValueStorage(new ChromeStorage());

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Authenticator>
    {({ signOut, user }) => (
      <div>
        <h1>Hi {user?.username}, you are connected </h1>
        <Button color="inherit" onClick={signOut}>
          Logout
        </Button>
      </div>
    )}
  </Authenticator>
);
