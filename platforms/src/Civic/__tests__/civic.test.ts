import { RequestPayload } from "@gitcoin/passport-types";
import { CivicPassProvider } from "../Providers/civic";
import { CivicPassLookupPass, CivicPassType, PassesForAddress } from "../Providers/types";
import axios from "axios";

// Mock out all top level functions, such as get, put, delete and post:
jest.mock("axios");

const stubCivic = (passes: PassesForAddress["passes"]): void => {
  (axios.get as jest.Mock).mockResolvedValue({
    data: {
      userAddress: { passes },
    },
  });
};

const stubCivicError = (error: string): void => {
  (axios.get as jest.Mock).mockRejectedValue(new Error(error));
};

const now = Math.floor(Date.now() / 1000);

const userAddress = "0x123";
const requestPayload = { address: userAddress } as RequestPayload;
const expirySeconds = 1000;
const dummyPass = {
  chain: "ETHEREUM_MAINNET",
  expiry: now + expirySeconds,
} as CivicPassLookupPass;

describe("Civic Pass Provider", function () {
  beforeEach(() => {
    // return no passes by default
    stubCivic({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return valid false if no passes are found", async () => {
    const civic = new CivicPassProvider({
      type: "uniqueness",
      passType: CivicPassType.UNIQUENESS,
    });
    const verifiedPayload = await civic.verify(requestPayload);

    expect(verifiedPayload).toMatchObject({
      valid: false,
    });
  });

  it("should return valid true if a pass is found", async () => {
    stubCivic({
      UNIQUENESS: [dummyPass],
    });
    const civic = new CivicPassProvider({
      type: "uniqueness",
      passType: CivicPassType.UNIQUENESS,
    });
    const verifiedPayload = await civic.verify(requestPayload);

    expect(verifiedPayload).toMatchObject({
      valid: true,
    });
  });

  it("should set the expiry equal to the pass expiry", async () => {
    stubCivic({
      UNIQUENESS: [dummyPass],
    });
    const civic = new CivicPassProvider({
      type: "uniqueness",
      passType: CivicPassType.UNIQUENESS,
    });
    const verifiedPayload = await civic.verify(requestPayload);

    const margin = 3;
    expect(verifiedPayload.expiresInSeconds).toBeGreaterThan(expirySeconds - margin);
  });

  it("should populate the error array if an error is thrown while checking any pass", async () => {
    const errorString = "some error";
    stubCivicError(errorString);
    const civic = new CivicPassProvider({
      type: "uniqueness",
      passType: CivicPassType.UNIQUENESS,
    });
    const verifiedPayload = await civic.verify(requestPayload);

    expect(verifiedPayload).toMatchObject({
      valid: false,
      error: [errorString],
    });
  });

  it("should return the pass details if a pass is found", async () => {
    stubCivic({
      UNIQUENESS: [dummyPass],
    });
    const civic = new CivicPassProvider({
      type: "uniqueness",
      passType: CivicPassType.UNIQUENESS,
    });
    const verifiedPayload = await civic.verify(requestPayload);

    expect(verifiedPayload).toMatchObject({
      valid: true,
      record: {},
    });
  });

  it("should return the pass details if a pass is found on any chain", async () => {
    stubCivic({
      UNIQUENESS: [dummyPass, { ...dummyPass, chain: "POLYGON_POS_MAINNET" }],
    });
    const civic = new CivicPassProvider({
      type: "uniqueness",
      passType: CivicPassType.UNIQUENESS,
    });
    const verifiedPayload = await civic.verify(requestPayload);

    expect(verifiedPayload).toMatchObject({
      valid: true,
      record: {},
    });
  });
});
