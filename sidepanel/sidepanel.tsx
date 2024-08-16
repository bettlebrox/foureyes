import ReactDOM from "react-dom/client";
import { Amplify } from "aws-amplify";
import outputs from "../workers/amplify_outputs.json";
import "@aws-amplify/ui-react/styles.css";
import { cognitoUserPoolsTokenProvider } from "aws-amplify/auth/cognito";
import { ChromeStorage } from "../common/ChromeStorage";
import { Panel } from "./Panel";
const DASSIE_BASE_URL = "http://localhost:5174";
Amplify.configure(outputs);
cognitoUserPoolsTokenProvider.setKeyValueStorage(new ChromeStorage());
ReactDOM.createRoot(document.getElementById("root")!).render(
  <Panel loginId={"anonymous"} baseUrl={DASSIE_BASE_URL} />
);
