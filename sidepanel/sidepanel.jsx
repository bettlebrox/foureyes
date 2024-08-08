import ReactDOM from "react-dom/client";
import { Amplify } from "aws-amplify";
import outputs from "/workers/amplify_outputs.json";
import { Authenticator } from "@aws-amplify/ui-react";
import { Button } from "@mui/material";
import "@aws-amplify/ui-react/styles.css";
Amplify.configure(outputs);
const existingConfig = Amplify.getConfig();

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

ReactDOM.createRoot(document.getElementById("root")).render(
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
