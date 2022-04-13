import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dashboard } from "../views";
import { UserContext, UserContextState } from "../App";
import { mockAddress, mockWallet } from "../test-fixtures/onboardHookValues";

jest.mock("../utils/onboard.ts");

const mockHandleConnection = jest.fn();
const mockCreatePassport = jest.fn();
const mockUserContext: UserContextState = {
  loggedIn: true,
  passport: undefined,
  handleCreatePassport: mockCreatePassport,
  handleConnection: mockHandleConnection,
  address: mockAddress,
  connectedWallets: [mockWallet],
  signer: undefined,
  walletLabel: mockWallet.label,
};

describe("when user has a connected wallet", () => {
  it("should display wallet address", async () => {
    expect.assertions(1);

    render(
      <UserContext.Provider value={mockUserContext}>
        <Dashboard />
      </UserContext.Provider>
    );

    const expectedAddress = await screen.findByText(/0xmyAddress/);
    expect(expectedAddress).toBeInTheDocument();
  });

  it("should have a disconnect button", async () => {
    expect.assertions(2);

    render(
      <UserContext.Provider value={mockUserContext}>
        <Dashboard />
      </UserContext.Provider>
    );

    const disconnectWalletButton = screen.getByRole("button", {
      name: /Disconnect/,
    });

    expect(disconnectWalletButton).toBeInTheDocument();

    userEvent.click(disconnectWalletButton);

    await waitFor(() => {
      expect(mockHandleConnection).toBeCalledTimes(1);
    });
  });
});

describe("when user has no passport", () => {
  const mockUserContextWithNoPassport: UserContextState = {
    ...mockUserContext,
    passport: undefined,
  };

  it("should have a Create Passport button", () => {
    render(
      <UserContext.Provider value={mockUserContextWithNoPassport}>
        <Dashboard />
      </UserContext.Provider>
    );

    const createPassportButton = screen.getByRole("button", {
      name: /Create Passport/,
    });

    expect(createPassportButton).toBeInTheDocument();
  });

  it("when Create passport button is clicked, create passport handler should be called", async () => {
    render(
      <UserContext.Provider value={mockUserContextWithNoPassport}>
        <Dashboard />
      </UserContext.Provider>
    );

    const createPassportButton = screen.getByRole("button", {
      name: /Create Passport/,
    });

    userEvent.click(createPassportButton);

    await waitFor(() => {
      expect(mockCreatePassport).toBeCalledTimes(1);
    });
  });
});

describe("when the user has a passport", () => {
  const mockUserContextWithPassport = {
    ...mockUserContext,
    passport: {
      issuanceDate: new Date("2022-01-15"),
      expiryDate: new Date("2022-01-16"),
      stamps: [],
    },
  };

  it("hides the Create Passport button when a passport already exists", () => {
    render(
      <UserContext.Provider value={mockUserContextWithPassport}>
        <Dashboard />
      </UserContext.Provider>
    );

    const createPassportButton = screen.queryByRole("button", {
      name: /Create Passport/,
    });

    expect(createPassportButton).not.toBeInTheDocument();
  });

  it("shows phrase Stamps will be here", () => {
    render(
      <UserContext.Provider value={mockUserContextWithPassport}>
        <Dashboard />
      </UserContext.Provider>
    );

    const phraseOnPage = screen.getByText(/Stamps will be here/);

    expect(phraseOnPage).toBeInTheDocument();
  });

  it("shows passport issuanceDate and expiryDate will be here", () => {
    render(
      <UserContext.Provider value={mockUserContextWithPassport}>
        <Dashboard />
      </UserContext.Provider>
    );

    const issuanceDateOnPage = screen.getByText(/2022-01-15/);
    const expiryDateOnPage = screen.getByText(/2022-01-16/);

    expect(issuanceDateOnPage).toBeInTheDocument();
    expect(expiryDateOnPage).toBeInTheDocument();
  });
});
