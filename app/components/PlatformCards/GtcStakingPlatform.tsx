// --- Methods
import React, { useContext, useEffect, useState, useMemo } from "react";

// --- Datadog
import { datadogLogs } from "@datadog/browser-logs";

// --- Identity tools
import {
  Stamp,
  PLATFORM_ID,
  PROVIDER_ID,
  VerifiableCredential,
  CredentialResponseBody,
  VerifiableCredentialRecord,
} from "@gitcoin/passport-types";
import { fetchVerifiableCredential } from "@gitcoin/passport-identity/dist/commonjs/src/credentials";

// --- Style Components
import { SideBarContent } from "../SideBarContent";
import { DoneToastContent } from "../DoneToastContent";
import { useToast } from "@chakra-ui/react";

// --- Context
import { CeramicContext } from "../../context/ceramicContext";
import { UserContext } from "../../context/userContext";

// --- Platform definitions
import { getPlatformSpec } from "../../config/platforms";
import { STAMP_PROVIDERS } from "../../config/providers";

const iamUrl = process.env.NEXT_PUBLIC_PASSPORT_IAM_URL || "";

// Each provider is recognised by its ID
const platformId: PLATFORM_ID = "GtcStaking";

export default function GtcStakingPlatform(): JSX.Element {
  const { address, signer } = useContext(UserContext);
  const { handleAddStamps, allProvidersState } = useContext(CeramicContext);
  const [isLoading, setLoading] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);

  // --- Chakra functions
  const toast = useToast();

  // find all providerIds
  const providerIds = useMemo(
    () =>
      STAMP_PROVIDERS[platformId]?.reduce((all, stamp) => {
        return all.concat(stamp.providers?.map((provider) => provider.name as PROVIDER_ID));
      }, [] as PROVIDER_ID[]) || [],
    []
  );

  // SelectedProviders will be passed in to the sidebar to be filled there...
  const [verifiedProviders, setVerifiedProviders] = useState<PROVIDER_ID[]>(
    providerIds.filter((providerId) => typeof allProvidersState[providerId]?.stamp?.credential !== "undefined")
  );
  // SelectedProviders will be passed in to the sidebar to be filled there...
  const [selectedProviders, setSelectedProviders] = useState<PROVIDER_ID[]>([...verifiedProviders]);

  // any time we change selection state...
  useEffect(() => {
    if (selectedProviders.length !== verifiedProviders.length) {
      setCanSubmit(true);
    }
    if (selectedProviders.length === 0) {
      setCanSubmit(false);
    }
  }, [selectedProviders, verifiedProviders]);

  // fetch VCs from IAM server
  const handleFetchCredential = (): void => {
    datadogLogs.logger.info("Saving Stamp", { platform: platformId });
    setLoading(true);
    fetchVerifiableCredential(
      iamUrl,
      {
        type: platformId,
        types: selectedProviders,
        version: "0.0.0",
        address: address || "",
        proofs: {},
      },
      signer as { signMessage: (message: string) => Promise<string> }
    )
      .then(async (verified: VerifiableCredentialRecord): Promise<void> => {
        // because we provided a types array in the params we expect to receive a
        // credentials array in the response...
        const vcs =
          verified.credentials
            ?.map((cred: CredentialResponseBody): Stamp | undefined => {
              if (!cred.error) {
                // add each of the requested/received stamps to the passport...
                return {
                  provider: cred.record?.type as PROVIDER_ID,
                  credential: cred.credential as VerifiableCredential,
                };
              }
            })
            .filter((v: Stamp | undefined) => v) || [];
        // Add all the stamps to the passport at once
        await handleAddStamps(vcs as Stamp[]);
        datadogLogs.logger.info("Successfully saved Stamp", { platform: platformId });
        // grab all providers who are verified from the verify response
        const actualVerifiedProviders = providerIds.filter(
          (providerId) =>
            !!vcs.find((vc: Stamp | undefined) => vc?.credential?.credentialSubject?.provider === providerId)
        );
        // both verified and selected should look the same after save
        setVerifiedProviders([...actualVerifiedProviders]);
        setSelectedProviders([...actualVerifiedProviders]);
        // reset can submit state
        setCanSubmit(false);
        // Custom Success Toast
        toast({
          duration: 5000,
          isClosable: true,
          render: (result: any) => <DoneToastContent platformId={platformId} result={result} />,
        });
      })
      .catch((e) => {
        datadogLogs.logger.error("Verification Error", { error: e, platform: platformId });
        throw e;
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <SideBarContent
      currentPlatform={getPlatformSpec(platformId)}
      currentProviders={STAMP_PROVIDERS[platformId]}
      verifiedProviders={verifiedProviders}
      selectedProviders={selectedProviders}
      setSelectedProviders={setSelectedProviders}
      isLoading={isLoading}
      verifyButton={
        <button
          disabled={!canSubmit}
          onClick={handleFetchCredential}
          data-testid="button-verify-gtcstaking"
          className="sidebar-verify-btn"
        >
          Verify
        </button>
      }
      infoElement={
        <div className="p-4">
          <div className="mt-10 rounded-lg border border-purple-infoElementBorder bg-purple-infoElementBG px-4 py-6">
            <div className="flex flex-row items-center">
              <h2 className="text-md mb-0 text-left font-bold text-gray-900">
                Stake your GTC on the new Identity Staking site.
              </h2>
            </div>

            <div className="mt-4 flex-grow">
              <p className="text-left text-base leading-relaxed">
                Defend against sybil by staking on your own identity or sombody else’s. By staking, the profile of
                stamps in the Passport becomes more unique.
              </p>
              <div className="border-divider mt-3 border-t">
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://staking.passport.gitcoin.co"
                  className="mx-auto mt-3 flex justify-center text-indigo-500"
                >
                  Go to Identity Staking
                </a>
              </div>
            </div>
          </div>
        </div>
      }
    />
  );
}
