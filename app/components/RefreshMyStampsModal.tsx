import { Modal, ModalContent, ModalOverlay } from "@chakra-ui/react";

import { Step } from "../components/Progress";
import RefreshStampsProgressSteps from "./RefreshStampsProgressSteps";
import { PossibleEVMProvider } from "../signer/utils";
import { RefreshMyStampsModalContent } from "./RefreshMyStampsModalContent";

export type RefreshMyStampsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  steps: Step[];
  fetchedPossibleEVMStamps: PossibleEVMProvider[] | undefined;
  resetStampsAndProgressState: () => void;
};

export const RefreshMyStampsModal = ({
  isOpen,
  onClose,
  steps,
  fetchedPossibleEVMStamps,
  resetStampsAndProgressState,
}: RefreshMyStampsModalProps) => {
  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        closeOnOverlayClick={true}
        scrollBehavior="outside"
        datatest-id="refresh-my-stamps-modal"
      >
        <ModalOverlay bg="blackAlpha.900" />
        <ModalContent
          rounded="none"
          padding={5}
          w="410px"
          minH="550px"
          maxH="auto"
          backgroundColor="black"
          borderWidth="1px"
          borderColor="var(--color-accent-2)"
        >
          {fetchedPossibleEVMStamps ? (
            <>
              <RefreshMyStampsModalContent
                onClose={onClose}
                fetchedPossibleEVMStamps={fetchedPossibleEVMStamps}
                resetStampsAndProgressState={resetStampsAndProgressState}
              />
            </>
          ) : (
            <>
              <div className="text-3xl text-white">Searching for Stamps</div>
              <div className="mt-2 text-white">Give us a moment while we check your account for existing Stamps.</div>
              <RefreshStampsProgressSteps steps={steps} />
              <div className="text-center text-white">Please do not close the window.</div>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};
