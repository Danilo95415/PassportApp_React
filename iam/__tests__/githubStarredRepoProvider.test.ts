// ---- Test subject
import { StarredGithubRepoProvider } from "../src/providers/githubStarredRepoProvider";

// ----- Types
import { RequestPayload } from "@gitcoin/passport-types";

// ----- Libs
import axios from "axios";

jest.mock("axios");

const mockedAxios = axios as jest.Mocked<typeof axios>;

const validGithubUserResponse = {
  data: {
    id: "18723656",
    login: "a-cool-user",
    type: "User",
  },
  status: 200,
};

const badUserRepoResponse = {
  data: {
    id: "18723656",
    login: "a-col-user",
    type: "User",
  },
  status: 200,
}

const validGithubUserRepoResponse = {
  data: [
    {
      owner: {
        id: "18723656",
        type: "User",
      },
      stargazers_count: 4
    },
  ],
  status: 200,
};

const validGithubUserRepoResponse1Star = {
  data: [
    {
      owner: {
        id: "18723656",
        type: "User",
      },
      stargazers_count: 1,
      stargazers_url: "https://api.github.com/repos/a-cool-user/a-cool-repo/stargazers",
    },
  ],
  status: 200,
};

const validGithubUserRepoStargazersResponse = {
  data: [
    {
      login: "another-cool-user",
      id: 123456789,
      type: "User",
    },
  ],
  status: 200,
};

const invalidUserRepoResponse = {
  data:
    {
      messgage: "Error"
    },
  status: 500,
};

const invalidResponseSameUserStarred = {
  data: [
    {
      owner: {
        id: "18723656",
        login: "a-cool-user",
        type: "User",
      },
      stargazers_count: 1,
      stargazers_url: "https://api.github.com/repos/a-cool-user/coolest-repo/stargazers"
    },
  ],
  status: 200
};

const validCodeResponse = {
  data: {
    access_token: "762165719dhiqudgasyuqwt6235",
  },
  status: 200,
};

const invalidCodeResponse = {
  data: {
    message: "Error",
  },
  status: 500,
}

const code = "ABC123_ACCESSCODE";

beforeEach(() => {
  jest.clearAllMocks();
  mockedAxios.post.mockImplementation(async (url, data, config) => {
    return validCodeResponse;
  });

  mockedAxios.get.mockImplementation(async (url, config) => {
    if (url.endsWith('/user')) {
      return validGithubUserResponse;
    }
    if (url.endsWith('/repos?per_page=100')) {
      return validGithubUserRepoResponse;
    }
  });
});

