// TODO remove once tsconfig as unified across all packages
/* eslint-disable @typescript-eslint/unbound-method */
import { RequestPayload } from "@gitcoin/passport-types";

// ----- Libs
import axios from "axios";
import { zkSyncApiEndpoint, ZkSyncProvider } from "../Providers/zkSync";

jest.mock("axios");

const mockedAxios = axios as jest.Mocked<typeof axios>;
const MOCK_ADDRESS = "0xcF314CE817E25b4F784bC1f24c9A79A525fEC50f";
const MOCK_ADDRESS_LOWER = MOCK_ADDRESS.toLocaleLowerCase();
const BAD_ADDRESS = "0xsieh2863426gsaa";

const validResponseList = [
  {
    txHash: "0xsome_hash",
    op: {
      from: MOCK_ADDRESS_LOWER,
    },
    status: "pending",
  },
  {
    txHash: "0xsome_hash",
    op: {
      from: MOCK_ADDRESS_LOWER,
    },
    status: "pending",
  },
  {
    txHash: "0xsome_hash",
    op: {
      from: MOCK_ADDRESS_LOWER,
    },
    status: "pending",
  },
  {
    txHash: "0xsome_hash",
    op: {
      from: MOCK_ADDRESS_LOWER,
    },
    status: "finalized",
  },
];

const inValidResponseListAddressNotInFromField = [
  {
    txHash: "0xsome_hash",
    op: {
      from: BAD_ADDRESS,
    },
    status: "pending",
  },
  {
    txHash: "0xsome_hash",
    op: {
      from: BAD_ADDRESS,
    },
    status: "pending",
  },
  {
    txHash: "0xsome_hash",
    op: {
      from: BAD_ADDRESS,
    },
    status: "pending",
  },
  {
    txHash: "0xsome_hash",
    op: {
      from: BAD_ADDRESS,
    },
    status: "finalized",
  },
];

const inValidResponseListNoFinalizedTransaction = [
  {
    txHash: "0xsome_hash",
    op: {
      from: MOCK_ADDRESS_LOWER,
    },
    status: "pending",
  },
  {
    txHash: "0xsome_hash",
    op: {
      from: MOCK_ADDRESS_LOWER,
    },
    status: "pending",
  },
  {
    txHash: "0xsome_hash",
    op: {
      from: MOCK_ADDRESS_LOWER,
    },
    status: "pending",
  },
  {
    txHash: "0xsome_hash",
    op: {
      from: MOCK_ADDRESS_LOWER,
    },
    status: "pending",
  },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Verification succeeds", function () {
  it("when valid response is received from the zksync API endpoint", async () => {
    (axios.get as jest.Mock).mockImplementation(() => {
      return Promise.resolve({
        status: 200,
        data: {
          result: { list: validResponseList },
          status: "success",
        },
      });
    });

    const zkSyncProvider = new ZkSyncProvider();
    const zkSyncPayload = await zkSyncProvider.verify({
      address: MOCK_ADDRESS,
    } as unknown as RequestPayload);

    // Check the request to get the transactions
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toBeCalledWith(`${zkSyncApiEndpoint}accounts/${MOCK_ADDRESS_LOWER}/transactions`, {
      params: {
        from: "latest",
        limit: 100,
        direction: "older",
      },
    });

    expect(zkSyncPayload).toEqual({
      valid: true,
      record: {
        address: MOCK_ADDRESS_LOWER,
      },
    });
  });
});

