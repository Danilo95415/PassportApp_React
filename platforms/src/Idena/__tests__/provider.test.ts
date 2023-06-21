/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/require-await */

import { ProviderContext, RequestPayload } from "@gitcoin/passport-types";
import { IdenaAge10Provider, IdenaAge5Provider } from "../Providers/IdenaAgeProvider";
import { IdenaContext } from "../procedures/idenaSignIn";
import { initCacheSession, loadCacheSession } from "../../utils/cache";
import {
  IdenaStateHumanProvider,
  IdenaStateNewbieProvider,
  IdenaStateVerifiedProvider,
} from "../Providers/IdenaStateProvider";
import { IdenaStake100kProvider, IdenaStake10kProvider, IdenaStake1kProvider } from "../Providers/IdenaStakeProvider";

// ----- Libs
import axios from "axios";

jest.mock("axios");

const mockedAxios = axios as jest.Mocked<typeof axios>;

const MOCK_ADDRESS = "0x5867b46bd12769e0b7522a5b64acd7c1eacb183a";
const MOCK_SESSION_KEY = "sessionKey";

const ageResponse = {
  data: { result: 7 },
  status: 200,
};

const identityResponse = {
  data: { result: { state: "Human" } },
  status: 200,
};

const addressResponse = {
  data: { result: { stake: "105000.123" } },
  status: 200,
};

const lastEpochResponse = {
  data: {
    result: {
      validationTime: "2023-01-02T00:00:01Z",
    },
  },
  status: 200,
};

type IdenaCache = {
  address?: string;
  signature?: string;
};

