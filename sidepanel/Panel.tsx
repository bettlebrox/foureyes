import { fetchUserAttributes } from "aws-amplify/auth";
import { useState } from "react";
const ALLOWED_ORIGINS = [
  "http://localhost:5174",
  "https://main.d1tgde1goqkt1z.amplifyapp.com",
];
export function Panel({
  loginId,
  baseUrl,
}: {
  loginId: string;
  baseUrl: string;
}) {
  const [givenName, setGivenName] = useState<string>("loading...");
  async function fetchGivenName(loginId: string) {
    try {
      const atts = await fetchUserAttributes();
      setGivenName(atts.given_name ?? loginId);
    } catch {
      console.debug("logged out");
      setGivenName("logged_out");
    }
  }
  chrome.runtime.onMessage.addListener((message, sender) => {
    if (
      message.type === "auth" &&
      sender.origin &&
      ALLOWED_ORIGINS.includes(sender.origin)
    ) {
      console.debug("auth message received in Panel");
      fetchGivenName(loginId);
    }
  });
  fetchGivenName(loginId);
  const loggedIn = (
    <div>
      <h1>{givenName}'s Second Brain</h1>
      <p>You are logged in and your second brain is learning.</p>
      <p>
        Go to{" "}
        <a href={baseUrl} target="_blank">
          Dassie
        </a>{" "}
        to see what you've learned.
      </p>
    </div>
  );
  const loggedOut = (
    <div>
      <h1>Dassie</h1>
      <p>
        You are not logged in. Go to{" "}
        <a href={baseUrl} target="_blank">
          Dassie
        </a>{" "}
        to log in.
      </p>
    </div>
  );
  return <div>{givenName === "logged_out" ? loggedOut : loggedIn}</div>;
}
