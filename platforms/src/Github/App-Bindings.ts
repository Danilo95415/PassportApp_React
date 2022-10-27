import { Platform, PlatformOptions } from "../types";

export class GithubPlatform implements Platform {
  platformId = "Github";
  path = "github";
  clientId: string = null;
  redirectUri: string = null;

  constructor(options: PlatformOptions = {}) {
    this.clientId = options.clientId as string;
    this.redirectUri = options.redirectUri as string;
  }

  async getOAuthUrl(state: string): Promise<string> {
    const githubUrl = `https://github.com/login/oauth/authorize?client_id=${this.clientId}&redirect_uri=${this.redirectUri}&state=${state}`;
    console.log("geri GithubPlatform getOAuthUrl ", githubUrl);
    return githubUrl;
  }
}
