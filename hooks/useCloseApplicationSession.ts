import { CloseAppSessionRequest, createCloseAppSessionMessage, MessageSigner } from '@erc7824/nitrolite';
import { useCallback } from 'react';
import { Address, Hex } from 'viem';

export const useCloseApplicationSession = () => {
    const closeApplicationSession = useCallback(
        async (
            signer: MessageSigner,
            appId: Hex,
            participantA: Address,
            participantB: Address,
            amount: string,
            payerIndex: 0 | 1
        ) => {
            try {
                if (!appId) {
                    throw new Error('Application ID is required to close the session.');
                }

                // Create allocations with asset type
                const allocations = [
                    {
                        participant: participantA,
                        asset: 'usdc',
                        amount: payerIndex === 0 ? amount : '0',
                    },
                    {
                        participant: participantB,
                        asset: 'usdc',
                        amount: payerIndex === 1 ? amount : '0',
                    },
                ];

                // Create the close request
                const closeRequest: CloseAppSessionRequest = {
                    app_session_id: appId,
                    allocations: allocations,
                };

                // Create the signed message
                const signedMessage = await createCloseAppSessionMessage(signer, [closeRequest]);

                return signedMessage
            } catch (error) {
                console.error('Error closing application session:', error);
                throw new Error('Failed to close application session');
            }
        },
        []
    );

    return { closeApplicationSession };
};