describe("Attempt verification", function () {
  it("handles valid verification attempt", async () => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const starredGithubRepoProvider = new StarredGithubRepoProvider();
    const starredGithubRepoProviderPayload = await starredGithubRepoProvider.verify({
      proofs: {
        code,
      },
    } as unknown as RequestPayload);

    // Check the request to get the token for the user
    expect(mockedAxios.post).toBeCalledWith(
      `https://github.com/login/oauth/access_token?client_id=${clientId}&client_secret=${clientSecret}&code=${code}`,
      {},
      {
        headers: { Accept: "application/json" },
      }
    );

    // Check the request to get the user
    expect(mockedAxios.get).toBeCalledWith("https://api.github.com/user", {
      headers: { Authorization: "token 762165719dhiqudgasyuqwt6235" },
    });

    // Check the request to get the repo
    expect(mockedAxios.get).toBeCalledWith(`https://api.github.com/users/${validGithubUserResponse.data.login}/repos?per_page=100`, {
      headers: { Authorization: "token 762165719dhiqudgasyuqwt6235" },
    });

    expect(starredGithubRepoProviderPayload).toEqual({
      valid: true,
      record: {
        id: `${validGithubUserResponse.data.id}gte1Star`,
      },
    });
  });

  it("handles valid verification attempt for user with stars count == 1, that isn't the repo owner", async () => {
    mockedAxios.get.mockImplementation(async (url) => {
      if (url.endsWith("/user")) {
        return validGithubUserResponse;
      }
      if (url.endsWith("/repos?per_page=100")) {
        return validGithubUserRepoResponse1Star;
      }
      if (url.endsWith("/stargazers")) {
        return validGithubUserRepoStargazersResponse;
      }
    });

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const starredGithubRepoProvider = new StarredGithubRepoProvider();

    const starredGithubRepoProviderPayload = await starredGithubRepoProvider.verify({
      proofs: {
        code,
      },
    } as unknown as RequestPayload);

    // Check the request to get the token for the user
    expect(mockedAxios.post).toBeCalledWith(
      `https://github.com/login/oauth/access_token?client_id=${clientId}&client_secret=${clientSecret}&code=${code}`,
      {},
      {
        headers: { Accept: "application/json" },
      }
    );

    // Check the request to get the user
    expect(mockedAxios.get).toBeCalledWith("https://api.github.com/user", {
      headers: { Authorization: "token 762165719dhiqudgasyuqwt6235" },
    });

    // Check the request to get the repo
    expect(mockedAxios.get).toBeCalledWith(`https://api.github.com/users/${validGithubUserResponse.data.login}/repos?per_page=100`, {
      headers: { Authorization: "token 762165719dhiqudgasyuqwt6235" },
    });

    // Check the request to stargazers url
    expect(mockedAxios.get).toBeCalledWith("https://api.github.com/repos/a-cool-user/a-cool-repo/stargazers");

    expect(starredGithubRepoProviderPayload).toEqual({
      valid: true,
      record: {
        id: `${validGithubUserResponse.data.id}gte1Star`,
      },
    });
  });

  it("should return invalid payload when unable to retrieve auth token", async () => {
    mockedAxios.post.mockImplementationOnce(async (url, data, config) => {
      return {
        status: 200,
      };
    });

    const starredGithubRepoProvider = new StarredGithubRepoProvider();

    const starredGithubRepoProviderPayload = await starredGithubRepoProvider.verify({
      proofs: {
        code,
      },
    } as unknown as RequestPayload);

    expect(starredGithubRepoProviderPayload).toMatchObject({ valid: false });
  });

  it("should return invalid payload when there is no id in verifyGithub response", async () => {
    mockedAxios.get.mockImplementation(async (url, config) => {
      return {
        data: {
          id: undefined,
          login: "a-cool-user",
          type: "User",
        },
        status: 200,
      };
    });

    const starredGithubRepoProvider = new StarredGithubRepoProvider();

    const starredGithubRepoProviderPayload = await starredGithubRepoProvider.verify({
      proofs: {
        code,
      },
    } as unknown as RequestPayload);

    expect(starredGithubRepoProviderPayload).toMatchObject({ valid: false });
  });

  it("should return invalid payload when the stargazers count for all repos is less than 1", async () => {
    mockedAxios.get.mockImplementation(async (url, config) => {
      return {
        data: [
          {
            owner: {
              id: "18723656",
              type: "User",
            },
            starred_count: 0
          },
        ],
        status: 200,
      };
    });

    const starredGithubRepoProvider = new StarredGithubRepoProvider();

    const starredGithubRepoProviderPayload = await starredGithubRepoProvider.verify({
      proofs: {
        code,
      },
    } as unknown as RequestPayload);

    expect(starredGithubRepoProviderPayload).toMatchObject({ valid: false });
  });


  it("should return invalid payload when a repo has only one star, and it came from the repo owner", async () => {
    mockedAxios.get.mockImplementation(async (url, config) => {
      return invalidResponseSameUserStarred;
    });

    const starredGithubRepoProvider = new StarredGithubRepoProvider();

    const starredGithubRepoProviderPayload = await starredGithubRepoProvider.verify({
      proofs: {
        code,
      },
    } as unknown as RequestPayload);

    expect(starredGithubRepoProviderPayload).toMatchObject({ valid: false });
  });

  it("should return invalid payload when a bad status code is returned by github user request", async () => {
    mockedAxios.get.mockImplementation(async (url, config) => {
      if (url.endsWith('/user')) {
        return invalidUserRepoResponse;
      }
    });

    const starredGithubRepoProvider = new StarredGithubRepoProvider();

    const starredGithubRepoProviderPayload = await starredGithubRepoProvider.verify({
      proofs: {
        code,
      },
    } as unknown as RequestPayload);

    expect(starredGithubRepoProviderPayload).toMatchObject({ valid: false });
  });

  it("should return invalid payload when a bad status code is returned by github repo request", async () => {
    mockedAxios.get.mockImplementation(async (url, config) => {
      if (url.endsWith('/user')) {
        return badUserRepoResponse;
      }
      if (url.endsWith('/repos?per_page=100')) {
        return {
          status: 500,
        };
        // return invalidUserRepoResponse;
      }
    });

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const starredGithubRepoProvider = new StarredGithubRepoProvider();

    const starredGithubRepoProviderPayload = await starredGithubRepoProvider.verify({
      proofs: {
        code,
      },
    } as unknown as RequestPayload);

    expect(mockedAxios.post).toBeCalledWith(
      `https://github.com/login/oauth/access_token?client_id=${clientId}&client_secret=${clientSecret}&code=${code}`,
      {},
      {
        headers: { Accept: "application/json" },
      }
    );

    // Check the request to get the user
    expect(mockedAxios.get).toBeCalledWith("https://api.github.com/user", {
      headers: { Authorization: "token 762165719dhiqudgasyuqwt6235" },
    });

    // Check the request to get the repo
    expect(mockedAxios.get).toBeCalledWith(`https://api.github.com/users/${badUserRepoResponse.data.login}/repos?per_page=100`, {
      headers: { Authorization: "token 762165719dhiqudgasyuqwt6235" },
    });

    expect(starredGithubRepoProviderPayload).toMatchObject({ valid: false });
  });
});