// ----- Types
import type { Provider, ProviderOptions } from "../../types";
import type { RequestPayload, VerifiedPayload } from "@gitcoin/passport-types";

// ----- Libs
import axios from "axios";
import { utils } from "ethers";

// ----- Credential verification
import { getAddress } from "../../utils/signer";

// https://safe-transaction.gnosis.io/
export const gnosisSafeApiEndpoint = "https://safe-transaction-mainnet.safe.global/api/v1/";

type OwnerSafesResponse = {
  safes: string[];
};

// Export a GnosisSafeProvider Provider
export class GnosisSafeProvider implements Provider {
  // Give the provider a type so that we can select it with a payload
  type = "GnosisSafe";

  // Options can be set here and/or via the constructor
  _options = {};

  // construct the provider instance with supplied options
  constructor(options: ProviderOptions = {}) {
    this._options = { ...this._options, ...options };
  }

  // Verify that address defined in the payload has at least 1 finalized transactioin
  async verify(payload: RequestPayload): Promise<VerifiedPayload> {
    // if a signer is provider we will use that address to verify against
    let valid = false;
    const error = [];

    // Get the address. Note: this is expected to be a checksumed address (this is what the gnosis safe API expects)
    const address = utils.getAddress(await getAddress(payload));

    // Check if address is owner of at least 1 safe
    try {
      const ownerSafes = await getSafes(address);
      valid = !!ownerSafes.safes && ownerSafes.safes.length >= 1;
    } catch (exc) {
      error.push((exc as unknown).toString());
    }

    if (!valid && error.length === 0) {
      error.push("Unable to find any safes owned by the given address");
    }

    return Promise.resolve({
      valid: valid,
      record: valid
        ? {
            address: address,
          }
        : undefined,
      error: error.length ? error : undefined,
    });
  }
}

const getSafes = async (address: string): Promise<OwnerSafesResponse> => {
  const requestResponse = await axios.get(`${gnosisSafeApiEndpoint}owners/${address}/safes/`);

  if (requestResponse.status != 200) {
    throw [`HTTP Error '${requestResponse.status}'. Details: '${requestResponse.statusText}'.`];
  }

  return requestResponse.data as OwnerSafesResponse;
};
