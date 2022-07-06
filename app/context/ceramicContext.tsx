import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Passport, PROVIDER_ID, Stamp } from "@gitcoin/passport-types";
import { ProviderSpec, STAMP_PROVIDERS } from "../config/providers";
import { CeramicDatabase } from "@gitcoin/passport-database-client";
import { useViewerConnection } from "@self.id/framework";
import { datadogLogs } from "@datadog/browser-logs";
import { datadogRum } from "@datadog/browser-rum";
import { UserContext } from "./userContext";

// -- Trusted IAM servers DID
const IAM_ISSUER_DID = process.env.NEXT_PUBLIC_PASSPORT_IAM_ISSUER_DID || "";

export interface CeramicContextState {
  passport: Passport | undefined | false;
  isLoadingPassport: boolean | undefined;
  allProvidersState: AllProvidersState;
  handleCreatePassport: () => Promise<void>;
  handleAddStamp: (stamp: Stamp) => Promise<void>;
  userDid: string | undefined;
}

export type AllProvidersState = {
  [provider in PROVIDER_ID]?: {
    providerSpec: ProviderSpec;
    stamp?: Stamp;
  };
};

const startingAllProvidersState: AllProvidersState = {
  Google: {
    providerSpec: STAMP_PROVIDERS.Google,
    stamp: undefined,
  },
  Ens: {
    providerSpec: STAMP_PROVIDERS.Ens,
    stamp: undefined,
  },
  Poh: {
    providerSpec: STAMP_PROVIDERS.Poh,
    stamp: undefined,
  },
  Twitter: {
    providerSpec: STAMP_PROVIDERS.Twitter,
    stamp: undefined,
  },
  POAP: {
    providerSpec: STAMP_PROVIDERS.POAP,
    stamp: undefined,
  },
  Facebook: {
    providerSpec: STAMP_PROVIDERS.Facebook,
    stamp: undefined,
  },
  Brightid: {
    providerSpec: STAMP_PROVIDERS.Brightid,
    stamp: undefined,
  },
  Github: {
    providerSpec: STAMP_PROVIDERS.Github,
    stamp: undefined,
  },
};

const startingState: CeramicContextState = {
  passport: undefined,
  isLoadingPassport: true,
  allProvidersState: startingAllProvidersState,
  handleCreatePassport: async () => {},
  handleAddStamp: async () => {},
  userDid: undefined,
};

export const CeramicContext = createContext(startingState);

export const CeramicContextProvider = ({ children }: { children: any }) => {
  const [allProvidersState, setAllProviderState] = useState(startingAllProvidersState);
  const [ceramicDatabase, setCeramicDatabase] = useState<CeramicDatabase | undefined>(undefined);
  const [isLoadingPassport, setIsLoadingPassport] = useState<boolean | undefined>(true);
  const [passport, setPassport] = useState<Passport | undefined>(undefined);
  const [userDid, setUserDid] = useState<string | undefined>();
  const [viewerConnection] = useViewerConnection();

  const { address } = useContext(UserContext);

  useEffect(() => {
    return () => {
      clearAllProvidersState();
      setCeramicDatabase(undefined);
      setPassport(undefined);
      setUserDid(undefined);
    };
  }, [address]);

  useEffect((): void => {
    switch (viewerConnection.status) {
      case "idle": {
        setCeramicDatabase(undefined);
        break;
      }
      case "connected": {
        const ceramicDatabaseInstance = new CeramicDatabase(
          viewerConnection.selfID.did,
          process.env.NEXT_PUBLIC_CERAMIC_CLIENT_URL,
          undefined,
          datadogLogs.logger
        );
        setCeramicDatabase(ceramicDatabaseInstance);
        setUserDid(ceramicDatabaseInstance.did);
        break;
      }
      case "failed": {
        console.log("failed to connect self id :(");
        setCeramicDatabase(undefined);
        break;
      }
      default:
        break;
    }
  }, [viewerConnection.status]);

  useEffect(() => {
    if (ceramicDatabase) {
      fetchPassport(ceramicDatabase);
    }
  }, [ceramicDatabase]);

  const fetchPassport = async (database: CeramicDatabase): Promise<void> => {
    setIsLoadingPassport(true);
    // fetch, clean and set the new Passport state
    let passport = (await database.getPassport()) as Passport;
    if (passport) {
      passport = cleanPassport(passport, database) as Passport;
      hydrateAllProvidersState(passport);
      setPassport(passport);
      setIsLoadingPassport(false);
    } else if (passport === false) {
      handleCreatePassport();
    } else {
      // something is wrong with Ceramic...
      datadogRum.addError("Ceramic connection failed", { address });
      setPassport(passport);
      // TODO use more expressive loading states
      setIsLoadingPassport(undefined);
    }
  };

  const cleanPassport = (
    passport: Passport | undefined | false,
    database: CeramicDatabase
  ): Passport | undefined | false => {
    // clean stamp content if expired or from a different issuer
    if (passport) {
      passport.stamps = passport.stamps.filter((stamp: Stamp) => {
        const has_expired = new Date(stamp.credential.expirationDate) < new Date();
        const has_correct_issuer = stamp.credential.issuer === IAM_ISSUER_DID;
        const has_correct_subject = stamp.credential.credentialSubject.id.toLowerCase() === database.did;

        return !has_expired && has_correct_issuer && has_correct_subject;
      });
    }

    return passport;
  };

  const handleCreatePassport = async (): Promise<void> => {
    if (ceramicDatabase) {
      await ceramicDatabase.createPassport();
      await fetchPassport(ceramicDatabase);
    }
  };

  const handleAddStamp = async (stamp: Stamp): Promise<void> => {
    if (ceramicDatabase) {
      await ceramicDatabase.addStamp(stamp);
      await fetchPassport(ceramicDatabase);
    }
  };

  const hydrateAllProvidersState = (passport?: Passport) => {
    if (passport) {
      // set stamps into allProvidersState
      passport.stamps.forEach((stamp: Stamp) => {
        const { provider } = stamp;
        const providerState = allProvidersState[provider];
        if (providerState) {
          const newProviderState = {
            providerSpec: providerState.providerSpec,
            stamp,
          };
          setAllProviderState((prevState) => ({
            ...prevState,
            [provider]: newProviderState,
          }));
        }
      });
    } else {
      clearAllProvidersState();
    }
  };

  const clearAllProvidersState = () => {
    setAllProviderState(startingAllProvidersState);
  };

  const stateMemo = useMemo(
    () => ({
      passport,
      isLoadingPassport,
      allProvidersState,
      handleCreatePassport,
      handleAddStamp,
      userDid,
    }),
    [passport, isLoadingPassport]
  );

  const providerProps = {
    passport,
    isLoadingPassport,
    allProvidersState,
    handleCreatePassport,
    handleAddStamp,
    userDid,
  };

  return <CeramicContext.Provider value={providerProps}>{children}</CeramicContext.Provider>;
};
