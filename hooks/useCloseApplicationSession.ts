import { CloseAppSessionRequest, createCloseAppSessionMessage, MessageSigner } from '@erc7824/nitrolite';
import { useCallback } from 'react';
import { Address, Hex } from 'viem';

export const useCloseApplicationSession = (ws: WebSocket | null, signer: MessageSigner) => {
    const closeApplicationSession = useCallback(
        async (myAccount: Address, receiverIndex: 0 | 1) => {
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                throw new Error('WebSocket is not connected');
            }

            const counterpartyAccount = process.env.NEXT_PUBLIC_CP_SESSION_KEY_PUBLIC_KEY as Address;
            const defaultAmount = '0.002'; // Amount to allocate for the session

            try {
                const appId = window.localStorage.getItem('app_session_id');

                if (!appId) {
                    throw new Error('Application ID is required to close the session.');
                }

                // Create allocations with asset type
                const allocations = [
                    {
                        participant: myAccount,
                        asset: 'usdc',
                        amount: receiverIndex === 0 ? defaultAmount : '0',
                    },
                    {
                        participant: counterpartyAccount,
                        asset: 'usdc',
                        amount: receiverIndex === 1 ? defaultAmount : '0',
                    },
                ];

                // Create the close request
                const closeRequest: CloseAppSessionRequest = {
                    app_session_id: appId as Hex,
                    allocations: allocations,
                };

                // Create the signed message
                const signedMessage = await createCloseAppSessionMessage(signer, [closeRequest]);

                ws.send(signedMessage);
            } catch (error) {
                console.error('Error closing application session:', error);
                throw new Error('Failed to close application session');
            }
        },
        [signer, ws]
    );

    return { closeApplicationSession };
};