describe("Verification fails", function () {
  it("when the response list does not contain any transaction initiated by the address we verify (address is not in from field)", async () => {
    (axios.get as jest.Mock).mockImplementation(() => {
      return Promise.resolve({
        status: 200,
        data: {
          result: { list: inValidResponseListAddressNotInFromField },
          status: "success",
        },
      });
    });

    const zkSyncProvider = new ZkSyncProvider();
    const zkSyncPayload = await zkSyncProvider.verify({
      address: MOCK_ADDRESS,
    } as unknown as RequestPayload);

    // Check the request to get the transactions
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toBeCalledWith(`${zkSyncApiEndpoint}accounts/${MOCK_ADDRESS_LOWER}/transactions`, {
      params: {
        from: "latest",
        limit: 100,
        direction: "older",
      },
    });

    expect(zkSyncPayload).toEqual({
      valid: false,
      error: ["Unable to find a finalized transaction from the given address"],
    });
  });

  it("when the response list does not contain any finalized transactions", async () => {
    (axios.get as jest.Mock).mockImplementation(() => {
      return Promise.resolve({
        status: 200,
        data: {
          result: { list: inValidResponseListNoFinalizedTransaction },
          status: "success",
        },
      });
    });

    const zkSyncProvider = new ZkSyncProvider();
    const zkSyncPayload = await zkSyncProvider.verify({
      address: MOCK_ADDRESS,
    } as unknown as RequestPayload);

    // Check the request to get the transactions
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toBeCalledWith(`${zkSyncApiEndpoint}accounts/${MOCK_ADDRESS_LOWER}/transactions`, {
      params: {
        from: "latest",
        limit: 100,
        direction: "older",
      },
    });

    expect(zkSyncPayload).toEqual({
      valid: false,
      error: ["Unable to find a finalized transaction from the given address"],
    });
  });

  it("when the API response is not with status='success'", async () => {
    (axios.get as jest.Mock).mockImplementation(() => {
      return Promise.resolve({
        status: 200,
        data: {
          result: { list: validResponseList },
          status: "error",
          error: "some kind of error",
        },
      });
    });

    const zkSyncProvider = new ZkSyncProvider();
    const zkSyncPayload = await zkSyncProvider.verify({
      address: MOCK_ADDRESS,
    } as unknown as RequestPayload);

    // Check the request to get the transactions
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toBeCalledWith(`${zkSyncApiEndpoint}accounts/${MOCK_ADDRESS_LOWER}/transactions`, {
      params: {
        from: "latest",
        limit: 100,
        direction: "older",
      },
    });

    expect(zkSyncPayload).toEqual({
      valid: false,
      error: ["ZKSync API Error 'error'. Details: 'some kind of error'."],
    });
  });

  it("when the HTTP status code is not 200", async () => {
    (axios.get as jest.Mock).mockImplementation(() => {
      return Promise.resolve({
        status: 400,
        statusText: "Bad Request",
        data: {
          result: { list: validResponseList },
          status: "success",
        },
      });
    });

    const zkSyncProvider = new ZkSyncProvider();
    const zkSyncPayload = await zkSyncProvider.verify({
      address: MOCK_ADDRESS,
    } as unknown as RequestPayload);

    // Check the request to get the transactions
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toBeCalledWith(`${zkSyncApiEndpoint}accounts/${MOCK_ADDRESS_LOWER}/transactions`, {
      params: {
        from: "latest",
        limit: 100,
        direction: "older",
      },
    });

    expect(zkSyncPayload).toEqual({
      valid: false,
      error: ["HTTP Error '400'. Details: 'Bad Request'."],
    });
  });

  it("when the HTTP request throws", async () => {
    (axios.get as jest.Mock).mockImplementation(() => {
      throw "something bad happened";
    });

    const zkSyncProvider = new ZkSyncProvider();
    const zkSyncPayload = await zkSyncProvider.verify({
      address: MOCK_ADDRESS,
    } as unknown as RequestPayload);

    // Check the request to get the transactions
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toBeCalledWith(`${zkSyncApiEndpoint}accounts/${MOCK_ADDRESS_LOWER}/transactions`, {
      params: {
        from: "latest",
        limit: 100,
        direction: "older",
      },
    });

    expect(zkSyncPayload).toEqual({
      valid: false,
      error: ["Error getting transaction list for address"],
    });
  });
});
