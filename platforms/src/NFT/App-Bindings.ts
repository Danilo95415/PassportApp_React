/* eslint-disable */
import { Platform, PlatformOptions } from "../types";

export class NFTPlatform implements Platform {
  async dummy(state: any, window: any, screen: any): Promise<string> {

    return "hello";
  }

  
  getOAuthUrl(state: string): Promise<string> {
    throw new Error("Method not implemented.");
  }
  platformId = "NFT";
  path = "NFT";
  clientId: string = null;
  redirectUri: string = null;
};
