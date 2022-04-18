import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Home } from "../../src/views";
import { UserContext, UserContextState } from "../../src/App";
import { STAMP_PROVIDERS } from "../../src/config/providers";

jest.mock("../../src/utils/onboard.ts");

const mockHandleConnection = jest.fn();
const mockCreatePassport = jest.fn();
const mockHasStamp = jest.fn();
const getStampIndex = jest.fn();
const handleSaveStamp = jest.fn();
const handleAddStamp = jest.fn();
const mockUserContext: UserContextState = {
  loggedIn: false,
  passport: undefined,
  allProvidersState: {
    Google: {
      providerSpec: STAMP_PROVIDERS.Google,
      stamp: undefined,
    },
    Simple: {
      providerSpec: STAMP_PROVIDERS.Simple,
      stamp: undefined,
    },
  },
  hasStamp: mockHasStamp,
  getStampIndex: getStampIndex,
  handleSaveStamp: handleSaveStamp,
  handleAddStamp: handleAddStamp,
  handleCreatePassport: mockCreatePassport,
  handleConnection: mockHandleConnection,
  address: undefined,
  connectedWallets: [],
  signer: undefined,
  walletLabel: undefined,
};

test("renders connect wallet button", () => {
  expect.assertions(1);
  render(
    <UserContext.Provider value={mockUserContext}>
      <Home />
    </UserContext.Provider>
  );
  const connectWalletButton = screen.getByRole("button", {
    name: "Get Started",
  });
  expect(connectWalletButton).toBeInTheDocument();
});

test("clicking connect wallet button calls handleConnection", async () => {
  expect.assertions(1);

  render(
    <UserContext.Provider value={mockUserContext}>
      <Home />
    </UserContext.Provider>
  );
  const connectWalletButton = screen.getByRole("button", {
    name: "Get Started",
  });

  userEvent.click(connectWalletButton);

  await waitFor(() => {
    expect(mockHandleConnection).toBeCalledTimes(1);
  });
});
