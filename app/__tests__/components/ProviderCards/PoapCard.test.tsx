import React from "react";
import { render, screen, fireEvent, waitFor, waitForElementToBeRemoved } from "@testing-library/react";
import { PoapCard } from "../../../components/ProviderCards";

import { UserContext, UserContextState } from "../../../context/userContext";
import { mockAddress, mockWallet } from "../../../__test-fixtures__/onboardHookValues";
import { STAMP_PROVIDERS } from "../../../config/providers";
import { poapStampFixture } from "../../../__test-fixtures__/databaseStorageFixtures";
import { SUCCESFUL_POAP_RESULT } from "../../../__test-fixtures__/verifiableCredentialResults";
import { fetchVerifiableCredential } from "@gitcoin/passport-identity";

jest.mock("@gitcoin/passport-identity", () => ({
  fetchVerifiableCredential: jest.fn(),
}));
jest.mock("../../../utils/onboard.ts");

const mockHandleConnection = jest.fn();
const mockCreatePassport = jest.fn();
const handleAddStamp = jest.fn().mockResolvedValue(undefined);
const mockUserContext: UserContextState = {
  userDid: undefined,
  loggedIn: true,
  passport: {
    issuanceDate: new Date(),
    expiryDate: new Date(),
    stamps: [],
  },
  isLoadingPassport: false,
  allProvidersState: {
    POAP: {
      providerSpec: STAMP_PROVIDERS.POAP,
      stamp: undefined,
    },
  },
  handleAddStamp: handleAddStamp,
  handleCreatePassport: mockCreatePassport,
  handleConnection: mockHandleConnection,
  address: mockAddress,
  wallet: mockWallet,
  signer: undefined,
  walletLabel: mockWallet.label,
};

describe("when user has not veirfied with PoapProvider", () => {
  it("should display a verification button", () => {
    render(
      <UserContext.Provider value={mockUserContext}>
        <PoapCard />
      </UserContext.Provider>
    );

    const initialVerifyButton = screen.queryByTestId("button-verify-poap");

    expect(initialVerifyButton).toBeInTheDocument();
  });
});

describe("when user has verified with PoapProvider", () => {
  it("should display that POAP is verified", () => {
    render(
      <UserContext.Provider
        value={{
          ...mockUserContext,
          allProvidersState: {
            POAP: {
              providerSpec: STAMP_PROVIDERS.POAP,
              stamp: poapStampFixture,
            },
          },
        }}
      >
        <PoapCard />
      </UserContext.Provider>
    );

    const poapVerified = screen.queryByText(/Verified/);

    expect(poapVerified).toBeInTheDocument();
  });
});

describe("when the verify button is clicked", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("and when a successful POAP result is returned", () => {
    beforeEach(() => {
      (fetchVerifiableCredential as jest.Mock).mockResolvedValue(SUCCESFUL_POAP_RESULT);
    });

    it("the modal displays the verify button", async () => {
      render(
        <UserContext.Provider value={mockUserContext}>
          <PoapCard />
        </UserContext.Provider>
      );

      const initialVerifyButton = screen.queryByTestId("button-verify-poap");

      fireEvent.click(initialVerifyButton!);

      const verifyModal = await screen.findByRole("dialog");
      const verifyModalButton = screen.getByTestId("modal-verify");

      expect(verifyModal).toBeInTheDocument();

      await waitFor(() => {
        expect(verifyModalButton).toBeInTheDocument();
      });
    });

    it("clicking verify adds the stamp", async () => {
      render(
        <UserContext.Provider value={mockUserContext}>
          <PoapCard />
        </UserContext.Provider>
      );

      const initialVerifyButton = screen.queryByTestId("button-verify-poap");

      // Click verify button on POAP card
      fireEvent.click(initialVerifyButton!);

      // Wait to see the verify button on the modal
      await waitFor(() => {
        const verifyModalButton = screen.getByTestId("modal-verify");
        expect(verifyModalButton).toBeInTheDocument();
      });

      const finalVerifyButton = screen.queryByRole("button", {
        name: /Verify/,
      });

      // Click the verify button on modal
      fireEvent.click(finalVerifyButton!);

      await waitFor(() => {
        expect(handleAddStamp).toBeCalled();
      });

      // Wait to see the done toast
      await waitFor(() => {
        const doneToast = screen.getByTestId("toast-done-poap");
        expect(doneToast).toBeInTheDocument();
      });
    });

    it("clicking cancel closes the modal and a stamp should not be added", async () => {
      (fetchVerifiableCredential as jest.Mock).mockResolvedValue(SUCCESFUL_POAP_RESULT);
      render(
        <UserContext.Provider value={mockUserContext}>
          <PoapCard />
        </UserContext.Provider>
      );

      const initialVerifyButton = screen.queryByTestId("button-verify-poap");

      fireEvent.click(initialVerifyButton!);

      // Wait to see the cancel button on the modal
      let modalCancelButton: HTMLElement | null = null;
      await waitFor(() => {
        modalCancelButton = screen.queryByRole("button", {
          name: /Cancel/,
        });
        expect(modalCancelButton).toBeInTheDocument();
      });

      fireEvent.click(modalCancelButton!);

      expect(handleAddStamp).not.toBeCalled();

      await waitForElementToBeRemoved(modalCancelButton);
      expect(modalCancelButton).not.toBeInTheDocument();
    });
  });

  describe("and when a failed POAP result is returned", () => {
    it("modal displays a failed message", async () => {
      (fetchVerifiableCredential as jest.Mock).mockRejectedValue("ERROR");
      render(
        <UserContext.Provider value={mockUserContext}>
          <PoapCard />
        </UserContext.Provider>
      );

      const initialVerifyButton = screen.queryByTestId("button-verify-poap");

      fireEvent.click(initialVerifyButton!);

      const verifyModal = await screen.findByRole("dialog");
      expect(verifyModal).toBeInTheDocument();

      const verifyModalText = screen.getByText(
        "We checked for POAP badges and did not find POAP badge(s) that are 15 or more days old."
      );
      await waitFor(() => {
        expect(verifyModalText).toBeInTheDocument();
      });

      const goToPoap = screen.getByText("Go to POAP");
      await waitFor(() => {
        expect(goToPoap).toBeInTheDocument();
      });

      const cancel = screen.getByText("Cancel");
      await waitFor(() => {
        expect(cancel).toBeInTheDocument();
      });
    });
  });
});
