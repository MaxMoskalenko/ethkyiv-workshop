import {
    generateRequestId,
    getCurrentTimestamp,
    MessageSigner,
    NitroliteRPC,
    RPCMethod,
} from '@erc7824/nitrolite';
import { useCallback } from 'react';
import { Address, Hex } from 'viem';
import { useSessionKey } from './useSessionKey';

export const useCreateApplicationSession = (ws: WebSocket | null, signer: MessageSigner) => {
    const { signer: counterpartySigner } = useSessionKey(process.env.NEXT_PUBLIC_CP_SESSION_KEY_PRIVATE_KEY as Hex);

    const createApplicationSession = useCallback(
        async (myAccount: Address) => {
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                throw new Error('WebSocket is not connected');
            }

            const counterpartyAccount = process.env.NEXT_PUBLIC_CP_SESSION_KEY_PUBLIC_KEY as Address;
            const defaultAmount = '0.001'; // Amount to allocate for the session

            try {
                // Define the application parameters
                const appDefinition = {
                    protocol: 'nitroliterpc',
                    participants: [myAccount, counterpartyAccount],
                    weights: [100, 0], // Weight distribution for consensus
                    quorum: 100, // Required consensus percentage
                    challenge: 0, // Challenge period
                    nonce: Date.now(), // Unique identifier
                };

                // Define allocations with asset type instead of token address
                const allocations = [
                    {
                        participant: myAccount,
                        asset: 'usdc',
                        amount: defaultAmount,
                    },
                    {
                        participant: counterpartyAccount,
                        asset: 'usdc',
                        amount: defaultAmount,
                    },
                ];

                const params = [
                    {
                        definition: appDefinition,
                        allocations: allocations,
                    },
                ];

                // Create a signed message using the createAppSessionMessage helper
                // NOTE: in this specific case, this method is not used directly,
                // because we need to extract the signature from the counterparty's signer

                // const signedMessage = await createAppSessionMessage(signer, params);

                // !!! WORKAROUND !!!
                // The counterparty needs to sign the same message, so we create it again using the counterparty's signer
                // And extract the signature to send to the ClearNode
                const requestId = generateRequestId();
                const timestamp = getCurrentTimestamp();

                const request = NitroliteRPC.createRequest(requestId, RPCMethod.CreateAppSession, params, timestamp);
                const signedRequest = await NitroliteRPC.signRequestMessage(request, signer);
                
                const counterpartyRequest = NitroliteRPC.createRequest(requestId, RPCMethod.CreateAppSession, params, timestamp);
                const counterpartySignedRequest = await NitroliteRPC.signRequestMessage(counterpartyRequest, counterpartySigner);

                if (!signedRequest?.sig?.[0] || !counterpartySignedRequest?.sig?.[0]) {
                    throw new Error('Failed to sign the application session request');
                }

                signedRequest.sig = [signedRequest.sig[0], counterpartySignedRequest.sig[0]];

                const signedMessage = JSON.stringify(signedRequest);

                // Send the signed message to the ClearNode
                ws.send(signedMessage);
            } catch (error) {
                console.error('Error creating application session:', error);
                throw new Error('Failed to create application session');
            }
        },
        [counterpartySigner, signer, ws]
    );

    return { createApplicationSession };
};
