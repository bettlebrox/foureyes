import { KeyValueStorageInterface } from "aws-amplify/utils";
export class ChromeStorage implements KeyValueStorageInterface {
  async setItem(key: string, value: string): Promise<void> {
    type MyRecord = Record<string, string>;
    const item: MyRecord = {};
    item[key] = value;
    chrome.storage.sync.set(item);
  }
  async getItem(key: string): Promise<string | null> {
    const value = await chrome.storage.sync.get(key);
    return value[key];
  }
  async removeItem(key: string): Promise<void> {
    chrome.storage.sync.remove(key);
  }
  async clear(): Promise<void> {
    chrome.storage.sync.clear();
  }
}
