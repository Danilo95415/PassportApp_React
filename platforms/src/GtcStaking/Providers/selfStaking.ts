// ----- Types
import type { Provider, ProviderOptions } from "../../types";
import type { RequestPayload, VerifiedPayload } from "@gitcoin/passport-types";

// ----- Ethers library
import { utils } from "ethers";

// ----- Libs
import axios from "axios";

// List of subgraphs to check
export const stakingSubgraph = `https://gateway.thegraph.com/api/${process.env.GTC_STAKING_GRAPH_API_KEY}/subgraphs/id/6neBRm8wdXfbH9WQuFeizJRpsom4qovuqKhswPBRTC5Q`;

type StakeResponse = {
  stakeAmount?: number;
  address?: string;
};

// Defining interfaces for the data structure returned by the subgraph
interface Round {
  id: string;
}

interface Stake {
  round: Round;
  stake: string;
}

interface StakeArray {
  stakes: Array<Stake>;
}

interface UsersArray {
  address: string;
  users: Array<StakeArray>;
}

interface StakeData {
  data: UsersArray;
}

export interface DataResult {
  data: StakeData;
}

async function verifyStake(payload: RequestPayload): Promise<StakeResponse> {
  const round = process.env.GTC_STAKING_ROUND || "1";
  const address = payload.address.toLowerCase();
  const result = await axios.post(stakingSubgraph, {
    query: `
    {
      users(where: {address: "${address}"}) {
        address,
        stakes(where: {round: "${round}"}) {
          stake
          round {
            id
          }
        }
      }
    }
      `,
  });

  const r = result as DataResult;
  const response: StakeResponse = {
    address: address,
    stakeAmount: 0,
  };
  // Array of self stakes on the user
  const stake = r?.data?.data?.users[0]?.stakes[0]?.stake;
  if (!stake) {
    return response;
  }
  const stakeAmountFormatted: string = utils.formatUnits(stake.toString(), 18);
  return {
    stakeAmount: parseFloat(stakeAmountFormatted),
    address: address,
  };
}

// Export a Self Staking Bronze Stamp provider
// User's self stake must be greater than 5 GTC
export class SelfStakingBronzeProvider implements Provider {
  // Give the provider a type so that we can select it with a payload
  type = "SelfStakingBronze";
  // Options can be set here and/or via the constructor
  _options = {};

  // construct the provider instance with supplied options
  constructor(options: ProviderOptions = {}) {
    this._options = { ...this._options, ...options };
  }

  // verify that the proof object contains valid === "true"
  async verify(payload: RequestPayload): Promise<VerifiedPayload> {
    let valid = false;
    try {
      const stakeData = await verifyStake(payload);
      const stakeAmount = stakeData.stakeAmount;

      valid = stakeAmount >= 5.0;

      return {
        valid,
        record: valid
          ? {
              address: payload.address,
              // ssgt5 = Self staking greater than or equal to 5
              stakeAmount: "ssgte5",
            }
          : {},
      };
    } catch (e) {
      return {
        valid: false,
        error: ["Self Staking Bronze Provider verifyStake Error"],
      };
    }
  }
}

// Export a Self Staking Silver Stamp provider
// User's self stake must be greater than or equal to 20 GTC
export class SelfStakingSilverProvider implements Provider {
  // Give the provider a type so that we can select it with a payload
  type = "SelfStakingSilver";
  // Options can be set here and/or via the constructor
  _options = {};

  // construct the provider instance with supplied options
  constructor(options: ProviderOptions = {}) {
    this._options = { ...this._options, ...options };
  }

  // verify that the proof object contains valid === "true"
  async verify(payload: RequestPayload): Promise<VerifiedPayload> {
    let valid = false;
    try {
      const stakeData = await verifyStake(payload);
      const stakeAmount = stakeData.stakeAmount;

      valid = stakeAmount >= 20.0;

      return {
        valid,
        record: valid
          ? {
              address: payload.address,
              // ssgt20 = Self staking greater than or equal 20
              stakeAmount: "ssgte20",
            }
          : {},
      };
    } catch (e) {
      return {
        valid: false,
        error: ["Self Staking Silver Provider verifyStake Error"],
      };
    }
  }
}

// Export a Self Staking Gold Stamp provider
// User's self stake must be greater than or equal to 125 GTC
export class SelfStakingGoldProvider implements Provider {
  // Give the provider a type so that we can select it with a payload
  type = "SelfStakingGold";
  // Options can be set here and/or via the constructor
  _options = {};

  // construct the provider instance with supplied options
  constructor(options: ProviderOptions = {}) {
    this._options = { ...this._options, ...options };
  }

  // verify that the proof object contains valid === "true"
  async verify(payload: RequestPayload): Promise<VerifiedPayload> {
    let valid = false;
    try {
      const stakeData = await verifyStake(payload);
      const stakeAmount = stakeData.stakeAmount;

      valid = stakeAmount >= 125.0;

      return {
        valid,
        record: valid
          ? {
              address: payload.address,
              // ssgt125 = Self staking greater than or equal to 125
              stakeAmount: "ssgte125",
            }
          : {},
      };
    } catch (e) {
      return {
        valid: false,
        error: ["Self Staking Gold Provider verifyStake Error"],
      };
    }
  }
}
