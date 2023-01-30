import { render, waitFor, screen, act } from "@testing-library/react";
import * as framework from "@self.id/framework";
import { useContext, useEffect, useState } from "react";
import { mockWallet } from "../../__test-fixtures__/onboardHookValues";
import { makeTestCeramicContext } from "../../__test-fixtures__/contextTestHelpers";

import { UserContext, UserContextProvider } from "../../context/userContext";
import { CeramicContext } from "../../context/ceramicContext";

jest.mock("../../utils/onboard.ts");

jest.mock("@web3-onboard/react", () => ({
  useConnectWallet: () => [{ wallet: mockWallet }, jest.fn(), jest.fn()],
}));

jest.mock("@didtools/pkh-ethereum", () => {
  return {
    EthereumWebAuth: {
      getAuthMethod: jest.fn(),
    },
  };
});

jest.mock("@self.id/web", () => {
  return {
    EthereumAuthProvider: jest.fn(),
  };
});

jest.mock("@self.id/framework", () => {
  return {
    useViewerConnection: jest.fn(),
  };
});

const localStorageMock = (function () {
  let store: any = {};

  return {
    getItem(key: any) {
      return store[key];
    },

    setItem(key: any, value: any) {
      store[key] = value;
    },

    clear() {
      store = {};
    },

    removeItem(key: any) {
      delete store[key];
    },

    getAll() {
      return store;
    },
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

const TestingComponent = () => {
  const { wallet } = useContext(UserContext);
  const [session, setSession] = useState("");

  useEffect(() => {
    setSession(localStorage.getItem("didsession-0xmyAddress") ?? "");
  });

  return <div data-testid="session-id">{session}</div>;
};

const mockCeramicContext = makeTestCeramicContext({
  passport: {
    issuanceDate: new Date(),
    expiryDate: new Date(),
    stamps: [],
  },
});

describe("<UserContext>", () => {
  it.skip("should delete localStorage item if session has expired", async () => {
    const ceramicConnect = jest.fn().mockResolvedValueOnce({
      client: {
        session: {
          isExpired: true,
          expireInSecs: 3500,
        },
      },
    });
    (framework.useViewerConnection as jest.Mock).mockReturnValue([{ status: "connected" }, ceramicConnect, jest.fn()]);

    localStorageMock.setItem("didsession-0xmyAddress", "eyJzZXNzaW9uS2V5U2VlZCI6IlF5cTN4aW9ubGxD...");

    act(() => {
      render(
        <UserContextProvider>
          <CeramicContext.Provider value={mockCeramicContext}>
            <TestingComponent />
          </CeramicContext.Provider>
        </UserContextProvider>
      );
    });

    expect(screen.getByTestId("session-id")).toHaveTextContent("eyJzZXNzaW9uS2V5U2VlZCI6IlF5cTN4aW9ubGxD...");

    await waitFor(() => expect(screen.getByTestId("session-id")).toHaveTextContent(""));
  });
});
