// ----- Types
import { RequestPayload, VerifiedPayload } from "@gitcoin/passport-types";
import type { Provider } from "../../types";

// ----- Libs
import axios from "axios";

type Claim = {
  id: string;
  creation: string;
  uri: string;
  totalUnits: string;
};

type ClaimToken = {
  id: string;
  owner: string;
  tokenID: string;
  units: string;
  claim: Claim;
};

type ClaimTokensResponse = {
  claimTokens: ClaimToken[];
};

function checkTokenCreation(claimTokens: ClaimToken[]): ClaimToken[] {
  const fifteenDaysAgo = Date.now() - 15 * 24 * 60 * 60 * 1000;
  return claimTokens.filter(({ claim: { creation } }) => Number(creation) * 1000 < fifteenDaysAgo);
}

export class HypercertsProvider implements Provider {
  // Give the provider a type so that we can select it with a payload
  type = "Hypercerts";

  async verify(payload: RequestPayload): Promise<VerifiedPayload> {
    try {
      const url = "https://api.thegraph.com/subgraphs/name/hypercerts-admin/hypercerts-optimism-mainnet";
      const address = payload.address.toLocaleLowerCase();

      const result: {
        data: {
          data: ClaimTokensResponse;
        };
      } = await axios.post(url, {
        query: `
          query ($owner: Bytes) {
            claimTokens(where: {owner: $owner}) {
              id
              owner
              tokenID
              units
              claim {
                id
                creation
                uri
                totalUnits
              }
            }
          }
        `,
        variables: {
          owner: payload.address,
        },
      });

      const { claimTokens } = result.data.data;

      const valid = checkTokenCreation(claimTokens).length > 1;

      return {
        valid: valid,
        record: {
          address,
        },
      };
    } catch (e: any) {
      return {
        valid: false,
        error: ["Self Staking Gold Provider verifyStake Error"],
      };
    }
  }
}