beforeAll(() => {
  jest.useFakeTimers("modern");
  jest.setSystemTime(new Date(Date.UTC(2023, 0, 1)));
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  initCacheSession(MOCK_SESSION_KEY);
  const session: IdenaCache = loadCacheSession(MOCK_SESSION_KEY, "Idena");
  session.address = MOCK_ADDRESS;
  session.signature = "signature";

  mockedAxios.get.mockImplementation(async (url, config) => {
    switch (url) {
      case `/api/identity/${MOCK_ADDRESS}/age`:
        return ageResponse;
      case `/api/identity/${MOCK_ADDRESS}`:
        return identityResponse;
      case `/api/address/${MOCK_ADDRESS}`:
        return addressResponse;
      case "/api/epoch/last":
        return lastEpochResponse;
    }
  });

  mockedAxios.create = jest.fn(() => mockedAxios);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("Attempt verification", function () {
  it("should return valid response", async () => {
    const provider = new IdenaAge5Provider();
    const payload = {
      proofs: {
        sessionKey: MOCK_SESSION_KEY,
      },
    };
    const verifiedPayload = await provider.verify(payload as unknown as RequestPayload, {} as IdenaContext);

    expect(mockedAxios.get).toBeCalledTimes(2);
    expect(mockedAxios.get).toBeCalledWith(`/api/identity/${MOCK_ADDRESS}/age`);
    expect(mockedAxios.get).toBeCalledWith("/api/epoch/last");
    expect(verifiedPayload).toEqual({
      valid: true,
      record: {
        address: MOCK_ADDRESS,
        age: "gt5",
      },
      expiresInSeconds: 86401,
    });
  });

  it("should return false for low age", async () => {
    const provider = new IdenaAge10Provider();
    const payload = {
      proofs: {
        sessionKey: MOCK_SESSION_KEY,
      },
    };
    const verifiedPayload = await provider.verify(payload as unknown as RequestPayload, {} as IdenaContext);

    expect(mockedAxios.get).toBeCalledTimes(2);
    expect(mockedAxios.get).toBeCalledWith(`/api/identity/${MOCK_ADDRESS}/age`);
    expect(mockedAxios.get).toBeCalledWith("/api/epoch/last");
    expect(verifiedPayload).toEqual({
      valid: false,
    });
  });

  it("should return false for wrong sessionKey", async () => {
    const provider = new IdenaAge5Provider();
    const payload = {
      proofs: {
        sessionKey: "sessionKey_wrong",
      },
    };
    const verifiedPayload = await provider.verify(payload as unknown as RequestPayload, {} as IdenaContext);
    expect(mockedAxios.get).toBeCalledTimes(0);
    expect(verifiedPayload).toEqual({
      valid: false,
    });
  });

  it("should return false when the Idena API returns wrong response", async () => {
    mockedAxios.get.mockImplementation(async (url, config) => {
      throw new Error("error");
    });
    const provider = new IdenaAge5Provider();
    const payload = {
      proofs: {
        sessionKey: MOCK_SESSION_KEY,
      },
    };
    const verifiedPayload = await provider.verify(payload as unknown as RequestPayload, {} as IdenaContext);
    expect(mockedAxios.get).toBeCalledTimes(1);
    expect(mockedAxios.get).toBeCalledWith(`/api/identity/${MOCK_ADDRESS}/age`);
    expect(verifiedPayload).toEqual({
      valid: false,
    });
  });

  it("shouldn't duplicate requests to the Idena API within the same context", async () => {
    const provider1 = new IdenaAge5Provider();
    const provider2 = new IdenaAge10Provider();
    const context: ProviderContext = {};
    const payload = {
      proofs: {
        sessionKey: MOCK_SESSION_KEY,
      },
    };
    await provider1.verify(payload as unknown as RequestPayload, context as IdenaContext);
    await provider2.verify(payload as unknown as RequestPayload, context as IdenaContext);

    expect(mockedAxios.get).toBeCalledTimes(2);
    expect(mockedAxios.get).toBeCalledWith(`/api/identity/${MOCK_ADDRESS}/age`);
    expect(mockedAxios.get).toBeCalledWith("/api/epoch/last");
  });
});

describe("Check valid cases for state providers", function () {
  it("Expected Human state", async () => {
    const provider = new IdenaStateHumanProvider();
    const payload = {
      proofs: {
        sessionKey: MOCK_SESSION_KEY,
      },
    };
    const verifiedPayload = await provider.verify(payload as unknown as RequestPayload, {} as IdenaContext);

    expect(verifiedPayload).toEqual({
      valid: true,
      record: {
        address: MOCK_ADDRESS,
        state: "Human",
      },
      expiresInSeconds: 86401,
    });
  });

  it("Expected Newbie state", async () => {
    identityResponse.data.result.state = "Newbie";
    const provider = new IdenaStateNewbieProvider();
    const payload = {
      proofs: {
        sessionKey: MOCK_SESSION_KEY,
      },
    };
    const verifiedPayload = await provider.verify(payload as unknown as RequestPayload, {} as IdenaContext);

    expect(verifiedPayload).toEqual({
      valid: true,
      record: {
        address: MOCK_ADDRESS,
        state: "Newbie",
      },
      expiresInSeconds: 86401,
    });
  });

  it("Expected Verified state", async () => {
    identityResponse.data.result.state = "Verified";
    const provider = new IdenaStateVerifiedProvider();
    const payload = {
      proofs: {
        sessionKey: MOCK_SESSION_KEY,
      },
    };
    const verifiedPayload = await provider.verify(payload as unknown as RequestPayload, {} as IdenaContext);

    expect(verifiedPayload).toEqual({
      valid: true,
      record: {
        address: MOCK_ADDRESS,
        state: "Verified",
      },
      expiresInSeconds: 86401,
    });
  });
});

describe("Check valid cases for stake balance providers", function () {
  it("Expected Greater than 1k iDna", async () => {
    const provider = new IdenaStake1kProvider();
    const payload = {
      proofs: {
        sessionKey: MOCK_SESSION_KEY,
      },
    };
    const verifiedPayload = await provider.verify(payload as unknown as RequestPayload, {} as IdenaContext);

    expect(verifiedPayload).toEqual({
      valid: true,
      record: {
        address: MOCK_ADDRESS,
        stake: "gt1",
      },
      expiresInSeconds: 86401,
    });
  });

  it("Expected Greater than 10k iDna", async () => {
    const provider = new IdenaStake10kProvider();
    const payload = {
      proofs: {
        sessionKey: MOCK_SESSION_KEY,
      },
    };
    const verifiedPayload = await provider.verify(payload as unknown as RequestPayload, {} as IdenaContext);

    expect(verifiedPayload).toEqual({
      valid: true,
      record: {
        address: MOCK_ADDRESS,
        stake: "gt10",
      },
      expiresInSeconds: 86401,
    });
  });

  it("Expected Greater than 100k iDna", async () => {
    const provider = new IdenaStake100kProvider();
    const payload = {
      proofs: {
        sessionKey: MOCK_SESSION_KEY,
      },
    };
    const verifiedPayload = await provider.verify(payload as unknown as RequestPayload, {} as IdenaContext);

    expect(verifiedPayload).toEqual({
      valid: true,
      record: {
        address: MOCK_ADDRESS,
        stake: "gt100",
      },
      expiresInSeconds: 86401,
    });
  });
});
